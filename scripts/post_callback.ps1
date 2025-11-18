param(
    [string]$Url = 'http://localhost:8000/callback.php',
    [string]$File = '..\sample_callback.json'
)

if (!(Test-Path $File)) {
    Write-Error "Sample callback file not found: $File"
    exit 1
}

$json = Get-Content $File -Raw

Write-Host "Posting sample callback to $Url"

try {
    $resp = Invoke-RestMethod -Uri $Url -Method Post -Body $json -ContentType 'application/json'
    Write-Host "Response:`n" ($resp | ConvertTo-Json -Depth 5)
}
catch {
    Write-Error "Request failed: $_"
}
