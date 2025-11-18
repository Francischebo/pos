@echo off
REM Prepare portable PHP for packaging: place the extracted PHP folder here.
REM Expected layout: electron/php/php.exe and php.ini alongside ext/ folders.

echo Copy your portable PHP distribution into the "electron\php\" folder.
echo Example steps:
echo 1. Download a Windows Thread Safe PHP zip from windows.php.net or your preferred provider.
echo 2. Extract the archive and copy the contents into "electron\\php\\".
echo 3. Ensure "php.exe" and "ext\sqlite3.dll" (or sqlite3 extension) exist.
echo After copying, run: cd electron && npm run package
pause
