/* eslint-disable */

// TODO: It is currently possible to see TAURI functions if the global inject is activated.
// They seem to never resolve, though. Check the tauri.conf.

const DONE_EVENT_NAME = "INIT_DONE";

let HOST_FUNCTIONS;

async function replaceAllLocalizeTextMarkers() {
  const markerRegex = /^{{(?<id>.+)}}$/;

  const walk = document.createTreeWalker(
    document.querySelector('html'),
    NodeFilter.SHOW_TEXT
  );
  let textNode;
  while ((textNode = walk.nextNode())) {
    const found = textNode.data.match(markerRegex);
    const id = found?.groups?.id;

    if (!id) {
      continue;
    }
    const text = await HOST_FUNCTIONS.receiveLocalizedString(id);
    if (!text) {
      continue;
    }
    textNode.data = text;
  }
}

// hooks load later, so init logic needs to be postponed
addEventListener("load", async () => {
  // wait until methods ready
  await Websandbox.connection.remoteMethodsWaitPromise;
  HOST_FUNCTIONS = Websandbox.connection.remote;

  await replaceAllLocalizeTextMarkers();

  dispatchEvent(new Event(DONE_EVENT_NAME));
}, { once: true });

/* ************* */
/* Custom Script */
/* ************* */
