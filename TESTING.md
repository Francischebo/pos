Testing the M-Pesa flow and offline sync
=======================================

This document explains how to test the local M-Pesa STK flow, simulate callbacks, and run the sync script to push offline data to Supabase.

1) Start the PHP server (quick dev server)

PowerShell (from project root):
```powershell
php -S 0.0.0.0:8000
```

If you use XAMPP/Apache, ensure the project is accessible (e.g. `http://localhost/Lorrain-Traders-main`). Adjust URLs below accordingly.

2) (Optional) Expose local server to the internet via ngrok (required for real Daraja sandbox callbacks):

PowerShell:
```powershell
ngrok http 8000
# Note the HTTPS forwarding url (e.g. https://abcd1234.ngrok.io)
```

Set `MPESA_CALLBACK_URL` to `https://<ngrok-host>/callback.php` or update the `payment_process.php` environment variable accordingly when initiating STK push.

3) Simulate a Daraja callback locally

From the project root run (PowerShell):
```powershell
.\scripts\post_callback.ps1 -Url 'http://localhost:8000/callback.php' -File '.\sample_callback.json'
```

This will POST the `sample_callback.json` payload to the local `callback.php` endpoint and print the response.

4) Inspect logs and local DB

- `app.log` in project root contains `app_log()` entries.
- `offline.db` SQLite file (created in project root) contains tables `payments`, `callbacks`, `products`, `users`, `customers`, `suppliers`, `transactions`, and `audits`.

To inspect offline.db quickly (if you have sqlite3 installed):
```powershell
sqlite3 offline.db "SELECT * FROM payments;"
```

5) Run sync to push pending local data to Supabase

Set env vars or pass them to the helper script. Example (PowerShell):
```powershell
# Option A: set env in session then run
$env:SUPABASE_URL = 'https://your-project.supabase.co'
$env:SUPABASE_SERVICE_ROLE_KEY = 'your-service-role-key'
.\scripts\run_sync.ps1

# Option B: pass inline
.\scripts\run_sync.ps1 -SupabaseUrl 'https://your-project.supabase.co' -ServiceRoleKey 'your-service-role-key'
```

`sync.php` will attempt to upsert the following Supabase tables via REST: `payments`, `callbacks`, `products`, `users`, `customers`, `suppliers`, `transactions`. Ensure your Supabase table schemas match or adjust `sync.php` mappings accordingly.

6) Re-run tests

After a successful sync, records created locally will be marked as `synced` in `offline.db` and visible in Supabase.

Notes & troubleshooting
- If POST to `callback.php` returns errors, check `app.log` and `error.log` in the project root.
- For Daraja sandbox live STK push tests, you must provide a public `CallBackURL` (ngrok or deployed backend). The `payment_process.php` will use `MPESA_CALLBACK_URL` environment variable when present.
