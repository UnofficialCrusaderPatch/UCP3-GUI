import axios from 'axios';
import fs from 'fs';

const UCP3_REPO_URL = 'UnofficialCrusaderPatch/UnofficialCrusaderPatch3';
const UCP3_REPO_URL_API = `https://api.github.com/repos/${UCP3_REPO_URL}`;
const UCP3_REPOS_MACHINE_TOKEN = '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'; // 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

async function getLatestUCP3Artifacts() {
  const GITHUB_TOKEN_AUTH = JSON.parse(
    fs.readFileSync('git-secret.json', { encoding: 'utf-8' })
  ).auth;

  const result = await axios
    .get(`${UCP3_REPO_URL_API}/actions/artifacts`, {
      auth: { username: 'ucp3-machine', password: UCP3_REPOS_MACHINE_TOKEN },
    })
    .then((res: { data: { artifacts: unknown } }) => {
      console.log(res);
      return res.data.artifacts;
    })
    .catch((error: Error) => {
      console.error(error);
    });
  return result;
}

export { getLatestUCP3Artifacts, UCP3_REPO_URL_API };
