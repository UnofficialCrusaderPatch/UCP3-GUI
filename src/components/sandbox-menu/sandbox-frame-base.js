/* eslint-disable */
/* eslint-enable prettier/prettier */

// TODO: It is currently possible to see TAURI functions if the global inject is activated.
// They seem to never resolve, though. Check the tauri.conf.

const DONE_EVENT_NAME = 'INIT_DONE';

// need to be provided in this object by the script provider
const SANDBOX_FUNCTIONS = { getConfig: () => {} };

const HOST_FUNCTIONS = {};

async function replaceAllLocalizeTextMarkers(startNode) {
  const idRegex = /^\s*{{(?<id>.+)}}\s*$/;
  const walk = document.createTreeWalker(startNode, NodeFilter.SHOW_TEXT);
  let textNode;
  while ((textNode = walk.nextNode())) {
    const found = textNode.data.match(idRegex);
    const id = found?.groups?.id;

    if (!id) {
      continue;
    }
    const text = await HOST_FUNCTIONS.getLocalizedString(id);
    if (!text) {
      continue;
    }
    textNode.data = text;
  }
}

async function replaceAllAssetUrlMarkers(startNode) {
  const idRegex = /^\s*asset:{{(?<path>.+)}}\s*$/;
  const walk = document.createTreeWalker(startNode, NodeFilter.SHOW_ELEMENT);
  let elementNode;
  while ((elementNode = walk.nextNode())) {
    for (const attr of elementNode.attributes) {
      const found = attr.value?.match(idRegex);
      const path = found?.groups?.path;

      if (!path) {
        continue;
      }
      const url = await HOST_FUNCTIONS.getAssetUrl(path);
      if (!url) {
        continue;
      }
      attr.value = url;
    }
  }
}

// hooks load later, so init logic needs to be postponed
addEventListener(
  'load',
  async () => {
    // wait until methods ready
    await Websandbox.connection.remoteMethodsWaitPromise;
    Object.assign(HOST_FUNCTIONS, Websandbox.connection.remote);

    await replaceAllLocalizeTextMarkers(document);
    await replaceAllAssetUrlMarkers(document);

    dispatchEvent(new Event(DONE_EVENT_NAME));
    Websandbox.connection.setLocalApi(SANDBOX_FUNCTIONS);

    await HOST_FUNCTIONS.confirmInit();
  },
  { once: true },
);

/* ************* */
/* Custom Script */
/* ************* */
