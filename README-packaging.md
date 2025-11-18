Mobet POS - Packaging Guide (Electron + PHP + SQLite)
===============================================

This document explains how to build a Windows desktop application (.exe) from this repo using Electron.

High-level packaging overview
1. Build the frontend (Vite) into `dist/`.
2. Provide a portable PHP runtime (Windows) so the packaged app can spawn the PHP built-in server.
3. Run `electron-builder` from the `electron/` folder to produce an NSIS installer.

Quick start (dev)

1. Build frontend:
   - From project root: `npm ci && npm run build`

2. Start electron in dev (uses `PHP_CLI_PATH` env var or looks for `electron/php/php.exe`, or falls back to `php` on PATH):
   - `cd electron && npm ci && npm start`

Packaging (create installer)

1. Prepare frontend build (see above).
2. Prepare portable PHP runtime for Windows:
   - Download a Thread Safe PHP zip for Windows from https://windows.php.net/download/.
   - Extract and copy the PHP folder into `electron/php/` so `electron/php/php.exe` exists.
   - Ensure `php.ini` enables the `sqlite3` extension (or include `ext\sqlite3.dll` and correct `extension_dir`).
   - Alternatively you can set the environment variable `PHP_CLI_PATH` during packaging to point to the php executable.
3. From `electron/` run: `npm run package` (this calls `electron-builder`).

Notes and important details
- The Electron main process spawns a local PHP built-in server which serves the project root (so `api/`, `index.html`, and other files are available inside the app).
- The packager configuration copies the project root into the app resources; the packaged app will look for `resources/php/php.exe` or `electron/php/php.exe` depending on how you include php before packaging.
- On first run the PHP backend will create a local SQLite DB at `database/app.db` if missing. You may want to relocate the DB to a writable folder (e.g. `%APPDATA%\Mobet POS KENYA\app.db`) for multi-user Windows installs; I can add an automatic migration helper for that if desired.
- The produced NSIS installer requests admin privileges by default (`requestedExecutionLevel: admin`) and creates Desktop/Start Menu shortcuts. You can adjust `electron/package.json` build settings to change this behavior.

Packaging checklist (Windows VM)

- [ ] Prepare Windows build machine with Node 18+ and Git.
- [ ] Clone repo and run `npm ci` in repo root, then `cd electron && npm ci`.
- [ ] Build frontend: `npm run build`.
- [ ] Place portable PHP into `electron/php/` (php.exe present).
- [ ] From `electron/` run: `npm run package`.
- [ ] Copy produced installer `.exe` to a clean Windows VM and run.
- [ ] Verify: App installs, starts, shows login page, creates writable DB (or DB is migrated to appropriate user folder).

Debugging & logs
- The PHP built-in server logs to `php-server.log` in the server root inside the packaged resources; open this file if the app fails to start the server.
- Electron logs can be seen when running `npm start` inside `electron/` during development.

NSIS / installer notes
- The included NSIS settings request admin to install per-machine. If you prefer per-user installs, change `requestedExecutionLevel` to `user` and set `nsis.perMachine` to false in `electron/package.json`.

If you want, I can add a small helper script to:
- Validate a portable PHP layout and create the `electron/php/` folder for you.
- Update `launch-php.js` to prefer a user-data DB path and migrate the existing DB on first run.

Next steps I can do for you now:
- Add a small `electron/helpers/prepare-php` script (batch + PowerShell) to show where to place `php.exe` (I will add this now if you want).
- Update `launch-php.js` to use `PHP_CLI_PATH` and `php` fallback (already updated).
- Add a DB migration helper to move DB to `%APPDATA%` on first run (I can implement this next).

Tell me which of the next steps you'd like me to implement.

**Testing & QA Checklist (Windows installer)**

- Pre-requisites: a clean Windows VM (Windows 10/11), Node 18+, Git, and optionally NSIS installed for local packaging tests.
- Recommended test accounts and keys: a Daraja sandbox consumer key/secret (set as env vars during tests) and optional ngrok token for STK callback tests.

