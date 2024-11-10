export type LaunchSettings = {
  gameDataPath: string;
  view: boolean;
  console: {
    show: boolean;
  };
  security: boolean;
  logLevel: {
    file: string;
    console: string;
  };
  customLaunchArguments: string;
  customEnvVariables: { [key: string]: string };
};
