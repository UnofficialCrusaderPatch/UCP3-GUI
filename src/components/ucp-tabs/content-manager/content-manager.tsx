import { useAtom, useAtomValue } from 'jotai';
import { ContentState } from '../../../function/content/state/content-state';
import { ContentManagerToolbar } from './content-manager-toolbar';
import { ContentElementView } from './content-element/content-element-view';
import {
  CONTENT_ELEMENTS_ATOM,
  CONTENT_INTERFACE_STATE_ATOM,
  CONTENT_STATE_ATOM,
  CONTENT_STORE_ATOM,
} from './state/atoms';
import { SaferMarkdown } from '../../markdown/safer-markdown';
import Logger from '../../../util/scripts/logging';
import {
  SELECTED_CONTENT_DESCRIPTION_ATOM,
  distillInlineDescription,
  chooseSingleFromSelection,
} from './description/fetching';
import {
  ContentFilterButton,
  UI_FILTER_SETTING_ATOM,
} from './buttons/filter-button';

const LOGGER = new Logger('content-manager.tsx');

// eslint-disable-next-line react/prop-types
function StatusElement({ children }: { children: any }) {
  return (
    <div
      className="extension-element"
      style={{ overflowWrap: 'anywhere', display: 'block' }}
    >
      {children}
    </div>
  );
}

/* eslint-disable import/prefer-default-export */
export function ContentManager() {
  const interfaceState = useAtomValue(CONTENT_INTERFACE_STATE_ATOM);
  const state: ContentState = useAtomValue(CONTENT_STATE_ATOM);

  const [{ isPending, isError, isSuccess, isPaused, isFetching, error }] =
    useAtom(CONTENT_STORE_ATOM);

  const [
    {
      data: descriptionData,
      isError: descriptionIsError,
      error: descriptionError,
    },
  ] = useAtom(SELECTED_CONTENT_DESCRIPTION_ATOM);

  let msg = <div className="extension-element" />;

  if (isFetching || isPaused) {
    msg = (
      <StatusElement>
        Fetching online content... Do you have an internet connection?
      </StatusElement>
    );
  } else if (isPending) msg = <StatusElement>Loading...</StatusElement>;

  if (isError) {
    msg = (
      <StatusElement>
        <strong>Failed to fetch online content:</strong>
        <br />
        <br />
        {error.toString()}
      </StatusElement>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { extensions } = state;

  const onlyIncludeOnline = useAtomValue(UI_FILTER_SETTING_ATOM);

  // TODO: implement for modules (signatures and hashes)
  const elements = useAtomValue(CONTENT_ELEMENTS_ATOM)
    .filter((ce) => (onlyIncludeOnline ? ce.online && !ce.installed : true))
    .filter((ce) => ce.definition.type === 'plugin')
    .sort((a, b) => a.definition.name.localeCompare(b.definition.name))
    .map((ext) => (
      <ContentElementView
        key={`${ext.definition.name}@${ext.definition.version}`}
        data={ext}
      />
    ));

  const selected = chooseSingleFromSelection(interfaceState.selected);
  let description = '';
  if (interfaceState.selected.length === 0) {
    description = '(select content to install or uninstall on the left)';
  } else if (descriptionIsError) {
    LOGGER.msg(descriptionError.toString()).error();
    description = `*(failed to fetch online description, displaying a short inline description below if available)*  \n\n${distillInlineDescription(chooseSingleFromSelection(interfaceState.selected))}`;
  } else {
    let size;
    if (selected !== undefined) {
      if (selected.sources.package.length > 0) {
        size = selected.sources.package.at(0)!.size / 1000 / 1000;
      }
    }
    // eslint-disable-next-line no-unsafe-optional-chaining
    description = `\`author(s):\` ${selected?.definition.author} \`size:\` ${size === undefined || size === 0 || size === null ? '?' : `${size}MB`}  \n\n${descriptionData}`;
  }

  return (
    <div className="flex-default extension-manager">
      <div className="extension-manager-control">
        <div className="extension-manager-control__header-container">
          <div className="extension-manager-control__header">
            <h4 className="extension-manager-control__box__header__headline">
              Online Content
            </h4>
            <div className="extension-manager-control__box__header__buttons">
              <ContentFilterButton />
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
              {isSuccess ? elements : msg}
            </div>
          </div>
          <div className="extension-manager-control__box">
            <div
              className="parchment-box extension-manager-list text-dark"
              style={{ padding: '10px 10px' }}
            >
              <SaferMarkdown>{description}</SaferMarkdown>
            </div>
            <ContentManagerToolbar />
          </div>
        </div>
      </div>
    </div>
  );
}
