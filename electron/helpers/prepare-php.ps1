Write-Host "Prepare portable PHP for packaging: place the extracted PHP folder here: electron\php\"
Write-Host "Expected layout: electron/php/php.exe and php.ini alongside ext/ folders."
Write-Host "Example steps:`n1. Download a Windows Thread Safe PHP zip from https://windows.php.net/download/`n2. Extract the archive and copy the contents into 'electron\php\'`n3. Ensure 'php.exe' and required extensions (e.g. sqlite3) exist.`n
After copying, run: cd electron; npm run package"