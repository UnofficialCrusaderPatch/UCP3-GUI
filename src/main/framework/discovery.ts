import fs from 'fs';
import yaml from 'yaml';

export class Extension {
  name: string;

  version: string;

  type: string;

  folder: string;

  ui: object[];

  constructor(name: string, version: string, type: string, folder: string) {
    this.name = name;
    this.version = version;
    this.type = type;
    this.folder = folder;
    this.ui = [];
  }

  readUISpec(): void {
    if (fs.existsSync(`${this.folder}/ui.yml`)) {
      this.ui = yaml.parse(
        fs.readFileSync(`${this.folder}/ui.yml`, { encoding: 'utf-8' })
      );
    }
  }
}

const Discovery = {
  Extension,
  discoverExtensions: (gameFolder: string) => {
    const moduleDir = `${gameFolder}/ucp/modules`;
    const modDirEnts = fs.readdirSync(moduleDir, { withFileTypes: true });

    const pluginDir = `${gameFolder}/ucp/plugins`;
    const pluginDirEnts = fs.readdirSync(pluginDir, { withFileTypes: true });

    const dirEnts: fs.Dirent[] = [...modDirEnts, ...pluginDirEnts];

    return dirEnts
      .filter((d: fs.Dirent) => {
        return d.isDirectory();
      })
      .map((d: fs.Dirent) => {
        const type = modDirEnts.indexOf(d) === -1 ? 'plugin' : 'module';

        const folder =
          type === 'module'
            ? `${gameFolder}/ucp/modules/${d.name}`
            : `${gameFolder}/ucp/plugins/${d.name}`;

        const def = yaml.parse(
          fs.readFileSync(`${folder}/definition.yml`, { encoding: 'utf-8' })
        );
        const { name, version } = def;

        const ext = new Extension(name, version, type, folder);
        ext.readUISpec();
        return ext;
      });
  },
};

export { Discovery };
