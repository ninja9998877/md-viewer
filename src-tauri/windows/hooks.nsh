!macro NSIS_HOOK_PREINSTALL
  ${If} $AssociateMd == ""
    StrCpy $AssociateMd 1
  ${EndIf}
!macroend

!macro NSIS_HOOK_POSTINSTALL
  WriteRegStr HKCU "Software\Classes\MDViewer.markdown" "" "Markdown Document"
  WriteRegStr HKCU "Software\Classes\MDViewer.markdown\DefaultIcon" "" "$INSTDIR\${MAINBINARYNAME}.exe,0"
  WriteRegStr HKCU "Software\Classes\MDViewer.markdown\shell" "" "open"
  WriteRegStr HKCU "Software\Classes\MDViewer.markdown\shell\open" "" "用墨页打开"
  WriteRegStr HKCU "Software\Classes\MDViewer.markdown\shell\open\command" "" '"$INSTDIR\${MAINBINARYNAME}.exe" "%1"'
  WriteRegStr HKCU "Software\Classes\.md\OpenWithProgids" "MDViewer.markdown" ""
  WriteRegStr HKCU "Software\Classes\.markdown\OpenWithProgids" "MDViewer.markdown" ""

  WriteRegStr SHCTX "Software\Classes\MDViewer.markdown" "" "Markdown Document"
  WriteRegStr SHCTX "Software\Classes\MDViewer.markdown\DefaultIcon" "" "$INSTDIR\${MAINBINARYNAME}.exe,0"
  WriteRegStr SHCTX "Software\Classes\MDViewer.markdown\shell\open\command" "" '"$INSTDIR\${MAINBINARYNAME}.exe" "%1"'
  WriteRegStr SHCTX "Software\Classes\.md\OpenWithProgids" "MDViewer.markdown" ""
  WriteRegStr SHCTX "Software\Classes\.markdown\OpenWithProgids" "MDViewer.markdown" ""
  WriteRegStr SHCTX "Software\Moye\Capabilities" "ApplicationName" "墨页"
  WriteRegStr SHCTX "Software\Moye\Capabilities" "ApplicationDescription" "给 AI 写的 Markdown 用的本地阅读器"
  WriteRegStr SHCTX "Software\Moye\Capabilities\FileAssociations" ".md" "MDViewer.markdown"
  WriteRegStr SHCTX "Software\Moye\Capabilities\FileAssociations" ".markdown" "MDViewer.markdown"
  WriteRegStr SHCTX "Software\RegisteredApplications" "墨页" "Software\Moye\Capabilities"

  ${If} $AssociateMd == 1
    WriteRegStr HKCU "Software\Classes\.md" "" "MDViewer.markdown"
    WriteRegStr HKCU "Software\Classes\.markdown" "" "MDViewer.markdown"
    WriteRegStr SHCTX "Software\Classes\.md" "" "MDViewer.markdown"
    WriteRegStr SHCTX "Software\Classes\.markdown" "" "MDViewer.markdown"
    DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.md\UserChoice"
    DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.md\UserChoiceBackup"
    DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.markdown\UserChoice"
    DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.markdown\UserChoiceBackup"
  ${EndIf}

  System::Call 'shell32.dll::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'
!macroend

!macro NSIS_HOOK_PREUNINSTALL
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  DeleteRegKey HKCU "Software\Classes\MDViewer.markdown"
  DeleteRegKey SHCTX "Software\Classes\MDViewer.markdown"
  DeleteRegValue SHCTX "Software\RegisteredApplications" "墨页"
  DeleteRegKey SHCTX "Software\Moye"
  System::Call 'shell32.dll::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'
!macroend
