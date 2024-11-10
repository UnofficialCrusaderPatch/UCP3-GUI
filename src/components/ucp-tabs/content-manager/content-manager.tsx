import { atom, useAtom, useAtomValue } from 'jotai';
import { ExclamationCircleFill } from 'react-bootstrap-icons';
import { ContentManagerToolbar } from './content-manager-toolbar';
import { ContentElementView } from './content-element/content-element-view';
import {
  COMPLETED_CONTENT_ELEMENTS_ATOM,
  CONTENT_INTERFACE_STATE_ATOM,
  CONTENT_STORE_ATOM,
  filteredContentElementsAtom,
  SINGLE_CONTENT_SELECTION_ATOM,
} from './state/atoms';
import { SaferMarkdown } from '../../markdown/safer-markdown';
import Logger from '../../../util/scripts/logging';
import {
  SELECTED_CONTENT_DESCRIPTION_ATOM,
  distillInlineDescription,
} from './description/fetching';
import { ContentFilterButton } from './buttons/filter-button';
import { createExtensionID } from '../../../function/global/constants/extension-id';
import Message from '../../general/message';
import { ExtensionFilterButton } from './buttons/extension-filter-button';

const LOGGER = new Logger('content-manager.tsx');

const elementsAtom = atom((get) =>
  get(filteredContentElementsAtom).map((ext) => (
    <ContentElementView key={createExtensionID(ext)} data={ext} />
  )),
);

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
    /* todo:locale: */
    msg = (
      <StatusElement>
        Fetching online content... Do you have an internet connection?
      </StatusElement>
    );
    /* todo:locale: */
  } else if (isPending) msg = <StatusElement>Loading...</StatusElement>;

  if (isError && error !== null) {
    /* todo:locale: */
    msg = (
      <StatusElement>
        <strong>Failed to fetch online content:</strong>
        <br />
        <br />
        {error.toString()}
      </StatusElement>
    );
  }

  // TODO: implement for modules (signatures and hashes)
  const elements = useAtomValue(elementsAtom);

  const singleSelection = useAtomValue(SINGLE_CONTENT_SELECTION_ATOM);
  const selected = useAtomValue(SINGLE_CONTENT_SELECTION_ATOM);
  let description = '';
  if (interfaceState.selected.length === 0) {
    /* todo:locale: */
    description = '(select content to install or uninstall on the left)';
  } else if (descriptionIsError && descriptionError !== null) {
    LOGGER.msg(
      (descriptionError === null ? '' : descriptionError).toString(),
    ).error();
    /* todo:locale: */
    description = `*(failed to fetch online description, displaying a short inline description below if available)*  \n\n${distillInlineDescription(singleSelection)}`;
  } else {
    let size;
    if (selected !== undefined) {
      if (selected.contents.package.length > 0) {
        size = selected.contents.package.at(0)!.size / 1000 / 1000;
      }
    }
    /* todo:locale: */
    // eslint-disable-next-line no-unsafe-optional-chaining
    description = `\`author(s):\` ${selected?.definition.author} \`size:\` ${size === undefined || size === 0 || size === null ? '?' : `${Math.ceil(size)} MB`}  \n\n${descriptionData}`;
  }

  const completed = useAtomValue(COMPLETED_CONTENT_ELEMENTS_ATOM);

  let restartElement;
  if (completed.length > 0) {
    restartElement = (
      <div
        className="text-warning d-flex me-1"
        style={{ alignItems: 'center' }}
      >
        <ExclamationCircleFill />
        {/* todo:locale: */}
        <span className="ms-1">
          <Message key="extensions.reload.required.title" />
        </span>
      </div>
    );
  }

  return (
    <div className="flex-default extension-manager">
      <div className="extension-manager-control">
        <div className="extension-manager-control__header-container">
          <div className="extension-manager-control__header">
            <h4 className="extension-manager-control__box__header__headline">
              {/* todo:locale: */}
              Online Content
            </h4>
            <div className="extension-manager-control__box__header__buttons">
              {restartElement}
              <ExtensionFilterButton />
              <ContentFilterButton />
            </div>
          </div>
          <div className="extension-manager-control__header">
            <h4 className="extension-manager-control__box__header__headline">
              {/* todo:locale: */}
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
