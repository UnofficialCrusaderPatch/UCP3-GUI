# macOS PR builds

The PR build workflow creates separate Apple Silicon (`arm64`) and Intel
(`x86_64`) apps. Each job passes its Rust target to Tauri and uploads from the
corresponding `target/<triple>/release` directory. The jobs use matching native
`macos-15` and `macos-15-intel` runners so startup is checked without emulation.
Runner labels: [GitHub's supported runner images](https://github.com/actions/runner-images#available-images).

Each architecture provides two Actions artifacts:

- `UCP3-GUI-macos-<arch>-dmg`: the disk image.
- `UCP3-GUI-macos-<arch>-app`: a `.app.tar.gz` containing the complete app bundle.
  Extract the tar archive after downloading the Actions ZIP. The tar layer
  preserves executable permissions and symlinks that a raw app upload would lose.

Every upload fails if its expected file is missing. Windows portable/installer
and Linux deb/AppImage/updater archives are uploaded separately. RPM packaging is
outside this PR's scope.

After upload, each macOS job downloads its app artifact and runs
`tools/smoke-macos-artifact.py`. It checks the Mach-O architecture, executable
permission, language/gameinfo/background resources, and that the downloaded app
stays running for 15 seconds on its matching native runner. Early exits fail the
job and print startup output. This is a startup smoke check, not a visual UI test.

PR artifacts are development builds. This change does not configure Apple
Developer signing or notarization, publish macOS updater metadata, or establish
compatibility with running the Windows game on macOS. Those remain separate work.
Before claiming user-facing macOS support, manually check the downloaded DMG,
Gatekeeper behavior, window rendering, resource loading, file dialogs and
configuration save/reopen on both architectures, and define the game-launch
compatibility approach. CI currently demonstrates startup on macOS 15 only.
