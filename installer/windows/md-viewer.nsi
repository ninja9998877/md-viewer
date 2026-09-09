; ==============================================
; 墨页 Moye - Windows NSIS Installer
; 包含 .md / .markdown 文件关联注册
; ==============================================

!include "MUI2.nsh"
!include "FileAssociation.nsh"

Name "墨页"
OutFile "Moye-Setup.exe"
InstallDir "$PROGRAMFILES\Moye"
RequestExecutionLevel admin

!define MUI_ABORTWARNING
!define MUI_ICON "..\icons\icon.ico"

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "SimpChinese"

Section "MainSection" SEC01
    SetOutPath "$INSTDIR"
    File "..\target\release\Moye.exe"
    File /r "..\target\release\*.dll"   ; 如果有其他 dll 可以放这里

    ; 创建快捷方式
    CreateDirectory "$SMPROGRAMS\墨页"
    CreateShortCut "$SMPROGRAMS\墨页\墨页.lnk" "$INSTDIR\Moye.exe"
    CreateShortCut "$DESKTOP\墨页.lnk" "$INSTDIR\Moye.exe"

    ; ==================== 文件关联注册 ====================
    ${RegisterExtension} "$INSTDIR\Moye.exe" ".md" "Markdown Document"
    ${RegisterExtension} "$INSTDIR\Moye.exe" ".markdown" "Markdown Document"

    ; 写入注册表信息（用于右键菜单和默认程序）
    WriteRegStr HKCR "Applications\Moye.exe\shell\open\command" "" '"$INSTDIR\Moye.exe" "%1"'
    WriteRegStr HKCR ".md" "" "MarkdownFile"
    WriteRegStr HKCR ".markdown" "" "MarkdownFile"
    WriteRegStr HKCR "MarkdownFile" "" "Markdown Document"
    WriteRegStr HKCR "MarkdownFile\DefaultIcon" "" "$INSTDIR\Moye.exe,0"
    WriteRegStr HKCR "MarkdownFile\shell\open\command" "" '"$INSTDIR\Moye.exe" "%1"'

    ; 刷新图标缓存
    System::Call 'shell32.dll::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'

    WriteUninstaller "$INSTDIR\Uninstall.exe"
SectionEnd

Section "Uninstall"
    Delete "$INSTDIR\Moye.exe"
    Delete "$INSTDIR\Uninstall.exe"

    RMDir "$INSTDIR"

    Delete "$SMPROGRAMS\墨页\墨页.lnk"
    RMDir "$SMPROGRAMS\墨页"
    Delete "$DESKTOP\墨页.lnk"

    ; 注销文件关联
    ${UnRegisterExtension} ".md" "Markdown Document"
    ${UnRegisterExtension} ".markdown" "Markdown Document"

    DeleteRegKey HKCR "MarkdownFile"
    DeleteRegKey HKCR "Applications\Moye.exe"

    System::Call 'shell32.dll::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'
SectionEnd
