import {
  ConfigMetaContent,
  ConfigMetaContentDB,
  ConfigMetaObject,
  ConfigMetaObjectDB,
} from 'config/ucp/config-merge/objects';
import { ExtensionsState } from 'function/global/types';

type ConfigurationDBBuildingResult = {
  status: number;
  state: ExtensionsState;
};

function buildExtensionConfigurationDB(extensionsState: ExtensionsState) {
  // ae has the order that the highest is the last added.
  const ae = [...extensionsState.activeExtensions];
  // So we reverse it
  ae.reverse();

  console.log('Activated extensions', ae);

  const db: ConfigMetaObjectDB = {};

  const errors: string[] = [];
  const warnings: string[] = [];

  ae.forEach((ext) => {
    Object.entries(ext.configEntries).forEach(([url, data]) => {
      const { contents } = data;

      let currentCMO = db[url];

      if (currentCMO === undefined) {
        currentCMO = { url, modifications: {} };
      }

      const m: ConfigMetaContentDB = {};

      Object.entries(contents).forEach(([k, v]) => {
        let truekey = k;
        let qualifier = 'required';
        if (k.startsWith('required-')) {
          // eslint-disable-next-line prefer-destructuring
          truekey = k.split('required-', 2)[1];
          qualifier = 'required';
        } else if (k.startsWith('suggested-')) {
          // eslint-disable-next-line prefer-destructuring
          truekey = k.split('suggested-', 2)[1];
          qualifier = 'suggested';
        }

        const currentM = currentCMO.modifications[truekey];
        if (currentM !== undefined) {
          if (currentM.qualifier === 'required' && qualifier === 'suggested') {
            const w = `Suggested value by extension ('${ext.name}') dropped because of a required value from previously activated extension ('${currentM.extension}')`;
            console.warn(w);
            warnings.push(w);
            return;
          }
          if (currentM.qualifier === 'suggested' && qualifier === 'suggested') {
            const w = `Suggested value by extension ('${currentM.extension}') overriden by suggested value from later activated extension ('${ext.name}')`;
            console.warn(w);
            warnings.push(w);
            return;
          }
          if (currentM.qualifier === 'suggested' && qualifier === 'required') {
            const w = `Suggested value by extension ('${currentM.extension}') overriden by required value from later activated extension ('${ext.name}')`;
            console.warn(w);
            warnings.push(w);
            return;
          }
          if (currentM.qualifier === 'required' && qualifier === 'required') {
            // TODO: remove this hack and replace it with a proper equality check
            if (JSON.stringify(currentM.content) !== JSON.stringify(v)) {
              const e = `Incompatible extension ('${ext.name}') and ('${currentM.extension}') because they both require different values for feature '${url}'`;
              console.warn(e);
              window.alert(e);
              errors.push(e);
              return;
            }
          }
        }

        m[truekey] = {
          extension: ext.name,
          content: v,
          qualifier,
        } as ConfigMetaContent;
      });

      // TODO: do conflict checking now!
      db[url] = {
        ...currentCMO,
        modifications: {
          ...currentCMO.modifications,
          ...m,
        },
      };
    });
  });

  let statusCode = 0;
  if (warnings.length > 0) {
    statusCode = 1;
  }
  if (errors.length > 0) {
    statusCode = 2;
  }

  return {
    status: {
      warnings,
      errors,
      code: statusCode,
    },

    state: {
      ...extensionsState,
      configuration: db,
    } as ExtensionsState,
  };
}

// eslint-disable-next-line import/prefer-default-export
export { buildExtensionConfigurationDB };
export type { ConfigurationDBBuildingResult };
