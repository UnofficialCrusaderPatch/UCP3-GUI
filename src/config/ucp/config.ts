import { ConfigEntry, OptionEntry, Extension } from './common';
import { isValuePermitted } from './value-permissions';
import './extension-permissions';

function collectOptions(
  collection: { [key: string]: unknown },
  obj: { [key: string]: unknown },
  extensionName: string
) {
  if (typeof obj === 'object') {
    if (obj.url !== undefined) {
      const oeObj = obj as OptionEntry;
      if (collection[oeObj.url] !== undefined) {
        throw new Error(`url already has a value: ${oeObj.url}`);
      }
      let colURL = oeObj.url;
      if (colURL.indexOf(`${extensionName}.`) !== 0) {
        colURL = `${extensionName}.${colURL}`;
      }
      // eslint-disable-next-line no-param-reassign
      collection[colURL] = obj;
    } else {
      Object.keys(obj).forEach((key: string) => {
        collectOptions(
          collection,
          obj[key] as { [key: string]: unknown },
          extensionName
        );
      });
    }
  }
}

/**
 * Expects
 *
 * @param collection
 * @param obj
 * @param url
 */
function collectConfigs(
  collection: { [key: string]: unknown },
  obj: { value: unknown; [key: string]: unknown },
  url: string
) {
  if (obj !== null && obj !== undefined && typeof obj === 'object') {
    if (obj.value !== undefined) {
      if (collection[url] !== undefined) {
        throw new Error(`url already has a value: ${url}`);
      }
      // eslint-disable-next-line no-param-reassign
      collection[url] = obj;
    } else {
      Object.keys(obj).forEach((key) => {
        let newUrl = url;
        if (newUrl === undefined) newUrl = '';
        if (newUrl !== '') {
          newUrl += '.';
        }
        newUrl += key;
        collectConfigs(
          collection,
          obj[key] as { value: unknown; [key: string]: unknown },
          newUrl
        );
      });
    }
  }
}

function collectDependencies(extension: {
  config: {
    modules: { [key: string]: { active: boolean; version: string } };
    plugins: { [key: string]: { active: boolean; version: string } };
  };
}) {
  const dependencies: { name: string; version: string }[] = [];
  Object.keys(extension.config.modules).forEach((module: string) => {
    if (extension.config.modules[module].active === true) {
      dependencies.push({
        name: module,
        version: extension.config.modules[module].version,
      });
    }
  });
  Object.keys(extension.config.plugins).forEach((plugin: string) => {
    if (extension.config.plugins[plugin].active === true) {
      dependencies.push({
        name: plugin,
        version: extension.config.plugins[plugin].version,
      });
    }
  });
}

class Config {
  extensions: { [key: string]: Extension };

  // This can go if extension focused approach is chosen;
  specs: { [key: string]: OptionEntry };

  rawConfigs: [];

  // This can go if extension focused approach is chosen;
  configs: { [key: string]: { [key: string]: ConfigEntry } };

  userValues: { [key: string]: unknown };

  activeExtensionNames: string[];

  requiredExtensionNames: string[];

  constructor() {
    this.extensions = {};
    this.specs = {};
    this.rawConfigs = [];
    this.configs = {};
    this.userValues = {};
    this.activeExtensionNames = [];
    this.requiredExtensionNames = [];
  }

  // Sets the default basis
  parse(extensions: Extension[]) {
    extensions.forEach((ext: Extension) => {
      const { name, ui } = ext;

      const optionsCollection: { [key: string]: OptionEntry } = {};
      collectOptions(
        optionsCollection,
        ui as unknown as { [key: string]: unknown },
        name
      );
      Object.keys(optionsCollection).forEach((key) => {
        const k = `${name}.${key}`;
        this.specs[k] = optionsCollection[key];
      });

      const processedOptions: { [key: string]: ConfigEntry } = {};

      // WARNING: deprecated code
      // collectConfigs(
      //   processedOptions,
      //   ext.config.modules as { value: unknown; [key: string]: unknown },
      //   ''
      // );
      // collectConfigs(
      //   processedOptions,
      //   ext.config.plugins as { value: unknown; [key: string]: unknown },
      //   ''
      // );

      if (this.extensions[name] !== undefined) {
        // Multiple versions detected of same extension, allow?
        throw new Error(`extension already loaded: ${name}`);
      }

      // this.configs[def.name] = processedOptions;
      // TODO propagate this new system throughout this file :)
      this.extensions[name] = {
        ...ext,
        configEntries: processedOptions,
        optionEntries: optionsCollection,
      };
    });

    return this;
  }

