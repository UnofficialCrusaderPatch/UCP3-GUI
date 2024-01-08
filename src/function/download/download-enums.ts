export const UCP_REPOS_USERNAME = 'ucp3-machine';
export const UCP3_REPOS_MACHINE_TOKEN =
  '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';

export const UCP3_REPO_URL = 'UnofficialCrusaderPatch/UnofficialCrusaderPatch3';
export const UCP3_REPO_URL_API = `https://api.github.com/repos/${UCP3_REPO_URL}`;
export const UCP3_REPO_GIST_URL =
  'https://gist.githubusercontent.com/ucp3-machine/6a7c1de585ed6d60d9ce318c1825d9a7/raw/';

export const UCP_GUI_REPO_URL =
  'https://api.github.com/repos/UnofficialCrusaderPatch/UCP3-GUI/releases/tags/latest-tauri';

export const GITHUB_BASIC_AUTH = `Basic ${window.btoa(
  `${UCP_REPOS_USERNAME}:${UCP3_REPOS_MACHINE_TOKEN}`,
)}`;

export const GITHUB_AUTH_HEADER = {
  headers: {
    Authorization: GITHUB_BASIC_AUTH,
  },
};
