import { ConfigMetaObjectDB } from '../../config/ucp/config-merge/objects';

export type Warning = {
  text: string;
  level: 'error' | 'warning' | 'info';
};

export type UIDefinition = {
  flat: object[];
  hierarchical: { elements: object[]; sections: { [key: string]: object } };
};

export type ConfigurationState = {
  state: ConfigMetaObjectDB;
  warnings: string[];
  errors: string[];
  statusCode: number;
};
