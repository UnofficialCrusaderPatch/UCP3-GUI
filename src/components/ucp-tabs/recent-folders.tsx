/* eslint-disable jsx-a11y/interactive-supports-focus */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import { useCurrentGameFolder } from 'components/general/hooks';
import { useRecentFolders } from 'components/general/swr-hooks';
import { RecentFolderHelper } from 'config/gui/recent-folder-helper';
import { createEditorWindow } from 'function/window-actions';
import { MouseEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { openFolderDialog } from 'tauri/tauri-dialog';
import { useSearchParamsCustom } from 'util/scripts/hooks';
import Result from 'util/structs/result';

import './recent-folders.css';

export default function RecentFolders() {
  const [, setSearchParams] = useSearchParamsCustom();
  const currentFolder = useCurrentGameFolder();
  const [recentFolderResult] = useRecentFolders();

  // lang
  const [t] = useTranslation(['gui-general', 'gui-landing']);

  const recentFolderHelper = recentFolderResult
    .getOrReceive(Result.emptyErr)
    .ok()
    .getOrElse(null as unknown as RecentFolderHelper);

  const updateCurrentFolderSelectState = (folder: string) => {
    recentFolderHelper.addToRecentFolders(folder);
    setSearchParams({ directory: folder });
  };

  const onClickUpdateRecentFolder = (event: MouseEvent<HTMLDivElement>) => {
    const inputTarget = event.target as HTMLDivElement;
    if (inputTarget.textContent) {
      updateCurrentFolderSelectState(inputTarget.textContent as string);
    }
  };

  useEffect(() => {
    if (recentFolderResult.isEmpty()) {
      return;
    }

    // set initial state
    if (currentFolder === '' && recentFolderHelper?.getMostRecentGameFolder()) {
      updateCurrentFolderSelectState(
        recentFolderHelper.getMostRecentGameFolder()
      );
    }
  });

  // needs better loading site
  if (recentFolderResult.isEmpty()) {
    return <p>{t('gui-general:loading')}</p>;
  }

  return (
    <>
      <div className="mb-5">
        <label htmlFor="browseresult">{t('gui-landing:select.folder')}</label>
        <div className="d-flex mt-2">
          <div className="textInput">
            <input
              id="browseresult"
              type="text"
              className="form-control"
              readOnly
              role="button"
              onClick={async () =>
                (await openFolderDialog(currentFolder)).ifPresent(
                  updateCurrentFolderSelectState
                )
              }
              value={currentFolder}
            />
          </div>
          <button
            id="launchbutton"
            type="button"
            className="launch-button"
            disabled={currentFolder === ''}
            onClick={() => createEditorWindow(currentFolder)}
          >
            <div className="launchtext">{t('gui-landing:launch')}</div>
          </button>
        </div>
      </div>
      <div className="flex-grow-1 overflow-hidden d-flex flex-column justify-content-start">
        <label htmlFor="recentfolders" style={{ color: 'rgb(155, 155, 155)' }}>
          {t('gui-landing:old.folders')}
        </label>
        <div id="recentfolders" className="overflow-hidden mt-2 recent-folders">
          {recentFolderHelper
            .getRecentGameFolders()
            .filter((_, index) => index !== 0)
            .map((recentFolder) => (
              <div
                key={recentFolder}
                className="px-2 file-selector d-flex justify-content-between align-items-center"
                role="button"
                title={recentFolder}
                onClick={onClickUpdateRecentFolder}
              >
                <div className="death90">{recentFolder}</div>
                <input
                  type="button"
                  style={{
                    width: '0.25em',
                    height: '0.25em',
                    color: 'white',
                  }}
                  className="btn-close btn-close-white"
                  aria-label="Close"
                  onClick={(event) => {
                    event.stopPropagation();
                    recentFolderHelper.removeFromRecentFolders(recentFolder);
                    updateCurrentFolderSelectState(
                      recentFolderHelper.getMostRecentGameFolder()
                    );
                  }}
                />
              </div>
            ))}
        </div>
      </div>
    </>
  );
}
