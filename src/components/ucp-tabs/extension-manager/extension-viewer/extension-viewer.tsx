import { atom, useAtomValue } from 'jotai';
import { useMemo } from 'react';
import { loadable } from 'jotai/utils';
import { SaferMarkdown } from '../../../markdown/safer-markdown';
import { Extension } from '../../../../config/ucp/common';
import { OverlayContentProps } from '../../../overlay/overlay';
import Message from '../../../general/message';

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

  return (
    <div className="credits-container">
      <h1 className="credits-title">
        <Message message="extensions.viewer" />
      </h1>
      <div className="parchment-box credits-text-box">
        <div className="credits-text">
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
