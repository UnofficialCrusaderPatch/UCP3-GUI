; NSIS installer hooks (Tauri v2 `bundle.windows.nsis.installerHooks`).
; Replaces the forked Tauri v1 installer template (nsis-template-with-msvc.nsi):
; the only customization was installing the x86 MSVC runtime.

; The x86 runtime is used by the game/framework even in the x64 GUI bundle.
; Keep this minimum in sync with the toolchain used for shipped components.
; Do not accept a different major family without a compatibility review.
Function CheckCompatibleMSVC
  Push $4
  Push $5
  Push $6
  Push $7
  StrCpy $R9 0
  SetRegView 32
  ClearErrors
  ReadRegDWORD $4 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x86" "Installed"
  ReadRegDWORD $5 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x86" "Major"
  ReadRegDWORD $6 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x86" "Minor"
  ReadRegDWORD $7 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x86" "Bld"
  IfErrors MSVC_check_done
  ${If} $4 == 1
  ${AndIf} $5 == 14
    ${If} $6 > 42
      StrCpy $R9 1
    ${ElseIf} $6 == 42
    ${AndIf} $7 >= 34433
      StrCpy $R9 1
    ${EndIf}
  ${EndIf}
  MSVC_check_done:
  SetRegView lastused
  ClearErrors
  Pop $7
  Pop $6
  Pop $5
  Pop $4
FunctionEnd

; Input: $1 is the redistributable exit code. Output: $R9 is success (0/1).
Function CheckMSVCInstallResult
  StrCpy $R9 0
  ${If} $1 == 0
    StrCpy $R9 1
  ${ElseIf} $1 == 3010
  ${OrIf} $1 == 1641
    SetRebootFlag true
    StrCpy $R9 1
  ${ElseIf} $1 == 1638
  ${OrIf} $1 == -2147023258 ; HRESULT 0x80070666
    ; A competing/newer installation is harmless only if it meets our minimum.
    Call CheckCompatibleMSVC
  ${EndIf}
FunctionEnd

!macro NSIS_HOOK_PREINSTALL
  Call CheckCompatibleMSVC
  ${If} $R9 == 1
    DetailPrint "Compatible Microsoft Visual C++ v14 Redistributable (x86) already installed"
    Goto MSVC_done
  ${EndIf}

  Delete "$TEMP\VC_redist.x86.exe"
  DetailPrint "Downloading Microsoft Visual C++ Redistributable (x86)"
  NSISdl::download "https://aka.ms/vs/17/release/vc_redist.x86.exe" "$TEMP\VC_redist.x86.exe"
  Pop $0
  ${If} $0 != "success"
    DetailPrint "Microsoft Visual C++ Redistributable (x86) download failed ($0)"
    MessageBox MB_OK "Microsoft Visual C++ Redistributable (x86) could not be downloaded ($0). GUI setup will continue. If the game cannot start, install the x86 runtime from https://aka.ms/vs/17/release/vc_redist.x86.exe"
    Goto MSVC_done
  ${EndIf}

  DetailPrint "Installing Microsoft Visual C++ Redistributable (x86)"
  ClearErrors
  ExecWait '"$TEMP\VC_redist.x86.exe" /install /passive /norestart' $1
  ${If} ${Errors}
    StrCpy $1 "could not start installer"
    StrCpy $R9 0
  ${Else}
    Call CheckMSVCInstallResult
  ${EndIf}
  ${If} $R9 == 1
    DetailPrint "Microsoft Visual C++ Redistributable (x86) prerequisite satisfied ($1)"
  ${Else}
    DetailPrint "Microsoft Visual C++ Redistributable (x86) installation failed ($1)"
    MessageBox MB_OK "Microsoft Visual C++ Redistributable (x86) setup returned $1. GUI setup will continue. If the game cannot start, install or repair the x86 runtime from https://aka.ms/vs/17/release/vc_redist.x86.exe"
  ${EndIf}
  MSVC_done:
!macroend
