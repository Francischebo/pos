!include "MUI2.nsh"
Name "Mobet POS KENYA"
OutFile "Mobet_POS_KENYA_Installer.exe"
InstallDir "$PROGRAMFILES\Mobet POS KENYA"
RequestExecutionLevel admin

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "license.txt"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

Section "Install"
  SetOutPath "$INSTDIR"
  ; Copy packaged files into the install directory
  File /r "dist\**\*"

  ; Create shortcuts
  CreateShortCut "$DESKTOP\Mobet POS KENYA.lnk" "$INSTDIR\Mobet POS KENYA.exe"
  CreateDirectory "$SMPROGRAMS\Mobet POS KENYA"
  CreateShortCut "$SMPROGRAMS\Mobet POS KENYA\Mobet POS KENYA.lnk" "$INSTDIR\Mobet POS KENYA.exe"

  ; Ensure a machine-writable data folder exists for shared data (ProgramData)
  CreateDirectory "$PROGRAMDATA\Mobet POS KENYA"

  ; Ensure a per-user AppData folder exists for the installing user (will be used at runtime if present)
  CreateDirectory "$APPDATA\Mobet POS KENYA"

  ; Write the install location to the registry for later use by uninstaller or updates
  WriteRegStr HKLM "Software\Mobet POS KENYA" "InstallDir" "$INSTDIR"

SectionEnd

Section "PostInstall"
  ; Inform the user where data will be stored and where to place portable PHP before packaging
  DetailPrint "Installation complete."
  DetailPrint "Application installed to: $INSTDIR"
  DetailPrint "Per-user data folder (current user): $APPDATA\\Mobet POS KENYA"
  DetailPrint "Machine data folder: $PROGRAMDATA\\Mobet POS KENYA"
  DetailPrint "If you packaged a portable PHP runtime include it under the app resources (resources/php/) or set the PHP_CLI_PATH environment variable."
SectionEnd
