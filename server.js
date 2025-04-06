const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const usersFilePath = path.join(__dirname, 'users.json');
const transactionsFilePath = path.join(__dirname, 'transactions.xlsx');

// Funkce pro načítání uživatelů ze souboru
function loadUsers() {
    try {
        const data = fs.readFileSync(usersFilePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading users file:', err);
        return [];
    }
}

// Funkce pro ukládání uživatelů do souboru
function saveUsers(users) {
    try {
        fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
    } catch (err) {
        console.error('Error writing users file:', err);
    }
}

// Funkce pro nastavení šířky sloupců
function setColumnWidths(worksheet, data) {
    const columnWidths = data[0].map((_, colIndex) => ({
        wch: Math.max(
            ...data.map(row => (row[colIndex] ? row[colIndex].toString().length : 0))
        )
    }));
    worksheet['!cols'] = columnWidths;
}

// Funkce pro ukládání transakcí do Excel souboru
function saveTransaction(rfid, action, credit = 0, debit = 0) {
    const users = loadUsers();
    const user = users.find(user => user.rfid === rfid);
    if (user) {
        const date = new Date();
        const dateString = `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`; // Datum ve formátu DD-MM-YYYY
        const timeString = date.toTimeString().split(' ')[0]; // Čas ve formátu HH:MM:SS
        const transaction = [dateString, timeString, user.name, rfid, action, credit ? credit + ' Kč' : '', debit ? debit + ' Kč' : ''];

        // Načtení nebo vytvoření Excel souboru
        let workbook;
        if (fs.existsSync(transactionsFilePath)) {
            workbook = xlsx.readFile(transactionsFilePath);
        } else {
            workbook = xlsx.utils.book_new();
        }

        // Načtení nebo vytvoření listu pro uživatele
        let worksheet;
        if (workbook.SheetNames.includes(user.name)) {
            worksheet = workbook.Sheets[user.name];
        } else {
            worksheet = xlsx.utils.aoa_to_sheet([['Datum', 'Čas', 'Jméno', 'RFID', 'Akce', 'Dobito', 'Odečteno']]);
            xlsx.utils.book_append_sheet(workbook, worksheet, user.name);
        }

        // Přidání transakce do listu
        const worksheetData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
        worksheetData.push(transaction);
        const newWorksheet = xlsx.utils.aoa_to_sheet(worksheetData);
        setColumnWidths(newWorksheet, worksheetData);

        // Aktualizace listu v workbooku
        workbook.Sheets[user.name] = newWorksheet;
        xlsx.writeFile(workbook, transactionsFilePath);
    }
}

app.get('/users', (req, res) => {
    const users = loadUsers();
    res.json(users);
});

app.post('/users', (req, res) => {
    const { name, rfid, credit } = req.body;
    if (!name || !rfid || credit === undefined) {
        return res.status(400).json({ error: 'Invalid user data' });
    }

    const users = loadUsers();
    const userExists = users.some(user => user.rfid === rfid);
    if (userExists) {
        return res.status(409).json({ error: 'User with this RFID already exists' });
    }

    const newUser = { name, rfid, credit };
    users.push(newUser);
    saveUsers(users);
    res.status(201).json(newUser);
});

app.post('/users/:rfid/credit', (req, res) => {
    const { rfid } = req.params;
    const { amount } = req.body;
    const users = loadUsers();
    const user = users.find(user => user.rfid === rfid);

    if (user) {
        user.credit += amount;
        saveUsers(users);
        saveTransaction(rfid, 'Dobití kreditu', amount, 0);
        res.json({ newCredit: user.credit });
    } else {
        res.status(404).json({ error: 'User not found!' });
    }
});

app.post('/coffee', (req, res) => {
    const { rfid } = req.body;
    const users = loadUsers();
    const user = users.find(user => user.rfid === rfid);

    if (user) {
        user.credit -= 5;
        saveUsers(users);
        saveTransaction(rfid, 'Odběr kávy', 0, -5);
        res.json({ transactionId: new Date().getTime(), newCredit: user.credit });
    } else {
        res.status(404).json({ error: 'User not found!' });
    }
});

app.delete('/users/:rfid', (req, res) => {
    const { rfid } = req.params;
    let users = loadUsers();
    const userIndex = users.findIndex(user => user.rfid === rfid);

    if (userIndex !== -1) {
        users.splice(userIndex, 1);
        saveUsers(users);
        res.json({ message: 'User deleted successfully!' });
    } else {
        res.status(404).json({ error: 'User not found!' });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});