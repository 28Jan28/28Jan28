const { exec, spawn } = require('child_process');
const path = require('path');

// Cesta k Node.js
const nodePath = 'C:\\Program Files\\nodejs\\node.exe';

// Funkce pro spuštění serverů a aplikace
function startServer(script) {
    const server = spawn(nodePath, [script], {
        detached: true,
        stdio: 'ignore'
    });
    server.unref();
    console.log(`Server ${script} spuštěn s PID: ${server.pid}`);
}

function startHttpServer(directory, port) {
    const httpServer = spawn('http-server', [directory, '-p', port], {
        detached: true,
        stdio: 'ignore'
    });
    httpServer.unref();
    console.log(`HTTP server spuštěn na portu ${port} s PID: ${httpServer.pid}`);
}

// Funkce pro kontrolu, zda server běží
function isServerRunning(port, callback) {
    exec(`netstat -an | find "LISTEN" | find ":${port}"`, (err, stdout, stderr) => {
        callback(stdout.includes(`:${port}`));
    });
}

// Monitorování serverů a aplikace
function monitorServers() {
    isServerRunning(3001, (running) => {
        if (!running) {
            console.log('Server na portu 3001 neběží, spouštím server.js');
            startServer('server.js');
        }
    });

    isServerRunning(4000, (running) => {
        if (!running) {
            console.log('Server na portu 4000 neběží, spouštím serverManager.js');
            startServer('serverManager.js');
        }
    });

    isServerRunning(8080, (running) => {
        if (!running) {
            console.log('HTTP server na portu 8080 neběží, spouštím index.html');
            startHttpServer(path.join(__dirname, 'public'), 8080);
        }
    });
}

// Spuštění monitorování každých 10 sekund
setInterval(monitorServers, 10000);