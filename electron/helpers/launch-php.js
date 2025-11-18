const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

function findPhpExecutable(options) {
    // Priority: explicit path via options.phpPath > env PHP_CLI_PATH > bundled resources > 'php' on PATH
    const candidates = [];
    if (options && options.phpPath) candidates.push(options.phpPath);
    if (process.env.PHP_CLI_PATH) candidates.push(process.env.PHP_CLI_PATH);
    // packaged resource path: resources/php/php.exe (main process resolves resourcesPath)
    if (options && options.resourcesPath) candidates.push(path.join(options.resourcesPath, 'php', 'php.exe'));

    for (const c of candidates) {
        try {
            if (c && fs.existsSync(c)) return c;
        } catch (e) {}
    }

    // Last resort: try 'php' command from PATH. We don't verify existence here, we'll attempt to spawn it.
    return 'php';
}

function start(options = {}) {
    const serverRoot = options.serverRoot || process.cwd();
    const host = options.host || '127.0.0.1';
    const port = options.port || 8123;

    const phpExe = findPhpExecutable(options);

    const args = ['-S', `${host}:${port}`, '-t', serverRoot];

    const child = spawn(phpExe, args, {
        cwd: serverRoot,
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe']
    });

    const logFile = path.join(serverRoot, 'php-server.log');
    const logStream = fs.createWriteStream(logFile, { flags: 'a' });

    child.stdout.on('data', (data) => {
        try { logStream.write('[STDOUT] ' + data.toString()); } catch (e) {}
    });
    child.stderr.on('data', (data) => {
        try { logStream.write('[STDERR] ' + data.toString()); } catch (e) {}
    });

    child.on('exit', (code, signal) => {
        try { logStream.write(`[php exited] code=${code} signal=${signal}\n`); } catch (e) {}
        try { logStream.end(); } catch (e) {}
    });

    child.on('error', (err) => {
        try { logStream.write(`[php error] ${String(err)}\n`); } catch (e) {}
    });

    return child;
}

module.exports = { start };