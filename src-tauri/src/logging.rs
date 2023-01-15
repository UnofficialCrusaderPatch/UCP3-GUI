// Tauri actually has its own logging:
// https://github.com/tauri-apps/tauri-plugin-log
//
// I forgot to search before implementing.
// I keep the custom solution until it seems more convenient to switch.

use std::str::FromStr;

use log::{debug, info, Level, LevelFilter};
use log4rs::append::rolling_file::policy::compound::roll::fixed_window::FixedWindowRoller;
use log4rs::append::rolling_file::policy::compound::trigger::size::SizeTrigger;
use log4rs::append::rolling_file::policy::compound::CompoundPolicy;
use log4rs::append::rolling_file::RollingFileAppender;
use log4rs::config::{Appender, Config, Root};
use log4rs::encode::pattern::PatternEncoder;
use log4rs::filter::threshold::ThresholdFilter;
use log4rs::Handle;

use crate::constants::{
    LOG_BYTE_SIZE, LOG_COUNT, LOG_FILE_PATTERN, LOG_FOLDER, LOG_LEVEL_DEFAULT, LOG_PATTERN,
};
use crate::utils::get_roaming_folder_path;

// source: https://stackoverflow.com/a/56347061
pub fn create_config(level: LevelFilter) -> Config {
    let appender_name: &str = "logger";

    let mut log_files_path = get_roaming_folder_path();
    log_files_path.push(LOG_FOLDER);
    let log_archive = log_files_path.join(LOG_FILE_PATTERN);
    let log_current = log_files_path.join(LOG_FILE_PATTERN.replace("{}", "current"));

    let window_roller = FixedWindowRoller::builder()
        .build(log_archive.to_str().unwrap(), LOG_COUNT)
        .unwrap();
    let size_trigger = SizeTrigger::new(LOG_BYTE_SIZE);
    let compound_policy = CompoundPolicy::new(Box::new(size_trigger), Box::new(window_roller));

    let log_appender = RollingFileAppender::builder()
        .encoder(Box::new(PatternEncoder::new(LOG_PATTERN)))
        .build(log_current, Box::new(compound_policy))
        .unwrap();

    Config::builder()
        .appender(
            Appender::builder()
                .filter(Box::new(ThresholdFilter::new(level)))
                .build(appender_name, Box::new(log_appender)),
        )
        .build(Root::builder().appender(appender_name).build(level))
        .unwrap()
}

// currently panics on error
pub fn init_logging() -> Handle {
    // using debug as unset default here
    let handle = log4rs::init_config(create_config(LevelFilter::Debug)).unwrap();
    info!("Initialized Logger!");
    handle
}

fn get_level_or_default_from_string(level_as_string: &str) -> LevelFilter {
    LevelFilter::from_str(level_as_string.to_uppercase().as_str())
        .unwrap_or_else(|_err| LevelFilter::from_str(LOG_LEVEL_DEFAULT).unwrap())
}

// copied, since "from_usize" are not public
fn get_level_from_usize(level_number: usize) -> Result<Level, String> {
    let level = match level_number {
        1 => Level::Error,
        2 => Level::Warn,
        3 => Level::Info,
        4 => Level::Debug,
        5 => Level::Trace,
        _ => return Err(String::from("Received invalid log level number.")),
    };
    Ok(level)
}

pub fn set_root_log_level_with_string(config_handle: &Handle, level_as_string: &str) {
    set_root_log_level(
        config_handle,
        get_level_or_default_from_string(level_as_string),
    );
}

pub fn set_root_log_level(config_handle: &Handle, level: LevelFilter) {
    config_handle.set_config(create_config(level));
    debug!("Set log level to {}", level);
}

// Tauri binds:

#[tauri::command]
pub fn log(level: usize, message: &str) -> Result<(), String> {
    let log_level = get_level_from_usize(level)?;
    log::log!(log_level, "{}", message);
    Ok(())
}

// TODO: event to send logs to browser console