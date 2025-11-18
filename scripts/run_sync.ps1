<#
  run_sync.ps1
  Usage:
    # Use environment variables already set in the session
    .\run_sync.ps1

    # Or pass them inline
    .\run_sync.ps1 -SupabaseUrl 'https://xyz.supabase.co' -ServiceRoleKey 'your-service-role-key'
#>

param(
    [string]$SupabaseUrl = $env:SUPABASE_URL,
    [string]$ServiceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY
)

if (-not $SupabaseUrl -or -not $ServiceRoleKey) {
    Write-Host "Supabase URL or service role key not found in env or parameters." -ForegroundColor Yellow
    $SupabaseUrl = Read-Host "Enter SUPABASE_URL (or press Enter to abort)"
    if (-not $SupabaseUrl) { Write-Host "Aborted"; exit 1 }
    $ServiceRoleKey = Read-Host "Enter SUPABASE_SERVICE_ROLE_KEY (will be set for this run)"
    if (-not $ServiceRoleKey) { Write-Host "Aborted"; exit 1 }
}

Write-Host "Running sync.php with SUPABASE_URL=$SupabaseUrl"

# Set env for this process and invoke PHP
$env:SUPABASE_URL = $SupabaseUrl
$env:SUPABASE_SERVICE_ROLE_KEY = $ServiceRoleKey

php sync.php
