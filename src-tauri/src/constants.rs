// General

pub const BASE_FOLDER: &str = "UnofficialCrusaderPatch3";

// Gui-Config

pub const NUMBER_OF_RECENT_FOLDERS: usize = 10;
pub const CONFIG_FILE_NAME: &str = "config.json";
pub const MESSAGE_TITLE: &str = "GUI-Configuration";
pub const LANGUAGE_CHANGE_EVENT: &str = "language-change";

pub const LOG_LEVEL_DEFAULT: &str = "INFO";

// logging

pub const LOG_PATTERN: &str = "{d} {l} {t} - {m}{n}"; // default pattern copied from file
pub const LOG_FOLDER: &str = "logs";
pub const LOG_FILE_PATTERN: &str = "ucp-gui.{}.log";
pub const LOG_COUNT: u32 = 25;
pub const LOG_BYTE_SIZE: u64 = 1024 * 1024; // 1MB as max log file size to roll
