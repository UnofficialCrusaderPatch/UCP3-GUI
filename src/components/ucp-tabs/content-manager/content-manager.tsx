import { useAtom, useAtomValue } from 'jotai';
import { atomWithQuery } from 'jotai-tanstack-query';
import { ContentState } from '../../../function/content/state/content-state';
import { ContentManagerToolbar } from './content-manager-toolbar';
import { ContentElementView } from './content-element/content-element-view';
import {
  CONTENT_INTERFACE_STATE_ATOM,
  CONTENT_STATE_ATOM,
} from './state/atoms';
import { SaferMarkdown } from '../../markdown/safer-markdown';
import { dummyFetchStore } from '../../../function/content/store/fetch';
import Logger from '../../../util/scripts/logging';
import {
  SELECTED_CONTENT_DESCRIPTION_ATOM,
  distillInlineDescription,
  chooseSingleFromSelection,
} from './description/fetching';

const LOGGER = new Logger('content-manager.tsx');

// TODO: request is now done when rendering the whole GUI, not optimal!
// Consider: atomWithQuery but that gave errors with hooks not being React proper
const CONTENT_STORE_ATOM = atomWithQuery(() => ({
  queryKey: ['store'],
  queryFn: false || dummyFetchStore,
  retry: false,
  // staleTime: Infinity,
}));

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

  const [{ data, isPending, isError, isSuccess, isPaused, isFetching, error }] =
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

  const elements =
    data !== undefined ? (
      // state.extensions.map((ext) => ContentElementView({ element: ext }))
      data.extensions.list.map((ext) => (
        <ContentElementView key={`${ext.definition.name}`} data={ext} />
      ))
    ) : (
      <div>Unknown error occurred...</div>
    );

  // const { selected } = interfaceState;

  // const inlineDescriptionContent = distillInlineDescription(interfaceState);
  // let onlineDescriptionContent =
  //   !descriptionIsPending && !descriptionIsError
  //     ? descriptionData
  //     : 'Fetching online description...';

  // if (descriptionIsError) {
  //   onlineDescriptionContent = `Failed to fetch description, reason: ${descriptionError}`;
  // }

  if (descriptionIsError) {
    LOGGER.msg(descriptionError.toString()).error();
  }

  const description = (
    <SaferMarkdown>
      {!descriptionIsError
        ? descriptionData
        : `*(failed to fetch online description, displaying a short inline description below if available)*  \n\n${distillInlineDescription(chooseSingleFromSelection(interfaceState.selected))}`}
    </SaferMarkdown>
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
              {isSuccess ? elements : msg}
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
