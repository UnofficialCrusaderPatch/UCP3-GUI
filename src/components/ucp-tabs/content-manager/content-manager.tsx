import { useAtom, useAtomValue } from 'jotai';
import { ExclamationCircleFill } from 'react-bootstrap-icons';
import { ContentManagerToolbar } from './content-manager-toolbar';
import { ContentElementView } from './content-element/content-element-view';
import {
  COMPLETED_CONTENT_ELEMENTS_ATOM,
  CONTENT_FILTERS_ATOM,
  CONTENT_INTERFACE_STATE_ATOM,
  CONTENT_STORE_ATOM,
  CONTENT_ELEMENTS_ATOM,
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
import { DiscoveryToolbar } from '../common/discovery/discovery-toolbar';
import { FamilyList } from '../common/discovery/family-list';
import { useDiscovery } from '../common/discovery/use-discovery';
import { ContentElement } from '../../../function/content/types/content-element';
import { SearchExcerpt } from '../common/discovery/search-excerpt';

const LOGGER = new Logger('content-manager.tsx');

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
  const [contentFilters, setContentFilters] = useAtom(CONTENT_FILTERS_ATOM);
  const allElements = useAtomValue(CONTENT_ELEMENTS_ATOM);
  const filteredElements = useAtomValue(filteredContentElementsAtom);
  const discovery = useDiscovery(allElements, contentFilters);
  const item = (content: ContentElement) => ({
    id: createExtensionID(content),
    name: content.definition.name,
    family: content.definition.family,
    content,
  });
  const visible = filteredElements
    .filter((element) => discovery.results.has(createExtensionID(element)))
    .sort(
      (a, b) =>
        discovery.results.get(createExtensionID(b))!.score -
        discovery.results.get(createExtensionID(a))!.score,
    );
  const interfaceState = useAtomValue(CONTENT_INTERFACE_STATE_ATOM);

  const [{ isPending, isError, isPaused, isFetching, error }] =
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

  const elements = (
    <FamilyList
      items={visible.map(item)}
      available={allElements.map(item)}
      scope="store"
      searching={Boolean(
        contentFilters.search.trim() || contentFilters.tags.length,
      )}
      label={(entry) => entry.content.definition['display-name'] || entry.name}
      render={(entry) => (
        <>
          <ContentElementView data={entry.content} />
          {discovery.results.get(entry.id)?.excerpt && (
            <SearchExcerpt
              text={discovery.results.get(entry.id)!.excerpt}
              query={contentFilters.search}
              approximate={discovery.results.get(entry.id)!.approximate}
            />
          )}
        </>
      )}
    />
  );

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
    description = `${header}  \n\n${descriptionData?.text ?? ''}`;
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
    <div className="flex-default extension-manager discovery-store">
      <div className="discovery-store-columns">
        <div className="discovery-store-column">
          <div className="w-100 d-flex flex-column gap-2">
            <div className="w-100 d-flex flex-row align-items-center">
              <h4 className="extension-manager-control__box__header__headline">
                <Message message="store.content.online" />
              </h4>
              <div className="extension-manager-control__box__header__buttons">
                {restartElement}
                <ExtensionFilterButton />
                <ContentFilterButton />
              </div>
            </div>
            <DiscoveryToolbar
              filter={contentFilters}
              onChange={setContentFilters}
              tags={discovery.tags}
              pending={discovery.pending}
              incomplete={discovery.incomplete}
            />
          </div>
          <div className="parchment-box discovery-store-list">
            {msg}
            {elements}
            {!visible.length && !isPending && !discovery.pending && (
              <div className="discovery-empty">
                <Message message="discovery.empty" />
              </div>
            )}
          </div>
        </div>
        <div className="discovery-store-column">
          <div className="w-100 d-flex flex-row align-items-center">
            <h4 className="extension-manager-control__box__header__headline">
              <Message message="store.content.description" />
            </h4>
          </div>
          <div className="discovery-store-details">
            {selected && (
              <div className="discovery-selection-label">
                {selected.definition['display-name'] ||
                  selected.definition.name}{' '}
                {selected.definition.version}
                {!visible.some(
                  (entry) =>
                    createExtensionID(entry) === createExtensionID(selected),
                ) && (
                  <span role="status">
                    {' '}
                    — <Message message="discovery.hiddenSelection" />
                  </span>
                )}
              </div>
            )}
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
