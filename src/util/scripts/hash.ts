// needs to be used to get the window by identifier
// source: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest

import { getSha256OfFile } from '../../tauri/tauri-invoke';

// eslint-disable-next-line import/prefer-default-export
export async function getHexHashOfString(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message); // encode as (utf-8) Uint8Array
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8); // hash the message
  const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(''); // convert bytes to hex string
  return hashHex;
}

// uses sha256 of Rust backend
export async function getHexHashOfFile(path: string): Promise<string> {
  return getSha256OfFile(path);
}
