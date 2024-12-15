# UCP3 GUI ![Github All Releases](https://img.shields.io/github/downloads/UnofficialCrusaderPatch/UCP3-GUI/total.svg) [![UCP_Official](https://discordapp.com/api/guilds/426318193603117057/widget.png?style=shield)](https://discord.gg/P9dkF38Q2t)

This repository contains the source code for the UCP3-GUI.
This software provides a GUI to configure and manage installations of the [UnofficialCrusaderPatch3](https://github.com/UnofficialCrusaderPatch/UnofficialCrusaderPatch3), a modification utility for the game **Stronghold Crusader**.

The first version of the GUI as well as the UCP3 itself are heavy work in progress and may currently change without further notice.


### Table of Contents
- [Installation and Usage](#installation-and-usage)
- [Contributing](#contributing)
    - [Basics](#basics)
    - [Technology](#technology)
    - [Setup](#setup)
    - [Build and Run](#build-and-run)
- [Special Thanks](#special-thanks)



## Installation and Usage

The GUI is currently work in progress, so there is no release at the moment.

The first version will likely come in the form of an installer that takes care of the necessities.

The support will include **at least** Windows 10/11, however, it should go down to Windows 8 and if possible even Windows 7. Linux and Mac will be considered after that and are in the realm of possibilities.

This section will be restructured and extended once the first version is ready for release.
(If we forget, please inform us :upside_down_face:.)



## Contributing

Contributions and help are always welcome!


### Basics

The application is written using [Tauri](https://tauri.app/). It is therefore a combination of [Frontend-Web-Technologies like HTML, CSS and Javascript](https://developer.mozilla.org/en-US/docs/Web) and a [Rust-based Backend](https://www.rust-lang.org/).

The separation is rather strict. Frontend code can not interact "normally" with the filesystem or the OS like some of you are maybe used to from [Node](https://nodejs.org/). Instead, it relies on specific provided or custom-written API functions in Rust. The window with its frontend code essentially behaves like a webpage.

More information are better taken from Tauri sources :smiley:.

Something is very important, however:  
**You do not need to know both Rust and Javascript to help.**  
Most work is done in the frontend. In terms of knowledge for the frontend part: Knowing React or being willing to learn the basics is essential. Styling alone might also be helpful, but due to the usage of React, there is little need for HTML alone.


### Technology

Multiple words were already said about [Tauri](https://tauri.app/), but this just sets the playground for a lot of possible technologies, especially regarding the frontend. The list does not talk about all used packages. Instead it lists noteworthy dependencies that define they way code is written and behaves.

If you think something else is worth mentioning, please tell us.

**Backend**

Nothing outside what appears to be the "normal" Rust setup using [Cargo](https://doc.rust-lang.org/cargo/).

**Frontend**

- [Typescript](https://www.typescriptlang.org/) - Typing
    - To increase the code safety and help the IDE to provide better suggestions.
- [React](https://reactjs.org/) - Frontend Library
    - Defines how our page content is created and structured.
    - We use the function component-based syntax.
    - We currently use [Jotai](https://jotai.org/) for global values.
- [Vite](https://vitejs.dev/) - Frontend Tooling
    - Used to provide a development server and build tools.
    - Has heavy impact on how imports are function.
- [ESLint](https://eslint.org/) - Linter
    - To make sure we have a common code style, at least in our Javascript-Code.


### Setup

To develope and build the application, you need to fullfil some requirements.

0. Install and setup [Git](https://git-scm.com/).
    - If you are new to this and since we are using Github anyway, you may use its [tutorial](https://docs.github.com/en/get-started/quickstart/set-up-git).
    - Get at least a bit familiar with what it does an how it works. There are many tutorials online.
    - If your are ready, pull a version of this repo using a way of your liking.
    - There are many support tools, some for IDEs, some stand-alone, some for terminal, some with UIs. Feel free to use any.

1. Install and setup the prerequisites like explained in the [Tauri Docs](https://tauri.app/v1/guides/getting-started/prerequisites). This depends on the OS you are developing on and essentially involves:
    - Getting the build tools needed to build Rust (Visual Studio C++ Build Tools for Windows) and display the frontend window (WebView2 for Windows).
        - If you use [Visual Studio](https://visualstudio.microsoft.com), you may already have the interface to manage its dependencies, which include the option to install Rust tools.
    - Installing and setting up Rust development.
        - This may become rather tricky. On one of our setups, even changing the antivirus software was required, since it would always block the first build steps of the projects dependencies. There is no other way then trying.

2. Install [Node](https://nodejs.org).
    - We use [NPM](https://www.npmjs.com/) for dependencies and build commands, which in turn use Node to run.
    - Since our frontend is a Node project, it helps to be a bit familiar with the [package.json](https://docs.npmjs.com/cli/v9/configuring-npm/package-json).
    - You may also use [NVM](https://github.com/nvm-sh/nvm) to install Node and manage its version. Note that this project is exclusive to Unix systems. For Windows you can use [THIS](https://github.com/coreybutler/nvm-windows).

3. Install the frontend dependencies.
    - Navigate into the projects root and run `npm ci` to install the frontend dependencies into the folder. You need to repeat this step if the dependencies were changed by someone else. At best you just run it whenever you pull something from the repository. `npm install` should only be used if you want to change or add dependencies.
    - The Rust dependencies should be installed by the run and build commands of the application.

4. Setup your favorite IDEs and install plugins for the parts you want to work on.
    - For the frontend, we recommend [Visual Studio Code](https://code.visualstudio.com/). Set it up with the following settings:
      - Install the ESLint plugin and the Prettier plugin
      - Set the default formatter to Prettier.
      - Enable formatting on save. Formatting rules should be applied when you save the file.
      - If it is not working right, try restarting visual studio code.
      - Set the preferred path style for typescript auto imports to `relative` (setting is currently called importModuleSpecifier). The reason is that `unimported`, the unused code tracker, works only with relative imports due to the setup of the folders.
      - Set the default line ending to `\n` (LF): setting is called `files.eol`
    - For the backend, also for [Visual Studio Code](https://code.visualstudio.com/) as example, the `rust-analyzer` is heavily recommended (it also is a bit heavy on the system) to get proper code validation und suggestions.
    - Feel free to install and use other plugins!

To get get better idea of the structure of the project, you can take a look at this [Getting Started Guide](https://tauri.app/v1/guides/getting-started/setup/vite) for setting up a Tauri project using Vite. **However, it is important to not follow the steps in it, since they are meant to setup an entirely new project!**

We also currently do not monitor which versions should be used of Rust, Node and NPM. We recommend the newest versions. Should something break with them, please inform use, so that we can update the code.


### Build and Run

There are currently two commands set up. Both are run through npm:

- `npm run dev` - Installs the Rust dependencies, starts the frontend development server and opens the window. Vite takes care of hot reloads of changed frontend files.  
Changes of Rust files, however, require a re-compile, and are currently also triggered on change. Depending on your system, you therefore may better develop in Rust without the dev-server being active.

- `npm run build` - Installs the Rust dependencies and builds the application.  
The results are an executable under `src-tauri\target\release\` and an installer under `src-tauri\target\release\bundle`. In case of Windows, it will currently create a msi-installer using the bitness of your system (x32 or x64).

Currently, both the build and the dev versions of the window allow to open the web console by typing F12.



### Special Thanks

[Firefly Studios](https://fireflyworlds.com/) for the creation of the Stronghold Crusader.
