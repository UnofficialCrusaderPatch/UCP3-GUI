// Tauri actually has its own logging:
// https://github.com/tauri-apps/tauri-plugin-log
//
// I forgot to search before implementing.
// I keep the custom solution until it seems more convenient to switch.

use std::io::Write;
use std::str::FromStr;

use log::{debug, info, Level, LevelFilter};
use log4rs::append::rolling_file::policy::compound::roll::fixed_window::FixedWindowRoller;
use log4rs::append::rolling_file::policy::compound::trigger::size::SizeTrigger;
use log4rs::append::rolling_file::policy::compound::CompoundPolicy;
use log4rs::append::rolling_file::RollingFileAppender;
use log4rs::append::Append;
use log4rs::config::{Appender, Config, Root, Logger};
use log4rs::encode::pattern::PatternEncoder;
use log4rs::encode::writer::simple::SimpleWriter;
use log4rs::encode::Encode;
use log4rs::filter::threshold::ThresholdFilter;
use log4rs::Handle;
use serde::Serialize;
use tauri::{AppHandle, Manager};

use crate::constants::{
    LOG_BACKEND_EVENT, LOG_BYTE_SIZE, LOG_COUNT, LOG_FILE_PATTERN, LOG_FOLDER, LOG_LEVEL_DEFAULT,
    LOG_PATTERN, LOG_PATTERN_WEB_CONSOLE,
};
use crate::utils::get_roaming_folder_path;

const FROM_FRONTEND_LOG_TARGET: &str = "frontent_target";

#[derive(Serialize, Clone)]
struct BackendLog {
    level: usize,
    message: String,
}

#[derive(Debug)]
struct WebConsoleAppender {
    app_handle: AppHandle,
    encoder: Box<dyn Encode>,
}

impl WebConsoleAppender {
    fn builder(app_handle: &AppHandle) -> WebConsoleAppenderBuilder {
        WebConsoleAppenderBuilder {
            app_handle: app_handle.to_owned(),
            encoder: None,
        }
    }

    fn fill_vec_with_log(&self, vec: &mut Vec<u8>, record: &log::Record) -> anyhow::Result<()> {
        let mut writer = SimpleWriter(vec);
        self.encoder.encode(&mut writer, record)?;
        writer.flush()?;
        Ok(())
    }
}

impl Append for WebConsoleAppender {
    fn append(&self, record: &log::Record) -> anyhow::Result<()> {
        let mut buffer = Vec::new();
        self.fill_vec_with_log(&mut buffer, record)?;

        self.app_handle.emit_all::<BackendLog>(
            LOG_BACKEND_EVENT,
            BackendLog {
                level: record.level() as usize,
                message: String::from_utf8(buffer)?,
            },
        )?;
        Ok(())
    }

    // does nothing, sends to console immediately
    fn flush(&self) {}
}

// taken from the ConsoleAppender code
struct WebConsoleAppenderBuilder {
    app_handle: AppHandle,
    encoder: Option<Box<dyn Encode>>,
}

impl WebConsoleAppenderBuilder {
    fn encoder(mut self, encoder: Box<dyn Encode>) -> WebConsoleAppenderBuilder {
        self.encoder = Some(encoder);
        self
    }

    fn build(self) -> WebConsoleAppender {
        WebConsoleAppender {
            app_handle: self.app_handle,
            encoder: self
                .encoder
                .unwrap_or_else(|| Box::new(PatternEncoder::default())),
        }
    }
}

// source: https://stackoverflow.com/a/56347061
pub fn create_config(app_handle: Option<&AppHandle>, level: LevelFilter) -> Config {
    let file_appender_name: &str = "file_logger";

    let mut log_files_path = get_roaming_folder_path();
    log_files_path.push(LOG_FOLDER);
    let log_archive = log_files_path.join(LOG_FILE_PATTERN);
    let log_current = log_files_path.join(LOG_FILE_PATTERN.replace("{}", "current"));

    let window_roller = FixedWindowRoller::builder()
        .build(log_archive.to_str().unwrap(), LOG_COUNT)
        .unwrap();
    let size_trigger = SizeTrigger::new(LOG_BYTE_SIZE);
    let compound_policy = CompoundPolicy::new(Box::new(size_trigger), Box::new(window_roller));

    let rolling_appender = RollingFileAppender::builder()
        .encoder(Box::new(PatternEncoder::new(LOG_PATTERN)))
        .build(log_current, Box::new(compound_policy))
        .unwrap();

    let mut config_builder = Config::builder();
    let mut root_builder = Root::builder();

    if let Some(app_handle) = app_handle {
        let web_console_appender_name: &str = "console_logger";

        let console_appender = WebConsoleAppender::builder(app_handle)
            .encoder(Box::new(PatternEncoder::new(LOG_PATTERN_WEB_CONSOLE)))
            .build();

        config_builder = config_builder.appender(
            Appender::builder()
                .filter(Box::new(ThresholdFilter::new(level)))
                .build(web_console_appender_name, Box::new(console_appender)),
        );
        root_builder = root_builder.appender(web_console_appender_name);
    }

    config_builder
        .appender(
            Appender::builder()
                .filter(Box::new(ThresholdFilter::new(level)))
                .build(file_appender_name, Box::new(rolling_appender)),
        )
        .logger(Logger::builder()
            .appender(file_appender_name)
            .additive(false)
            .build(FROM_FRONTEND_LOG_TARGET, level))
        .build(root_builder.appender(file_appender_name).build(level))
        .unwrap()
}

// currently panics on error
pub fn init_logging() -> Handle {
    // using debug as unset default here
    let handle = log4rs::init_config(create_config(None, LevelFilter::Debug)).unwrap();
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

pub fn set_root_log_level_with_string(
    app_handle: &AppHandle,
    config_handle: &Handle,
    level_as_string: &str,
) {
    set_root_log_level(
        app_handle,
        config_handle,
        get_level_or_default_from_string(level_as_string),
    );
}

pub fn set_root_log_level(app_handle: &AppHandle, config_handle: &Handle, level: LevelFilter) {
    config_handle.set_config(create_config(Some(app_handle), level));
    debug!("Re-init logging with log level {}", level);
}

// Tauri binds:

#[tauri::command]
pub fn log(level: usize, message: &str) -> Result<(), String> {
    let log_level = get_level_from_usize(level)?;
    log::log!(target: FROM_FRONTEND_LOG_TARGET, log_level, "{}", message);
    Ok(())
}
