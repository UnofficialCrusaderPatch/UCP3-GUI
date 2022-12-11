export const UCP_REPOS_USERNAME = 'ucp3-machine';
export const UCP3_REPOS_MACHINE_TOKEN =
  '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';

export const UCP3_REPO_URL = 'UnofficialCrusaderPatch/UnofficialCrusaderPatch3';
export const UCP3_REPO_URL_API = `https://api.github.com/repos/${UCP3_REPO_URL}`;

export const UCP_GUI_REPO_URL =
  'https://api.github.com/repos/UnofficialCrusaderPatch/UCP3-GUI/releases/tags/latest-tauri';

export const GITHUB_BASIC_AUTH = `Basic ${window.btoa(
  `${UCP_REPOS_USERNAME}:${UCP3_REPOS_MACHINE_TOKEN}`
)}`;

export const GITHUB_AUTH_HEADER = {
  headers: {
    Authorization: GITHUB_BASIC_AUTH,
  },
};
