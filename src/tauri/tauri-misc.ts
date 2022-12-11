import {
  getName,
  getVersion,
  getTauriVersion as tauriGetTauriVersion,
} from '@tauri-apps/api/app';
import Option from 'util/structs/option';
import Result from 'util/structs/result';

export async function getAppName(): Promise<Option<string>> {
  return (await Result.tryAsync(getName)).ok();
}

export async function getAppVersion(): Promise<Option<string>> {
  return (await Result.tryAsync(getVersion)).ok();
}

export async function getTauriVersion(): Promise<Option<string>> {
  return (await Result.tryAsync(tauriGetTauriVersion)).ok();
}
