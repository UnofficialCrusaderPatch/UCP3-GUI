import './modal.css';
import { useEffect, useId, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { ModalDisplayConfigElement } from '../../../../../config/ucp/common';
import {
  displayChildren,
  shouldBeIncluded,
} from '../../../../../config/ucp/display-tree';
import { OverlayPortal } from '../../../../overlay/overlay';
import Message, { useMessage } from '../../../../general/message';
import { ModalFilterContext, ModalQueryContext } from './sections/modal-filter';
import {
  useInitialModalQuery,
  useModalMatches,
} from './sections/use-modal-search';

import { settingRoots } from '../../../../../function/configuration/qualifiers';
import QualifierControl from './QualifierControl';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../../footer/footer';
import { GAME_FOLDER_SET_MOMENT_ATOM } from '../../../../../function/game-folder/interface';
// eslint-disable-next-line import/no-cycle
import ConfigChildren from './ConfigChildren';

function ModalEditor({
  spec,
  disabled,
  onClose,
}: {
  spec: ModalDisplayConfigElement;
  disabled: boolean;
  onClose: () => void;
}) {
  const initialQuery = useInitialModalQuery();
  const [query, setQuery] = useState(initialQuery);
  const matches = useModalMatches(query);
  const localize = useMessage();
  const status = useAtomValue(STATUS_BAR_MESSAGE_ATOM);
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
  }, []);
  const children = displayChildren(spec);
  const visible = children.filter(
    (child) => !child.hidden && (!matches || shouldBeIncluded(matches, child)),
  );
  return (
    <div
      className="declarative-modal parchment-box-bg-light"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-semantics`}
    >
      <header className="declarative-modal-header">
        <h2 id={`${id}-title`}>{spec.header || spec.name}</h2>
        <p>{spec.description ?? spec.text}</p>
        <label htmlFor={`${id}-search`}>{localize('modal.search')}</label>
        <input
          ref={input}
          id={`${id}-search`}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button
          type="button"
          className="ucp-button"
          disabled={!query}
          onClick={() => setQuery('')}
        >
          <Message message="modal.show.all" />
        </button>
        <QualifierControl roots={settingRoots(spec)} disabled={disabled} />
      </header>
      <div className="declarative-modal-body">
        <ModalQueryContext.Provider value={query}>
          <ModalFilterContext.Provider value={matches}>
            {visible.length ? (
              <ConfigChildren
                elements={children}
                columns={spec.columns}
                disabled={disabled}
              />
            ) : (
              <p role="status">
                {localize(children.length ? 'modal.no.results' : 'modal.empty')}
              </p>
            )}
          </ModalFilterContext.Provider>
        </ModalQueryContext.Provider>
      </div>
      <footer className="declarative-modal-footer">
        <div>
          <p id={`${id}-semantics`}>
            <Message message="modal.live.edit" />
          </p>
          <span role="status">
            <Message message={status} />
          </span>
        </div>
        <button type="button" className="ucp-button" onClick={onClose}>
          <Message message="close" />
        </button>
      </footer>
    </div>
  );
}

// eslint-disable-next-line import/prefer-default-export
export function CreateModal({
  spec,
  disabled,
  className,
}: {
  spec: ModalDisplayConfigElement;
  disabled: boolean;
  className: string;
}) {
  const folderMoment = useAtomValue(GAME_FOLDER_SET_MOMENT_ATOM);
  const scope = `${folderMoment}:${spec.extension?.io.path}:${spec.extension?.version}`;
  const [openScope, setOpenScope] = useState<string | null>(null);
  return (
    <div
      className={`ui-element ${className} ${spec.style?.className ?? ''}`}
      style={spec.style?.css}
    >
      <p>{spec.text ?? spec.description}</p>
      <button
        type="button"
        className="ucp-button"
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={() => setOpenScope(scope)}
      >
        {spec.header || spec.name}
      </button>
      {openScope === scope && (
        <OverlayPortal onClose={() => setOpenScope(null)}>
          <ModalEditor
            spec={spec}
            disabled={disabled}
            onClose={() => setOpenScope(null)}
          />
        </OverlayPortal>
      )}
    </div>
  );
}
