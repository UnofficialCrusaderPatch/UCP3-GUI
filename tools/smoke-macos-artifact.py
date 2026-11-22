"""Check the downloaded PR app archive on its matching native macOS runner.

This detects packaging, architecture and immediate startup failures. It does not
assert rendered UI behavior, Gatekeeper acceptance or Windows game compatibility.
"""

import os
from pathlib import Path
import platform
import plistlib
import subprocess
import sys
import tempfile


def main():
    archive = Path(sys.argv[1]).resolve(strict=True)
    expected_arch = sys.argv[2]
    if platform.system() != "Darwin" or platform.machine() != expected_arch:
        raise RuntimeError(f"Expected a native {expected_arch} macOS runner")

    with tempfile.TemporaryDirectory(prefix="ucp-macos-smoke-") as directory:
        root = Path(directory)
        subprocess.run(["tar", "-xzf", str(archive), "-C", str(root)], check=True)
        app = root / "UCP3-GUI.app"
        with (app / "Contents/Info.plist").open("rb") as source:
            metadata = plistlib.load(source)
        binary = app / "Contents/MacOS" / metadata["CFBundleExecutable"]
        if not os.access(binary, os.X_OK):
            raise RuntimeError("Downloaded app executable lost its executable permission")
        architectures = subprocess.check_output(
            ["lipo", "-archs", str(binary)], text=True
        ).split()
        if architectures != [expected_arch]:
            raise RuntimeError(f"Expected {expected_arch}, found {architectures}")
        for resource in ("lang", "gameinfo", "backgrounds"):
            resource_dir = app / "Contents/Resources" / resource
            if not resource_dir.is_dir() or not any(resource_dir.rglob("*")):
                raise RuntimeError(f"Missing packaged resources: {resource}")

        # Capture early failures and stop only the process we created.
        with (root / "startup.log").open("w+") as log:
            process = subprocess.Popen(
                [str(binary)], cwd=root, stdout=log, stderr=subprocess.STDOUT
            )
            try:
                try:
                    code = process.wait(timeout=15)
                except subprocess.TimeoutExpired:
                    print(f"Downloaded {expected_arch} app remained running for 15 seconds")
                else:
                    raise RuntimeError(f"App exited during startup with status {code}")
            finally:
                if process.poll() is None:
                    process.terminate()
                    try:
                        process.wait(timeout=5)
                    except subprocess.TimeoutExpired:
                        process.kill()
                        process.wait()
                log.seek(0)
                print(log.read())


if __name__ == "__main__":
    main()
