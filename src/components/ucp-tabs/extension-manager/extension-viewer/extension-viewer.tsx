import { atom, useAtomValue } from 'jotai';
import { useMemo } from 'react';
import { loadable } from 'jotai/utils';
import { SaferMarkdown } from '../../../markdown/safer-markdown';
import { Extension } from '../../../../config/ucp/common';
import { OverlayContentProps } from '../../../overlay/overlay';
import Message from '../../../general/message';
import { EXTENSION_STATE_REDUCER_ATOM } from '../../../../function/extensions/state/state';
import { extensionToID } from '../../../../function/extensions/dependency-management/dependency-resolution';

export type ExtensionViewerProps = {
  extension: Extension;
};

export function ExtensionViewer(
  props: OverlayContentProps<ExtensionViewerProps>,
) {
  const { args, closeFunc } = props;
  const { extension } = args;

  const contentAtom = useMemo(
    () => loadable(atom(async () => extension.io.fetchDescription())),
    [extension],
  );

  const content = useAtomValue(contentAtom);
  const { tree, activeExtensions } = useAtomValue(EXTENSION_STATE_REDUCER_ATOM);
  const activeIDs = activeExtensions.map(extensionToID);
  const dependents = tree.extensionsById[extensionToID(extension)]
    ? tree
        .reverseExtensionDependenciesFor(extension)
        .filter((ext) => activeIDs.includes(extensionToID(ext)))
    : undefined;

  return (
    <div className="credits-container">
      <h1 className="credits-title">
        <Message message="extensions.viewer" />
      </h1>
      <div className="parchment-box credits-text-box">
        <div className="credits-text">
          {dependents && dependents.length > 0 ? (
            <details className="mb-2" style={{ overflowWrap: 'anywhere' }}>
              <summary>
                <Message
                  message={{
                    key:
                      dependents.length === 1
                        ? 'extensions.viewer.required.by.one'
                        : 'extensions.viewer.required.by',
                    args: { count: dependents.length },
                  }}
                />
              </summary>
              <ul className="mb-0">
                {dependents.map((ext) => (
                  <li key={extensionToID(ext)}>
                    {ext.definition['display-name'] || ext.name} ({ext.version})
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
          <SaferMarkdown>
            {content.state === 'hasData' ? content.data : ''}
          </SaferMarkdown>
        </div>
      </div>
      <button
        type="button"
        className="credits-close credits-close-button"
        onClick={closeFunc}
      >
        <Message message="close" />
      </button>
    </div>
  );
}
