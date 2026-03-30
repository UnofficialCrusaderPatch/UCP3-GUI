
# UCP3 on Linux
## Running UCP3 on Linux
It involves using the Linux builds of the UCP3-GUI. If the ones we provided do not work, you might have to compile the GUI from source, see below.

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
