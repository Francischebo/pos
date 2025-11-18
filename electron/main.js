const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const net = require('net');
const phpLauncher = require('./helpers/launch-php');

const SERVER_PORT = 8123;
const SERVER_HOST = '127.0.0.1';
let mainWindow;
let phpProcessHandle;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    const url = `http://${SERVER_HOST}:${SERVER_PORT}/index.html`;
    mainWindow.loadURL(url).catch(err => {
        console.error('Failed to load URL', err);
    });

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Prevent devtools in production
    mainWindow.webContents.on('devtools-opened', () => {
        mainWindow.webContents.closeDevTools();
    });
}

function waitForServerAndCreateWindow(maxRetries = 60, interval = 200) {
    let attempts = 0;
    const tryConnect = () => {
        const socket = new net.Socket();
        socket.setTimeout(1000);
        socket.on('error', () => {
            socket.destroy();
            attempts++;
            if (attempts >= maxRetries) {
                dialog.showErrorBox('Startup Error', 'Could not start local server. Check logs.');
                app.quit();
                return;
            }
            setTimeout(tryConnect, interval);
        });
        socket.on('timeout', () => {
            socket.destroy();
            attempts++;
            setTimeout(tryConnect, interval);
        });
        socket.connect(SERVER_PORT, SERVER_HOST, () => {
            socket.destroy();
            createWindow();
        });
    };
    tryConnect();
}

app.whenReady().then(async() => {
    // Start PHP backend. Try bundled php first, else fall back to repo path for dev.
    try {
        const phpPathCandidates = [];
        // packaged electron: resourcesPath/php/php.exe
        if (process.resourcesPath) phpPathCandidates.push(path.join(process.resourcesPath, 'php', 'php.exe'));
        // repo dev path
        phpPathCandidates.push(path.join(__dirname, '..', 'backend', 'php', 'php.exe'));
        phpPathCandidates.push(path.join(__dirname, '..', '..', 'backend', 'php', 'php.exe'));

        let phpPath = null;
        for (const p of phpPathCandidates) {
            try {
                const fs = require('fs');
                if (fs.existsSync(p)) { phpPath = p; break; }
            } catch (e) {}
        }

        if (!phpPath) {
            dialog.showErrorBox('Missing PHP', 'PHP runtime not found. Please ensure php.exe exists in backend/php or packaged resources.');
            app.quit();
            return;
        }

        // Provide an OS-writable app data folder to the backend via env var so sqlite_helper.php
        // uses the correct writable DB location inside the packaged app.
        try {
            const appDataPath = app.getPath('appData');
            const mobetDataDir = path.join(appDataPath, 'Mobet POS KENYA');
            if (!fs.existsSync(mobetDataDir)) fs.mkdirSync(mobetDataDir, { recursive: true });
            process.env.MOBET_DATA_DIR = mobetDataDir;
        } catch (e) {
            // ignore - fallback still works
            console.warn('Could not set MOBET_DATA_DIR:', e);
        }

        // Use project root as server root so the built-in PHP server serves existing `api/`, `index.html`, etc.
        // When packaging you can place a portable PHP under resources/php and it will be used.
        const serverRootCandidate = path.join(__dirname, '..');
        phpProcessHandle = phpLauncher.start({
            phpPath,
            serverRoot: serverRootCandidate,
            port: SERVER_PORT,
            host: SERVER_HOST,
            resourcesPath: process.resourcesPath // so launch-php.js can look for bundled php
        });
    } catch (err) {
        dialog.showErrorBox('Server Error', 'Failed to launch PHP: ' + String(err));
        app.quit();
        return;
    }

    waitForServerAndCreateWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        if (phpProcessHandle && phpProcessHandle.kill) {
            try { phpProcessHandle.kill(); } catch (e) {}
        }
        app.quit();
    }
});

app.on('before-quit', () => {
    if (phpProcessHandle && phpProcessHandle.kill) {
        try { phpProcessHandle.kill(); } catch (e) {}
    }
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught exception in main:', err);
});