type BasicContentInstallationStatus = {
  name: string;
  version: string;
};
export type IdleContentInstallationStatus = BasicContentInstallationStatus & {
  action: 'idle';
};
export type DownloadContentInstallationStatus =
  BasicContentInstallationStatus & {
    action: 'download';
    progress: number;
    description?: string;
  };
export type InstallationContentInstallationStatus =
  BasicContentInstallationStatus & {
    action: 'install';
    progress: number;
    description?: string;
  };

export type UninstallationContentInstallationStatus =
  BasicContentInstallationStatus & {
    action: 'uninstall';
    progress: number;
    description?: string;
  };

export type ErrorContentInstallationStatus = BasicContentInstallationStatus & {
  action: 'error';
  message: string;
};

export type CompleteContentInstallationStatus =
  BasicContentInstallationStatus & {
    action: 'complete';
  };

export type ContentInstallationStatus =
  | IdleContentInstallationStatus
  | DownloadContentInstallationStatus
  | InstallationContentInstallationStatus
  | ErrorContentInstallationStatus
  | CompleteContentInstallationStatus
  | UninstallationContentInstallationStatus;
