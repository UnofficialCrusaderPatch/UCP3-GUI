import { ConfigEntry, OptionEntry, Extension, ConfigFile } from './common';
import { isValuePermitted } from './value-permissions';
import './extension-permissions';
import { readYAML } from './util';

const fs = require('fs');

function collectOptions(
  collection: { [key: string]: unknown },
  obj: { [key: string]: unknown }
) {
  if (typeof obj === 'object') {
    if (obj.url !== undefined) {
      const oeObj = obj as OptionEntry;
      if (collection[oeObj.url] !== undefined) {
        throw new Error(`url already has a value: ${oeObj.url}`);
      }
      collection[oeObj.url] = obj;
    } else {
      Object.keys(obj).forEach((key: string) => {
        collectOptions(collection, obj[key] as { [key: string]: unknown });
      });
    }
  }
}

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
  parse(folder: string) {
    fs.readdirSync(folder).forEach((subfolder: string) => {
      const extensionPath = `${folder}/${subfolder}`;
      const def = readYAML(`${extensionPath}/definition.yml`);

      const ui = readYAML(`${extensionPath}/ui.yml`);
      const optionsCollection: { [key: string]: OptionEntry } = {};
      collectOptions(optionsCollection, ui);
      Object.keys(optionsCollection).forEach((key) => {
        const k = `${def.name}.${key}`;
        this.specs[k] = optionsCollection[key];
      });

      let config: ConfigFile = { modules: {}, plugins: {}, order: [] };
      const processedOptions: { [key: string]: ConfigEntry } = {};

      const configFilePath = `${extensionPath}/config.yml`;
      if (fs.exists(configFilePath)) {
        config = readYAML(configFilePath);
        // const { modules } = config;
        // const { plugins } = config;
        // const { order } = config;

        // this.activeExtensionNames[def.name] = false;

        collectConfigs(
          processedOptions,
          config.modules as { value: unknown; [key: string]: unknown },
          ''
        );
        collectConfigs(
          processedOptions,
          config.plugins as { value: unknown; [key: string]: unknown },
          ''
        );
        // processedOptions.name = def.name; // This is a bit unorthodox.
        this.configs[def.name] = processedOptions;
      }

      if (this.extensions[def.name] !== undefined) {
        // Multiple versions detected of same extension, allow?
        throw new Error(`extension already loaded: ${def.name}`);
      }

      // TODO propagate this new system throughout this file :)
      this.extensions[def.name] = {
        name: def.name,
        ui,
        def,
        config,
        path: extensionPath,
        configEntries: processedOptions,
        optionEntries: optionsCollection,
        type: folder.endsWith('modules') ? 'modules' : 'plugins',
      };
    });
  }

  // I am getting confused on which level this Config class operates.
  // Is spec still for a single exension that provides options?
  // Cause the this.configs variable is meant to contain configs that are relevant for a certain spec, right?
  activeExtensions() {
    return this.activeExtensionNames.map((ext) => this.configs[ext]);
  }

  activeConfigs() {
    return this.activeExtensionNames.map((ext) => this.configs[ext]);
  }

  activateExtension(name: string) {
    if (this.activeExtensionNames.indexOf(name) !== -1) {
      throw new Error(`extension already active: ${name}`);
    }

    const ext = this.extensions[name];
    if (ext === undefined) throw new Error(`extension does not exist: ${name}`);

    Object.keys(ext.configEntries).forEach((ce) => {
      const configEntry = ext.configEntries[ce];
      const specName = ce.split('.')[0];
      const spec = this.extensions[specName].optionEntries[ce];

      if (configEntry.value['required-value'] !== undefined) {
        const p = isValuePermitted(
          configEntry.value['required-value'],
          spec,
          this.activeExtensions()
        );
        if (p.status !== 'OK') {
          return {
            status: 'CONFLICT',
            reason: `required value (for "${ce}") by ${name} conflicts with specifications of ${p.by}`,
          };
        }
      }

      if (configEntry.value['required-values'] !== undefined) {
        const p = isValuePermitted(
          configEntry.value['required-values'],
          spec,
          this.activeExtensions()
        );
        if (p.status !== 'OK') {
          return {
            status: 'CONFLICT',
            reason: `required values (for "${ce}") by ${name} conflicts with specifications of ${p.by}`,
          };
        }
      }

      return undefined;
    });

    return {
      status: 'OK',
      effects: ['REQUIRE dependencyX'],
      order: [],
    };
  }

  getValue(url: string) {
    if (this.userValues[url] !== undefined) {
      return this.userValues[url];
    }
    // eslint-disable-next-line no-restricted-syntax
    for (const config of this.activeExtensionNames.map(
      (ae) => this.configs[ae]
    )) {
      if (config[url] !== undefined) {
        if (config[url].value !== undefined) {
          const requiredValue = config[url].value['required-value'];
          const requiredValues = config[url].value['required-values'];
          const suggestedValue = config[url].value['suggested-value'];
          const suggestedValues = config[url].value['suggested-values'];

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
    const spec = this.specs[url];
    if (spec === undefined) {
      throw new Error(`url does not exist: ${url}`);
    }
    return spec.value.default;
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
      this.activeConfigs()
    );
    if (check.status === 'OK') {
      this.setValue(url, value);
    }
    return check;
  }

  checkIsValuePermitted(url: string, value: unknown) {
    return isValuePermitted(value, this.specs[url], this.activeConfigs());
  }
}

export { Config, collectConfigs, collectOptions, collectDependencies };
