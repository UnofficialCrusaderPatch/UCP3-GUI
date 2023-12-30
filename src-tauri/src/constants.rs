use glob::MatchOptions;

// General

pub const BASE_FOLDER: &str = "UnofficialCrusaderPatch3";

pub const PATH_MATCH_OPTIONS: MatchOptions = MatchOptions {
    case_sensitive: true,
    require_literal_separator: true,
    require_literal_leading_dot: true, // makes linux and windows behave the same
};

// Gui-Config

pub const NUMBER_OF_RECENT_FOLDERS: usize = 10;
pub const CONFIG_FILE_NAME: &str = "config.json";
pub const MESSAGE_TITLE: &str = "GUI-Configuration";

pub const LOG_LEVEL_DEFAULT: &str = "INFO";

// logging

pub const LOG_PATTERN: &str = "{d} {l} {t} - {m}{n}"; // default pattern copied from file
pub const LOG_PATTERN_WEB_CONSOLE: &str = "BACKEND - {t} - {m}{n}"; // pattern used to send to the frontend
pub const LOG_FOLDER: &str = "logs";
pub const LOG_FILE_PATTERN: &str = "ucp-gui.{}.log";
pub const LOG_COUNT: u32 = 25;
pub const LOG_BYTE_SIZE: u64 = 1024 * 1024; // 1MB as max log file size to roll
pub const LOG_BACKEND_EVENT: &str = "backend-log";
