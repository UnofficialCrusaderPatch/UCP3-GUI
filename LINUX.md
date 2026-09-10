
# UCP3 on Linux
## Running UCP3 on Linux
Download the Linux assets from the [GUI releases](https://github.com/UnofficialCrusaderPatch/UCP3-GUI/releases), expanding **Assets** if necessary. The [1.0.16 release](https://github.com/UnofficialCrusaderPatch/UCP3-GUI/releases/tag/v1.0.16) includes both `ucp3-gui_1.0.16_amd64.AppImage` and `ucp3-gui_1.0.16_amd64.deb`. These builds are for x86-64 (amd64), not ARM.

### AppImage

Download the plain `.AppImage` file; `.AppImage.tar.gz` and `.sig` are for the automatic updater. From the download directory:

```sh
chmod +x ucp3-gui_1.0.16_amd64.AppImage
./ucp3-gui_1.0.16_amd64.AppImage
```

If mounting fails because FUSE is unavailable, try:

```sh
./ucp3-gui_1.0.16_amd64.AppImage --appimage-extract-and-run
```

AppImages bundle libraries but still have host requirements (including glibc and graphics drivers); they are not a guarantee of compatibility with every distribution. See [Tauri's Linux bundle guide](https://v1.tauri.app/v1/guides/building/linux/).

### Debian packages and compatibility

Our Linux CI builds on Ubuntu 22.04 using Tauri 1 and WebKitGTK 4.0. The published 1.0.14 and 1.0.16 `.deb` files declare `libwebkit2gtk-4.0-37` and `libgtk-3-0`; their executables also require glibc 2.34 or newer and OpenSSL 3 (`libssl.so.3` and `libcrypto.so.3`, provided by `libssl3`). Future packages explicitly declare those additional requirements.

- **Ubuntu 22.04 and Debian 12 (Bookworm):** their repositories provide the required library generation. This is a dependency compatibility baseline, not a claim that every desktop/driver setup has been tested. See the [Ubuntu package](https://packages.ubuntu.com/jammy/libwebkit2gtk-4.0-37) and [Debian 12 package](https://packages.debian.org/bookworm/libwebkit2gtk-4.0-37).
- **Debian 13 (Trixie) and Ubuntu 24.04:** their standard repositories provide WebKitGTK 4.1 instead of the required 4.0 runtime, so the current `.deb` cannot be installed using only those repositories. WebKitGTK 4.1 is a different ABI; changing the dependency name does not fix the executable. See [Debian's WebKitGTK packages](https://packages.debian.org/source/webkit2gtk) and [Ubuntu's WebKitGTK packages](https://packages.ubuntu.com/search?keywords=webkit2gtk).
- **Debian 11:** the published binaries require a newer glibc and OpenSSL than the distribution supplies.

On Debian 12 or Ubuntu 22.04, install from the download directory with APT so it resolves dependencies (including OpenSSL for the older packages):

```sh
sudo apt update
sudo apt install ./ucp3-gui_1.0.16_amd64.deb libssl3
```

On distributions without WebKitGTK 4.0, try the AppImage and report any terminal error. Rebuilding the current Tauri 1 source still requires WebKitGTK 4.0 development libraries; it does not by itself solve that ABI mismatch. Native `.deb` support there needs a WebKitGTK 4.1-compatible GUI port.

Tauri's [Linux automatic updater supports AppImage, not `.deb`](https://v1.tauri.app/v1/guides/distribution/updater/). Update a `.deb` installation by downloading and installing a newer `.deb`; restarting alone cannot install that update.

If installation fails, include the output of `cat /etc/os-release`, `uname -m`, and the complete APT or AppImage terminal error in your report so we can distinguish unavailable dependencies from graphics or runtime failures.

### Install the framework

If it does work, then:
1. Launch the GUI
2. Select your game's installation folder
3. Install the framework using the dedicated GUI button
4. Make sure you have Microsoft Visual C++ Redistributable for x86 (use winetricks)
5. Play!

## Building from source

### Setting Up Linux

[info source](https://v1.tauri.app/v1/guides/getting-started/prerequisites/#setting-up-linux)
#### 1. System Dependencies

You will need to install a couple of system dependencies, such as a C compiler and `webkit2gtk`. Below are commands for a few popular distributions:

<Tabs>
  <TabItem value="debian" label="Debian" default>

```sh
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    file \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```

  </TabItem>
  <TabItem value="arch" label="Arch">

```sh
sudo pacman -Syu
sudo pacman -S --needed \
    webkit2gtk \
    base-devel \
    curl \
    wget \
    file \
    openssl \
    appmenu-gtk-module \
    gtk3 \
    libappindicator-gtk3 \
    librsvg \
    libvips
```

  </TabItem>

For other linux distro's see the [info source](https://v1.tauri.app/v1/guides/getting-started/prerequisites/#setting-up-linux)
    
#### 2. Rust

To install Rust on Linux, open a terminal and enter the following command:

```shell
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
```

##### Note

We have audited this bash script, and it does what it says it is supposed to do. Nevertheless, before blindly curl-bashing a script, it is always wise to look at it first. Here is the file as a plain script: [rustup.sh]

The command downloads a script and starts the installation of the `rustup` tool, which installs the latest stable version of Rust. You might be prompted for your password. If the installation was successful, the following line will appear:

```text
Rust is installed now. Great!
```

Make sure to restart your Terminal for the changes to take effect.
    
### Compiling the GUI
```bash
git clone https://github.com/UnofficialCrusaderPatch/UCP3-GUI
cd UCP3-GUI
npm ci
npm run build
```
Then, the binary build can be found in the `src-tauri/target/linux` subfolder somewhere.
