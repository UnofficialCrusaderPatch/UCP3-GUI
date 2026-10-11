//! Read just the fixed GM1 header, never its pixel payload, for menu discovery.
use crate::utils::get_allowed_path_with_string_error;
use std::{fs::File, io::Read};
use tauri::AppHandle;

#[derive(serde::Serialize)]
pub struct GmMetadata {
    count: u32,
    kind: u32,
    palette: Vec<u8>,
}

fn parse_header(header: &[u8], file_size: u64) -> Result<GmMetadata, String> {
    if header.len() != 5208 {
        return Err("Truncated GM1 header".into());
    }
    let word = |at| u32::from_le_bytes(header[at..at + 4].try_into().unwrap());
    let count = word(12);
    let kind = word(20);
    if count == 0
        || count > 100000
        || !(1..=7).contains(&kind)
        || 5208 + u64::from(count) * 24 + u64::from(word(80)) != file_size
    {
        return Err("Invalid GM1 header or file length".into());
    }
    Ok(GmMetadata {
        count,
        kind,
        palette: if kind == 2 {
            header[88..5208].to_vec()
        } else {
            vec![]
        },
    })
}

#[tauri::command]
pub async fn read_gm1_metadata(app_handle: AppHandle, path: String) -> Result<GmMetadata, String> {
    let allowed = get_allowed_path_with_string_error(&app_handle, &path)?.to_path_buf();
    tauri::async_runtime::spawn_blocking(move || {
        let mut file = File::open(allowed).map_err(|e| e.to_string())?;
        let size = file.metadata().map_err(|e| e.to_string())?.len();
        let mut header = [0u8; 5208];
        file.read_exact(&mut header).map_err(|e| e.to_string())?;
        parse_header(&header, size)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn reads_counts_and_palette_without_pixels() {
        let mut bytes = [0u8; 5208];
        bytes[12..16].copy_from_slice(&2u32.to_le_bytes());
        bytes[20..24].copy_from_slice(&2u32.to_le_bytes());
        bytes[80..84].copy_from_slice(&1000000u32.to_le_bytes());
        bytes[88] = 231;
        let result = parse_header(&bytes, 5208 + 48 + 1000000).unwrap();
        assert_eq!(result.count, 2);
        assert_eq!(result.palette[0], 231);
        assert!(parse_header(&bytes, 5208).is_err());
        assert!(parse_header(&bytes[..88], 5208).is_err());
    }
}
