import { Extension } from '../../config/ucp/common';
import { Qualifier } from '../../config/ucp/config-merge/objects';

export type UserOverrideEntity = {
  type: 'user';
  name: string;
  value: unknown;
  url: string;
  qualifier: Qualifier;
};

export type ExtensionOverrideEntity = {
  type: 'extension';
  name: string;
  entity: Extension;
  value: unknown;
  url: string;
  qualifier: Qualifier;
};

export type Override = {
  overridden: UserOverrideEntity | ExtensionOverrideEntity;
  overriding: UserOverrideEntity | ExtensionOverrideEntity;
};
