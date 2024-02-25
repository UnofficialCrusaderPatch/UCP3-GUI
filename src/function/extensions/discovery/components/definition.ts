import yaml from 'yaml';
import { Definition } from '../../../../config/ucp/common';
import { ExtensionHandle } from '../../handles/extension-handle';
import {
  DefinitionMeta_1_0_0,
  parseDependencies,
} from '../definition-meta-version-1.0.0/parse-definition';
import { DEFINITION_FILE } from '../io';
import Logger from '../../../../util/scripts/logging';

const LOGGER = new Logger('discovery/definitions.ts');

export type ExtensionDefinitionValidationResult = {
  status: 'ok' | 'warning' | 'error';
  messages: string[];
  content?: Definition;
};
export const validateDefinition = async (eh: ExtensionHandle) => {
  const warnings: string[] = [];

  const inferredType =
    eh.path.indexOf('/modules/') !== -1 ? 'module' : 'plugin';
  const definition = yaml.parse(
    await eh.getTextContents(`${DEFINITION_FILE}`),
  ) as Definition;
  const { name, version } = definition;

  if (name === undefined || name === null) {
    const msg = `'name' missing in definition.yml of ${eh.path}`;
    LOGGER.msg(msg).error();

    return {
      status: 'error',
      messages: [msg],
      content: undefined,
    } as ExtensionDefinitionValidationResult;
  }

  if (version === undefined || version === null) {
    const msg = `'version' missing in definition.yml of ${eh.path}`;
    LOGGER.msg(msg).error();

    return {
      status: 'error',
      messages: [msg],
      content: undefined,
    } as ExtensionDefinitionValidationResult;
  }

  const { type } = definition;

  let assumedType = inferredType;
  if (type === undefined) {
    const warning = `"type: " was not found in definition.yml of ${name}-${version}. Extension was inferred to be a ${inferredType}`;
    LOGGER.msg(warning).warn();
  } else if (type !== inferredType) {
    const msg = `Extension type mismatch. Has a '${type}' (as found in definition.yml of ${name}-${version}) been placed in the folder for a ${inferredType}?`;
    LOGGER.msg(msg).error();

    return {
      status: 'error',
      messages: [msg],
      content: undefined,
    } as ExtensionDefinitionValidationResult;
  } else {
    assumedType = type;
  }

  const parsedDependencies = parseDependencies(
    definition as unknown as DefinitionMeta_1_0_0,
  );
  if (parsedDependencies.status !== 'ok') {
    return {
      status: 'error',
      messages: [
        `Dependencies definition of extension "${name}-${version}" is not an array of strings or a dictionary: ${JSON.stringify(
          definition.dependencies,
        )}`,
      ],
      content: undefined,
    } as ExtensionDefinitionValidationResult;
  }
  definition.dependencies = parsedDependencies.content;

  return {
    status: warnings.length === 0 ? 'ok' : 'warning',
    messages: warnings,
    content: { ...definition, type: assumedType } as Definition,
  } as ExtensionDefinitionValidationResult;
};