  // I am getting confused on which level this Config class operates.
  // Is spec still for a single exension that provides options?
  // Cause the this.configs variable is meant to contain configs that are relevant for a certain spec, right?
  activeExtensions() {
    return this.activeExtensionNames.map((ext) => this.extensions[ext]);
  }

  activeConfigs() {
    return this.activeExtensionNames.map(
      (ext) => this.extensions[ext].configEntries
    );
  }

  activateExtension(name: string) {
    if (this.activeExtensionNames.indexOf(name) !== -1) {
      throw new Error(`extension already active: ${name}`);
    }

    const ext = this.extensions[name];
    if (ext === undefined) throw new Error(`extension does not exist: ${name}`);

    // TODO: return all conflicts?
    // eslint-disable-next-line no-restricted-syntax
    for (const ce of Object.keys(ext.configEntries)) {
      const configEntry = ext.configEntries[ce];
      const specName = ce.split('.')[0];
      const spec = this.extensions[specName].optionEntries[ce];

      if (configEntry.contents['required-value'] !== undefined) {
        const p = isValuePermitted(
          configEntry.contents['required-value'],
          spec,
          this.activeExtensions()
        );
        if (p.status !== 'OK') {
          return {
            status: 'CONFLICT',
            reason: `required value (for "${ce}") by ${name} conflicts with specifications of ${p.by}`,
            by: p.by,
          };
        }
      }

      if (configEntry.contents['required-values'] !== undefined) {
        const p = isValuePermitted(
          configEntry.contents['required-values'],
          spec,
          this.activeExtensions()
        );
        if (p.status !== 'OK') {
          return {
            status: 'CONFLICT',
            reason: `required values (for "${ce}") by ${name} conflicts with specifications of ${p.by}`,
            by: p.by,
          };
        }
      }
    }

    this.activeExtensionNames.push(ext.name);

    // If dependencies are required, return status DEPENDENCY I guess, and return which packages need to be added

    return {
      status: 'OK',
      effects: [],
      order: [],
    };
  }

  getValue(url: string) {
    const extensionName = url.split('.')[0];

    if (this.userValues[url] !== undefined) {
      return this.userValues[url];
    }
    // eslint-disable-next-line no-restricted-syntax
    for (const config of this.activeExtensionNames.map(
      (ae) => this.extensions[ae].configEntries
    )) {
      if (config[url] !== undefined) {
        if (config[url].contents !== undefined) {
          const requiredValue = config[url].contents['required-value'];
          const requiredValues = config[url].contents['required-values'];
          const suggestedValue = config[url].contents['suggested-value'];
          const suggestedValues = config[url].contents['suggested-values'];

          if (requiredValue !== undefined) {
            return requiredValue;
          }
          if (requiredValues !== undefined) {
            return requiredValues;
          }
          if (suggestedValue !== undefined) {
            return suggestedValue;
          }
          if (suggestedValues !== undefined) {
            return suggestedValues;
          }
        }
      }
    }
    const spec = this.extensions[extensionName].optionEntries[url];
    if (spec === undefined) {
      throw new Error(`url does not exist: ${url}`);
    }
    return spec.contents.value;
  }

  setValue(url: string, value: unknown) {
    this.userValues[url] = value;
  }

  trySetValue(url: string, value: unknown) {
    if (this.specs[url] === undefined) {
      throw new Error(`url does not exist: ${url}`);
    }
    const check = isValuePermitted(
      value,
      this.specs[url],
      this.activeExtensions()
    );
    if (check.status === 'OK') {
      this.setValue(url, value);
    }
    return check;
  }

  checkIsValuePermitted(url: string, value: unknown) {
    return isValuePermitted(value, this.specs[url], this.activeExtensions());
  }
}

export { Config, collectConfigs, collectOptions, collectDependencies };
