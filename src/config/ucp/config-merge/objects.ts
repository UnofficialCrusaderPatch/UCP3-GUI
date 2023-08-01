type ValueDefinition = {
  content: unknown;
  qualifier: 'required' | 'suggested' | 'unspecified';
  entity: string; // "user" or an extension that sets the value.
};

type UserValueDB = {
  [url: string]: ValueDefinition;
};

// Can be reduced to ValueDefinition but that ruins documentation? :)
// Premature optimization is the root of all evil.
type ConfigMetaContent = {
  // The extension that specified this meta content
  // Only the last extension is retained if multiple extensions have non-conflictual settings.
  extension: string;

  // The original value specified by the option definition is 'suggested' for 'value', but 'min' & 'max' are required.
  qualifier: 'required' | 'suggested' | 'unspecified';
  content: unknown;
};

// Attached to a OptionEntry, or separate mapping with url based dictionary.
type ConfigMetaObject = {
  // The url of the option that this meta info is about
  url: string;

  //
  modifications: {
    // e.g. value, min, max
    [key: string]: ConfigMetaContent;
  };
};

type ConfigMetaObjectDB = {
  [url: string]: ConfigMetaObject;
};

type Config = { value: unknown } & {
  [url: string]: unknown;
};

type ConfigDB = {
  [url: string]: Config;
};

// Usage
// cmos: ConfigMetaObjectDB = {};
// cmo = cmos[url];
// value = cmo.modifications.value.content;
// min = cmo.modifications.min.content;
// max = cmo.modifications.max.content;

// For user level suggestions, requirements

export type {
  ConfigMetaObject,
  ConfigMetaContent,
  ConfigMetaObjectDB,
  UserValueDB,
  ValueDefinition,
  ConfigDB,
  Config,
};
