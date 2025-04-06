const { exec } = require('child_process');
const express = require('express');
const path = require('path');
const app = express();
const port = 4000; // Port pro server manager

let serverProcess = null;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/start-server', (req, res) => {
    if (serverProcess) {
        return res.status(400).json({ message: 'Server už běží!' });
    }

    // Použijte správnou cestu k cross-env
    const crossEnvPath = path.join(__dirname, 'node_modules', '.bin', 'cross-env.cmd');
    const command = `${crossEnvPath} PORT=3001 node server.js`;

    serverProcess = exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Chyba při spouštění serveru: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`Chyba: ${stderr}`);
            return;
        }
        console.log(`Výstup: ${stdout}`);
    });

    res.json({ message: 'Server byl úspěšně spuštěn!' });
});

app.get('/stop-server', (req, res) => {
    if (!serverProcess) {
        return res.status(400).json({ message: 'Server neběží!' });
    }

    serverProcess.kill('SIGINT');
    serverProcess = null;
    res.json({ message: 'Server byl úspěšně zastaven!' });
});

app.listen(port, () => {
    console.log(`Server manager běží na http://localhost:${port}`);
});