import { atom, useAtomValue } from 'jotai';
import { useMemo } from 'react';
import { loadable } from 'jotai/utils';
import { SaferMarkdown } from '../../../markdown/safer-markdown';
import { Extension } from '../../../../config/ucp/common';
import { OverlayContentProps } from '../../../overlay/overlay';
import Message from '../../../general/message';
import { EXTENSION_STATE_REDUCER_ATOM } from '../../../../function/extensions/state/state';
import { extensionToID } from '../../../../function/extensions/dependency-management/dependency-resolution';
import ExtensionRelations from './extension-relations';
import { CONTENT_STORE_ATOM } from '../../content-manager/state/atoms';
import githubRepositoryUrl from '../../../../function/content/store/repository';

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
  const store = useAtomValue(CONTENT_STORE_ATOM);
  const matchingStorePackage = store.data?.extensions.list.find(
    (entry) =>
      entry.definition.name === extension.name &&
      entry.definition.version === extension.version,
  );
  const repository = githubRepositoryUrl(matchingStorePackage?.contents.source);

  return (
    <div className="credits-container">
      <h1 className="credits-title">
        <Message message="extensions.viewer" />
      </h1>
      <div className="parchment-box credits-text-box">
        <div className="credits-text extension-description">
          {repository && (
            <a
              className="extension-repository"
              href={repository}
              target="_blank"
              rel="noreferrer"
            >
              {repository.slice('https://'.length)}
            </a>
          )}
          <ExtensionRelations
            key={extensionToID(extension)}
            extension={extension}
            tree={tree}
            activeExtensions={activeExtensions}
          />
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