Functional smoke tests (first-run):
- [ ] Install the produced `.exe` as administrator on the test VM.
- [ ] Launch the installed app — app should open and display the login page within 10–20s.
- [ ] Verify `%APPDATA%\\Mobet POS KENYA\\app.db` exists and is writable for the current user.
- [ ] Create a test sale with cash: verify receipt prints (or triggers print preview) and transaction appears in `Transactions` view.
- [ ] Create a test M-Pesa cashier-record sale: open the M-Pesa modal, confirm amount, ensure a returned `transaction_id` appears in the UI and the receipt uses that id.

Daraja / STK tests (optional, sandbox):
- [ ] Start ngrok to expose callback endpoint: `ngrok http 8000` and set `MPESA_CALLBACK_URL` to the ngrok URL + `/api/mpesa_callback.php` in your environment or in electron's env before launch.
- [ ] Initiate an STK push from the POS (enter a phone number) and confirm the STK flow completes in sandbox.
- [ ] Verify the callback is received either via WebSocket notify server (dev) or the backend `api/mpesa_callback.php` logs.

Offline & migration tests:
- [ ] With no network, run the app and create sales; verify local SQLite `app.db` writes transactions and receipts still work.
- [ ] Install a new version of the app over existing install; verify existing data in `%APPDATA%\\Mobet POS KENYA\\app.db` is preserved and accessible.
- [ ] Corrupt the DB file (rename/move) and start app to verify it recreates schema or shows a clear error and recovers when a backup is present.

Installer & uninstaller tests:
- [ ] Run installer as standard user and as admin; confirm UAC prompt appears when packaging requests admin.
- [ ] Confirm Desktop and Start Menu shortcuts are created.
- [ ] Run uninstaller and confirm main program files are removed but optionally leave `%APPDATA%\\Mobet POS KENYA` if you choose to preserve user data.

Logs & diagnostics
- [ ] Check `php-server.log` (in packaged resources or server root) when server fails to start.
- [ ] Add a diagnostics view (optional) to report `MOBET_DATA_DIR`, SQLite version, and current DB path for easier debugging.

CI: Sample GitHub Actions workflow (Windows) to build the installer

Save this as `.github/workflows/build-windows.yml` in your repo. It demonstrates an automated Windows packaging flow that downloads a portable PHP zip from windows.php.net, extracts it into `electron/php/`, builds the frontend, and runs `electron-builder`.

```yaml
name: Build Windows Installer

on:
   workflow_dispatch:
   push:
      branches: [ main ]

jobs:
   build-windows:
      runs-on: windows-latest
      steps:
         - name: Checkout
            uses: actions/checkout@v4

         - name: Setup Node.js
            uses: actions/setup-node@v4
            with:
               node-version: '18'

         - name: Install dependencies (root)
            run: npm ci

         - name: Build frontend
            run: npm run build

         - name: Create electron/php and download portable PHP
            run: |
               mkdir electron\php || echo exists
               powershell -Command "(New-Object System.Net.WebClient).DownloadFile('https://windows.php.net/downloads/releases/archives/php-8.2.12-Win32-vs16-x64.zip','php.zip')"
               powershell -Command "Expand-Archive php.zip -DestinationPath electron\php -Force"
               del php.zip

         - name: Install electron deps and package
            working-directory: electron
            run: |
               npm ci
               npm run build:frontend
               npm run package

         - name: Upload installer artifact
            uses: actions/upload-artifact@v4
            with:
               name: mobet-pos-windows-installer
               path: electron\dist\**\*.exe
```

Notes about CI:
- The sample workflow downloads a PHP zip from windows.php.net — ensure the URL targets a compatible PHP version and thread-safe build for your app. You may prefer to store a vetted PHP zip as a release artifact in a private storage and reference that instead.
- For reproducible builds, pin `electron` and `electron-builder` versions in `electron/package.json`.
- If your build requires secrets (e.g., Daraja credentials, ngrok token), set them in GitHub Actions secrets and reference them as env vars in the packaging steps.

If you want, I will add this workflow file to the repo and a small `diagnostics` endpoint to the PHP backend that returns current `MOBET_DATA_DIR`, DB path, and PHP version for runtime verification.

---

End of packaging guide.
