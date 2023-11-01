/* eslint-disable */
/* eslint-enable prettier/prettier */

// TODO: It is currently possible to see TAURI functions if the global inject is activated.
// They seem to never resolve, though. Check the tauri.conf.

const DONE_EVENT_NAME = 'INIT_DONE';

// need to be provided in this object by the script provider
const SANDBOX_FUNCTIONS = { getConfig: () => null };

let HOST_FUNCTIONS;

async function replaceAllLocalizeTextMarkers(startNode) {
  const walk = document.createTreeWalker(startNode, NodeFilter.SHOW_TEXT);
  let textNode;
  while ((textNode = walk.nextNode())) {
    const found = textNode.data.match(/^{{(?<id>.+)}}$/);
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

// hooks load later, so init logic needs to be postponed
addEventListener(
  'load',
  async () => {
    // wait until methods ready
    await Websandbox.connection.remoteMethodsWaitPromise;
    HOST_FUNCTIONS = Websandbox.connection.remote;

    await replaceAllLocalizeTextMarkers(document.querySelector('html'));

    dispatchEvent(new Event(DONE_EVENT_NAME));
    Websandbox.connection.setLocalApi(SANDBOX_FUNCTIONS);

    await HOST_FUNCTIONS.confirmInit();
  },
  { once: true }
);

/* ************* */
/* Custom Script */
/* ************* */
