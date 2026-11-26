// v1: '@tauri-apps/api/shell'
import { Command as V2Command, open } from '@tauri-apps/plugin-shell';

export { open };

/** v1 allowed `new Command(name, args)`; v2 requires `Command.create`. */
export class Command {
  private readonly inner: V2Command<string>;

  constructor(program: string, args: string | string[] = []) {
    this.inner = V2Command.create(program, args);
  }

  execute() {
    return this.inner.execute();
  }
}
