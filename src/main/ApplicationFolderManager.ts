const fs = require('fs');

const baseFolder = `${process.env.APPDATA}/UnofficialCrusaderPatch3/`;
if (!fs.existsSync(baseFolder)) {
  fs.mkdirSync(baseFolder);
}

const versionsFolder = `${baseFolder}ucp3-versions/`;
if (!fs.existsSync(versionsFolder)) {
  fs.mkdirSync(versionsFolder);
}

function storeUCP3Zip(data: Blob, versionedFileName: string) {
  fs.writeFileSync(`${versionsFolder}${versionedFileName}`, data);
}
