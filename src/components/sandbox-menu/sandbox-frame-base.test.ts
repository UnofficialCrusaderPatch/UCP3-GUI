import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it } from 'vitest';

const sandboxFrameBase = readFileSync(
  'src/components/sandbox-menu/sandbox-frame-base.js',
  'utf8',
);

it('publishes the qualifier getter before async module initialization and keeps a legacy fallback', async () => {
  let onLoad: () => Promise<void> = async () => {};
  let api: Record<string, () => unknown> = {};
  let advertised: string[] = [];
  const context = {
    addEventListener: (_event: string, listener: typeof onLoad) => {
      onLoad = listener;
    },
    window: { addEventListener: () => {} },
    document: { createTreeWalker: () => ({ nextNode: () => null }) },
    NodeFilter: { SHOW_TEXT: 4, SHOW_ELEMENT: 1 },
    Event: class {},
    dispatchEvent: () => {},
    Websandbox: {
      connection: {
        remoteMethodsWaitPromise: Promise.resolve(),
        remote: { confirmInit: async () => {} },
        setLocalApi: (value: typeof api) => {
          // Websandbox advertises a snapshot of names, retaining the API object.
          advertised = Object.keys(value);
          api = value;
        },
      },
    },
  };
  runInNewContext(sandboxFrameBase, context);
  await onLoad();
  expect(advertised).toContain('getConfigQualifiers');
  expect(api.getConfigQualifiers()).toEqual({});
  // Module data finishes loading after the interface has already been advertised.
  runInNewContext(
    "SANDBOX_FUNCTIONS.getConfigQualifiers = () => ({'ai.rat.aic': 'required'});",
    context,
  );
  expect(api.getConfigQualifiers()).toEqual({ 'ai.rat.aic': 'required' });
});
