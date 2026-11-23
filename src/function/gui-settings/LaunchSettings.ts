export type LaunchSettings = {
  gameDataPath: string;
  view: boolean;
  console: {
    show: boolean;
  };
  security: boolean;
  // Missing in settings saved by older GUI versions; treat as false
  allowMultipleInstances?: boolean;
  logLevel: {
    file: string;
    console: string;
  };
  customLaunchArguments: string;
  customEnvVariables: { [key: string]: string };
};
