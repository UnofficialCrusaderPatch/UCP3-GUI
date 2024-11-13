import { atom, useAtom, useAtomValue } from 'jotai';
import { ExclamationCircleFill } from 'react-bootstrap-icons';
import { ContentManagerToolbar } from './content-manager-toolbar';
import { ContentElementView } from './content-element/content-element-view';
import {
  COMPLETED_CONTENT_ELEMENTS_ATOM,
  CONTENT_INTERFACE_STATE_ATOM,
  CONTENT_STORE_ATOM,
  filteredContentElementsAtom,
  LAST_CLICKED_CONTENT_ATOM,
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
import Message, { useMessage } from '../../general/message';
import { ExtensionFilterButton } from './buttons/extension-filter-button';

const LOGGER = new Logger('content-manager.tsx');

const elementsAtom = atom((get) =>
  get(filteredContentElementsAtom).map((ext) => (
    <ContentElementView key={createExtensionID(ext)} data={ext} />
  )),
);

// eslint-disable-next-line react/prop-types, @typescript-eslint/no-explicit-any
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
        <Message message="store.fetching.connection" />
      </StatusElement>
    );
  } else if (isPending)
    msg = (
      <StatusElement>
        <Message message="store.loading" />
      </StatusElement>
    );

  if (isError && error !== null) {
    msg = (
      <StatusElement>
        <strong>
          <Message message="store.fetching.failed" />
        </strong>
        <br />
        <br />
        {error.toString()}
      </StatusElement>
    );
  }

  // TODO: implement for modules (signatures and hashes)
  const elements = useAtomValue(elementsAtom);

  const singleSelection = useAtomValue(SINGLE_CONTENT_SELECTION_ATOM);
  // const lastSelected = useAtomValue(SINGLE_CONTENT_SELECTION_ATOM);
  const lastClicked = useAtomValue(LAST_CLICKED_CONTENT_ATOM);
  const selected = lastClicked;
  let description = '';

  const localize = useMessage();

  if (selected && !descriptionIsError) {
    let size;
    if (selected.contents.package.length > 0) {
      size = selected.contents.package.at(0)!.size / 1000 / 1000;
    }

    // eslint-disable-next-line no-unsafe-optional-chaining
    const { author } = selected.definition;
    const headerSize =
      size === undefined || size === 0 || size === null
        ? '?'
        : `${Math.ceil(size)} MB`;
    const header = localize({
      key: 'store.selection.description.authorsize',
      args: {
        author,
        size: headerSize,
      },
    });
    description = `${header}  \n\n${descriptionData}`;
  } else if (interfaceState.selected.length === 0) {
    description = localize('store.selection.instruction');
  } else if (descriptionIsError && descriptionError !== null) {
    LOGGER.msg(
      (descriptionError === null ? '' : descriptionError).toString(),
    ).error();
    description = localize({
      key: 'store.selection.fetch.failed',
      args: {
        inline: distillInlineDescription(singleSelection),
      },
    });
  } else {
    description = '(unknown state)';
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
          <Message message="extensions.reload.required.title" />
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
              <Message message="store.content.online" />
            </h4>
            <div className="extension-manager-control__box__header__buttons">
              {restartElement}
              <ExtensionFilterButton />
              <ContentFilterButton />
            </div>
          </div>
          <div className="extension-manager-control__header">
            <h4 className="extension-manager-control__box__header__headline">
              <Message message="store.content.description" />
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
