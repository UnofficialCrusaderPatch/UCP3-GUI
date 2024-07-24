import { useAtomValue } from 'jotai';
import { ContentState } from '../../../function/content/state/content-state';
import { ContentManagerToolbar } from './content-manager-toolbar';
import { ContentElementView } from '../content-element/content-element-view';
import {
  CONTENT_INTERFACE_STATE_ATOM,
  CONTENT_STATE_ATOM,
} from './state/atoms';
import { SaferMarkdown } from '../../markdown/safer-markdown';

/* eslint-disable import/prefer-default-export */
export function ContentManager() {
  const state: ContentState = useAtomValue(CONTENT_STATE_ATOM);

  const { extensions } = state;

  const elements = extensions.map((ext) =>
    ContentElementView({ element: ext }),
  );

  const interfaceState = useAtomValue(CONTENT_INTERFACE_STATE_ATOM);
  const { selected } = interfaceState;

  const description =
    selected !== undefined && selected.length > 0 ? (
      <SaferMarkdown>{selected[0].description.default}</SaferMarkdown>
    ) : (
      <div />
    );

  return (
    <div className="flex-default extension-manager">
      <div className="extension-manager-control">
        <div className="extension-manager-control__header-container">
          <div className="extension-manager-control__header">
            <h4 className="extension-manager-control__box__header__headline">
              Online Content
            </h4>
            <div className="extension-manager-control__box__header__buttons">
              (filter buttons)
            </div>
          </div>
          <div className="extension-manager-control__header">
            <h4 className="extension-manager-control__box__header__headline">
              Description
            </h4>
          </div>
        </div>
        <div className="extension-manager-control__box-container">
          <div className="extension-manager-control__box">
            <div className="parchment-box extension-manager-list">
              {elements}
            </div>
          </div>
          <div className="extension-manager-control__box">
            <div
              className="parchment-box extension-manager-list text-dark"
              style={{ padding: '10px 10px' }}
            >
              {description}
            </div>
            <ContentManagerToolbar />
          </div>
        </div>
      </div>
    </div>
  );
}
