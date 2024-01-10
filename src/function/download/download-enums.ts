export const UCP_REPOS_USERNAME = 'ucp3-machine';

export const UCP3_REPO_URL = 'UnofficialCrusaderPatch/UnofficialCrusaderPatch3';
export const UCP3_REPO_URL_API = `https://api.github.com/repos/${UCP3_REPO_URL}`;
export const UCP3_REPO_GIST_URL =
  'https://gist.githubusercontent.com/ucp3-machine/6a7c1de585ed6d60d9ce318c1825d9a7/raw/';

export const UCP_GUI_REPO_URL =
  'https://api.github.com/repos/UnofficialCrusaderPatch/UCP3-GUI/releases/tags/latest-tauri';

export const GITHUB_BASIC_AUTH = (token: string) =>
  `Basic ${window.btoa(`${UCP_REPOS_USERNAME}:${token}`)}`;

export const GITHUB_AUTH_HEADER = {
  headers: {
    Authorization: GITHUB_BASIC_AUTH,
  },
};
