"""Compile and execute the production NSIS prerequisite functions against fixtures.

Usage (Windows): python tools/test-msvc-installer.py path/to/makensis.exe
Only a unique HKCU test key is written; installed runtimes are never modified.
"""

import pathlib
import subprocess
import sys
import tempfile
import uuid
import winreg


source = (pathlib.Path(__file__).resolve().parents[1] /
          "src-tauri/nsis-template-with-msvc.nsi").read_text()
functions = source[source.index("Function CheckCompatibleMSVC"):
                   source.index("Section MSVC")]
key = "Software\\UCP3InstallerTests\\" + uuid.uuid4().hex
functions = functions.replace("HKLM", "HKCU").replace(
    "SOFTWARE\\Microsoft\\VisualStudio\\14.0\\VC\\Runtimes\\x86", key)
cases = [
    ("missing", {}, 0),
    ("not installed", dict(Installed=0, Major=14, Minor=44, Bld=35211), 0),
    ("older minor", dict(Installed=1, Major=14, Minor=41, Bld=99999), 0),
    ("older build", dict(Installed=1, Major=14, Minor=42, Bld=34432), 0),
    ("minimum", dict(Installed=1, Major=14, Minor=42, Bld=34433), 1),
    ("newer build", dict(Installed=1, Major=14, Minor=42, Bld=34434), 1),
    ("screenshot version", dict(Installed=1, Major=14, Minor=44, Bld=35211), 1),
    ("newer minor, lower build", dict(Installed=1, Major=14, Minor=50, Bld=1), 1),
    ("different family", dict(Installed=1, Major=15, Minor=50, Bld=99999), 0),
    ("missing build", dict(Installed=1, Major=14, Minor=50), 0),
    ("wrong registry type", dict(Installed=1, Major=14, Minor="50", Bld=1), 0),
]
lines = []
count = 0


def expect(condition, description):
    global count
    count += 1
    lines.extend([
        "  ${If} " + condition,
        '    FileWrite $0 "FAIL: ' + description + '$\\r$\\n"',
        "    IntOp $8 $8 + 1",
        "  ${EndIf}",
    ])


for label, values, compatible in cases:
    lines.append(f'  DeleteRegKey HKCU "{key}"')
    for name, value in values.items():
        command = "WriteRegStr" if isinstance(value, str) else "WriteRegDWORD"
        lines.append(f'  {command} HKCU "{key}" "{name}" "{value}"')
    lines.append("  Call CheckCompatibleMSVC")
    expect(f"$R9 != {compatible}", label)
    for code, expected in [(0, 1), (3010, 1), (1641, 1), (1638, compatible),
                           (-2147023258, compatible), (1603, 0), (1618, 0)]:
        lines.extend(["  SetRebootFlag false", f"  StrCpy $1 {code}",
                      "  Call CheckMSVCInstallResult"])
        expect(f"$R9 != {expected}", f"{label}: exit {code}")
        lines.extend(["  StrCpy $2 0", "  IfRebootFlag 0 +2", "  StrCpy $2 1"])
        expect(f"$2 != {int(code in (3010, 1641))}", f"{label}: reboot {code}")

with tempfile.TemporaryDirectory(prefix="ucp-msvc-tests-") as folder:
    folder = pathlib.Path(folder)
    script = folder / "test.nsi"
    exe = folder / "test.exe"
    log = folder / "results.txt"
    script.write_text('\n'.join([
        'Unicode true', '!include "LogicLib.nsh"',
        'Name "UCP runtime detection tests"', 'RequestExecutionLevel user',
        'SilentInstall silent', f'OutFile "{exe}"', functions,
        'Section', '  SetRegView 32', '  StrCpy $8 0',
        f'  FileOpen $0 "{log}" w', *lines,
        f'  DeleteRegKey HKCU "{key}"', '  FileClose $0',
        '  SetErrorLevel $8', 'SectionEnd',
    ]))
    try:
        subprocess.run([sys.argv[1], "/V2", str(script)], check=True)
        result = subprocess.run([str(exe), "/S"], timeout=30)
        failures = log.read_text()
        if result.returncode or failures:
            raise SystemExit(failures or f"NSIS exited {result.returncode}")
        print(f"Passed {count} assertions using compiled production NSIS functions.")
    finally:
        try:
            winreg.DeleteKey(winreg.HKEY_CURRENT_USER, key)
        except FileNotFoundError:
            pass
