const fs = require('fs');
const xlsx = require('xlsx');
const cron = require('node-cron');
const fetch = require('node-fetch');

// Funkce pro získání seznamu uživatelů a jejich kreditů
async function fetchUserCredits() {
    const response = await fetch('http://localhost:3001/users');
    const users = await response.json();
    return users.map(user => ({
        Jméno: user.name,
        Kredit: user.credit
    }));
}

// Funkce pro přidání nového listu s denními pohyby
async function logDailyTransactions() {
    const users = await fetchUserCredits();
    const date = new Date().toISOString().split('T')[0];
    const sheetName = `Denní pohyby ${date}`;
    
    // Načtení existujícího souboru nebo vytvoření nového
    let workbook;
    if (fs.existsSync('transaction.xls')) {
        workbook = xlsx.readFile('transaction.xls');
    } else {
        workbook = xlsx.utils.book_new();
    }

    // Vytvoření nového listu s denními pohyby
    const worksheet = xlsx.utils.json_to_sheet(users);
    xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Uložení souboru
    xlsx.writeFile(workbook, 'transaction.xls');
    console.log(`Denní pohyby byly zaznamenány do listu '${sheetName}'`);
}

// Cron úloha spouštěná každý den v 17:00
cron.schedule('0 17 * * *', () => {
    logDailyTransactions().catch(console.error);
});

console.log('Skript pro zaznamenávání denních pohybů byl spuštěn.');