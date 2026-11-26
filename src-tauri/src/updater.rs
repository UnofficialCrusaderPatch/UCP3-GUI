//! Replacement for Tauri v1's built-in updater dialog (`updater.dialog: true`),
//! which was removed in v2: check once on startup and ask the user.

use log::{error, info};
use tauri::{AppHandle, Runtime};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons};
use tauri_plugin_updater::UpdaterExt;

pub fn check_on_startup<R: Runtime>(app: &AppHandle<R>) {
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(err) = check_and_prompt(app).await {
            error!("Update check failed: {}", err);
        }
    });
}

async fn check_and_prompt<R: Runtime>(app: AppHandle<R>) -> tauri_plugin_updater::Result<()> {
    let Some(update) = app.updater()?.check().await? else {
        return Ok(());
    };
    let name = app.package_info().name.clone();
    let message = format!(
        "{name} {} is now available -- you have {}.\n\nWould you like to install it now?\n\nRelease Notes:\n{}",
        update.version,
        update.current_version,
        update.body.clone().unwrap_or_default()
    );
    let install = app
        .dialog()
        .message(message)
        .title(format!("A new version of {name} is available!"))
        .buttons(MessageDialogButtons::YesNo)
        .blocking_show();
    if !install {
        return Ok(());
    }
    info!("Installing update {}", update.version);
    update.download_and_install(|_, _| {}, || {}).await?;
    // on Windows the installer exits the app itself; elsewhere restart
    app.restart();
}
