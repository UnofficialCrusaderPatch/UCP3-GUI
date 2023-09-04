/** 
Logic:

0. All extensions can define options: booleans, strings, choices, numeric ranges, filepaths.
   All extensions can also set options of other extensions (dependency) which only happens if the extension is activated.
1. For all extensions that define options, there are default values
2. These default values are gathered to build a basis. No distinction is made between activated and deactivated extensions. This is called the default config. Extensions are implicitly switched off.
3. A user can now configure the following things: activate extensions, set options to values.
4. Activating extensions will mean that the config demands of that extension are applied, and dependencies are activated as well (and their config demands as well). This happens in a bottom up order (furthest dependency first).
5. When extensions or users set options to values, a check should be applied whether they are the right type and in the right range. And within a required range. If outside a suggested range, a warning should be generated.



Formalization:

1. Every option has a url, which functions as a unique key.
2. Every option has a value type: bool, int, double, string, filepath, list<bool|int|double|string|filepath>
3. Every option has a default value (as stated by the options creator, usually the same as the game's original value)
4. Every option has a valid value range: true/false, min/max/step/accuracy
5. Every option has a user value, set as a custom value by the user.
6. Every option has an array of definitions set by other extensions, which are:
7. A required value or a suggested value.
8. A required range and/or a suggested range, optionally combined with a suggested value.
9. If an extension is activated that sets demands on an option, there is a check whether it is possible. Sometimes that depends on the order of applied extensions. This order is reflected in the array.



Formalization of config order:
1. To add an extension to the config it is added to the order variable of the config.
2. Then, the demanded configuration is reflected in the config by adding all the demanded configuration to the array of every option identified by key/url.
3. To remove the extension, the demanded configuration is unreflected by removing all demanded configuration from every option.


Option object:
```yaml
- name: test123
  type: integer
  display: Checkbox
  url: feature1.test123
  value:
    default: 20
    range:
      min: 0
      max: 100
- name: whatever
  type: choices
  display: Dropdown
  url: feature2.whatever
  value:
    default: B
	choices:
	- A
	- B
	- C
- name: mapFolders
  type: set
  display: ListOfFoldersView
  url: feature3.theFolders
  value:
    default:
	- "maps/"
  
```

Config object:
```yaml
modules:
  module1:
	version: >= 0.0.1
    options:
	  feature1:
	    test123:
	  	  value: 
	  	    suggested-value: 15
	  	    required-range:
	  		  min: 10
	  		  max: 20
	  feature2:
	    whatever:
	  	  value:
	  	    required-values: [B, C]
	  feature3:
	    theFolders:
	  	  value:
	  	    required-values: ["maps/"]
	  	    required-exclusive: true
	  	    required-inclusive: true
			  
```
*/

type ConfigEntryContents = {
  // TODO: is the default value required or suggested? I would prefer required
  value: undefined;
  'required-value': unknown;
  'suggested-value': unknown;
  'required-min': number;
  'required-max': number;
  'suggested-min': number;
  'suggested-max': number;

  // These are fancy extras for set manipulations. Simplify?
  'suggested-values': unknown[];
  'required-values': unknown[];
  'required-inclusive': boolean;
  'required-exclusive': boolean;
  'suggested-inclusive': boolean;
  'suggested-exclusive': boolean;
};

type ConfigEntry = {
  contents: ConfigEntryContents;
  // 'all-else': boolean;
  // name: string;
  // url: string;
};

type ConfigFileExtensionEntry = {
  [key: string]: unknown;
};

type ConfigFile = {
  'specification-version': string;
  'config-sparse': {
    modules: {
      [key: string]: {
        config: ConfigFileExtensionEntry;
      };
    };
    plugins: {
      [key: string]: {
        config: ConfigFileExtensionEntry;
      };
    };
    'load-order': string[];
  };
};

type OptionEntry = {
  name: string;
  text: string;
  tooltip: string;
  display: string;
  url: string;
  contents: {
    value: unknown;
    type: string;
    default: unknown;
    choices: unknown[];
    min: unknown;
    max: unknown;
  };
  hidden: boolean;
  category: string[];
};

type Definition = {
  name: string;
  version: string;
  author: [] | string;
  dependencies: string[];
  'display-name': string;
  description: string;
};

type PluginType = 'plugin';
type ModuleType = 'module';
type ExtensionType = PluginType | ModuleType;

type Extension = {
  'specification-version': string;
  name: string;
  type: ExtensionType;
  version: string;
  definition: Definition;
  ui: { [key: string]: unknown }[];
  config: ConfigFile;
  path: string;
  configEntries: { [key: string]: ConfigEntry };
  optionEntries: { [key: string]: OptionEntry };
};

type Configs = { [key: string]: ConfigEntry }[];

type PermissionStatus = { status: string; reason: string; by: string };

type BasicContents = {
  value: unknown;
  type: string;
};

type ChoiceContents = BasicContents & {
  choices: { name: string; text: string; enabled: string; subtext: string }[];
};

type NumberContents = BasicContents & {
  min: number;
  max: number;
  step: number;
};

type DisplayConfigElement = {
  name: string;
  description: string;
  header: string;
  text: string;
  display: string;
  children: DisplayConfigElement[];
  url: string;
  columns: number;
  tooltip: string;
  enabled: string;
  contents: BasicContents | ChoiceContents | NumberContents;
};

type SectionDescription = {
  elements: DisplayConfigElement[];
  sections: { [key: string]: SectionDescription };
};

export type {
  ConfigEntry,
  ConfigFile,
  ConfigFileExtensionEntry,
  Configs,
  Definition,
  Extension,
  OptionEntry,
  PermissionStatus,
  DisplayConfigElement,
  SectionDescription,
  NumberContents,
  ChoiceContents,
  BasicContents,
  ConfigEntryContents,
  PluginType,
  ModuleType,
  ExtensionType,
};
