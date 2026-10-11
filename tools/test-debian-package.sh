#!/usr/bin/env bash
set -euo pipefail
# Run only in the disposable Ubuntu 22.04 CI container, never on the host.
export DEBIAN_FRONTEND=noninteractive
depends=$(dpkg-deb -f /tmp/gui.deb Depends)
printf 'Built package Depends: %s\n' "$depends"
for dependency in libssl3 libc6 libgtk-3-0 libwebkit2gtk-4.0-37; do
  [[ "$depends" == *"$dependency"* ]]
done
apt-get update -qq
apt-get install -y /tmp/gui.deb xvfb xauth dbus-x11 python3 xdotool
useradd --create-home gui-preview
executable=$(dpkg-query -L ucp3-gui | awk '/^\/usr\/bin\/[^/]+$/ {print; exit}')
test -n "$executable"
test -x "$executable"
ldd "$executable"
if ldd "$executable" | grep -q 'not found'; then exit 1; fi
runuser -u gui-preview -- env WEBKIT_DISABLE_COMPOSITING_MODE=1 \
  dbus-run-session -- xvfb-run -a python3 - "$executable" <<'PY'
import subprocess, sys, time
app = subprocess.Popen([sys.argv[1]], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
visible = False
try:
    for _ in range(30):
        if app.poll() is not None:
            raise RuntimeError('Installed GUI exited before the 15-second smoke completed')
        windows = subprocess.run(['xdotool', 'search', '--onlyvisible', '--pid', str(app.pid), '--name', '.'], capture_output=True, text=True)
        visible = visible or (windows.returncode == 0 and bool(windows.stdout.strip()))
        time.sleep(0.5)
    if not visible:
        raise RuntimeError('Installed GUI did not create a visible X11 window')
    print('PASS: clean Ubuntu 22.04 APT installation, resolved libraries, visible window, 15-second native startup')
finally:
    app.terminate()
    try:
        output, _ = app.communicate(timeout=5)
    except subprocess.TimeoutExpired:
        app.kill()
        output, _ = app.communicate()
    print(output)
PY
