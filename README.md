# UCP3 GUI

This repository contains the source code for the UCP3-GUI.
This software provides a GUI to configure and manage installations of the [UnofficialCrusaderPatch3](https://github.com/UnofficialCrusaderPatch/UnofficialCrusaderPatch3), a modification utility for the game **Stronghold Crusader**.

The first version of the GUI as well as the UCP3 itself are heavy work in progress and may currently change without further notice.

### Table of Contents
- [Installation and Usage](#Installation%20and%20Usage)
- [Contributing](#Contributing)
    - [Basics](#Basics)
    - [Technology](#Technology)
    - [Setup](#Setup)



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



Steps for setup:
0. Clone the repo and navigate your shell there
1. Install [Rust](https://www.rust-lang.org/tools/install)
- You might need [Visual Studios Buildtools](visualstudio.microsoft.com/visual-cpp-build-tools/)
2. Install [npm node](https://nodejs.org/en/)
3. npm install
4. npm update
5. npm run dev

Alternatively if you want to just build the project you can do 
5. run npm build
