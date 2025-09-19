import './popover.css';

import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { MutableRefObject } from 'react';
import { Button, Overlay } from 'react-bootstrap';

import { TrashFill } from 'react-bootstrap-icons';
import {
  CONFIGURATION_QUALIFIER_REDUCER_ATOM,
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
} from '../../../../../../function/configuration/state';
import { CREATOR_MODE_ATOM } from '../../../../../../function/gui-settings/settings';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../../../footer/footer';
import {
  CONFIGURATION_LOCKS_REDUCER_ATOM,
  CONFIGURATION_DEFAULTS_REDUCER_ATOM,
} from '../../../../../../function/configuration/derived-state';
import { CONFIG_EXTENSIONS_DIRTY_STATE_ATOM } from '../../../../common/buttons/config-serialized-state';

/** If performance becomes an issue: https://github.com/floating-ui/react-popper/issues/419 */

// eslint-disable-next-line import/prefer-default-export
export function ConfigPopover(props: {
  url: string;
  show: boolean;
  theRef: MutableRefObject<null>;
}) {
  const { url, show, theRef } = props;

  const locks = useAtomValue(CONFIGURATION_LOCKS_REDUCER_ATOM);
  const { [url]: lock } = locks;
  const locked = lock !== undefined;
  const configuration = useAtomValue(CONFIGURATION_FULL_REDUCER_ATOM);
  const setUserConfiguration = useSetAtom(CONFIGURATION_USER_REDUCER_ATOM);
  const setConfiguration = useSetAtom(CONFIGURATION_FULL_REDUCER_ATOM);
  const setConfigurationTouched = useSetAtom(
    CONFIGURATION_TOUCHED_REDUCER_ATOM,
  );
  // TODO: improve
  const setDirty = useSetAtom(CONFIG_EXTENSIONS_DIRTY_STATE_ATOM);
  const configurationDefaults = useAtomValue(
    CONFIGURATION_DEFAULTS_REDUCER_ATOM,
  );

  const [qualifiers, setQualifier] = useAtom(
    CONFIGURATION_QUALIFIER_REDUCER_ATOM,
  );

  const { [url]: defaultValue } = configurationDefaults;

  const qualifier = qualifiers[url];

  const creatorMode = useAtomValue(CREATOR_MODE_ATOM);

  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);

  return (
    <Overlay
      show={show}
      target={theRef.current}
      placement="left-start"
      container={theRef}
      popperConfig={{
        strategy: 'fixed',
        // https://popper.js.org/docs/v2/modifiers/prevent-overflow/
        modifiers: [
          {
            name: 'preventOverflow',
            options: {
              mainAxis: true, // true
              altAxis: false, // false
              padding: 0, // 0
              boundary: 'clippingParents', // "clippingParents"
              altBoundary: false, // false
              rootBoundary: 'viewport', // "viewport"
              tether: true, // true
              tetherOffset: 0, // 0
            },
          },
        ],
      }}
    >
      {({
        placement: _placement,
        arrowProps: _arrowProps,
        show: _show,
        popper: _popper,
        hasDoneInitialMeasure: _hasDoneInitialMeasure,
        ...prps
      }) => (
        <div
          className={`ucp-popover ${locked ? 'disabled' : ''}`}
          // eslint-disable-next-line react/jsx-props-no-spreading
          {...prps}
          style={{
            position: 'absolute',
            // backgroundColor: '#ab712d',
            backgroundColor: 'white',
            ...prps.style,
          }}
        >
          {creatorMode ? (
            <>
              <input
                type="checkbox"
                onChange={() => {
                  setQualifier({
                    type: 'set-multiple',
                    value: {
                      [url]:
                        qualifier === 'required' ? 'suggested' : 'required',
                    },
                  });
                  setConfigurationTouched({
                    type: 'set-multiple',
                    value: {
                      [url]: true,
                    },
                  });
                  setUserConfiguration({
                    type: 'set-multiple',
                    value: {
                      [url]: configuration[url],
                    },
                  });
                }}
                checked={qualifier === 'required'}
                id={`${url}-popover-qualifier-switch`}
                disabled={locked}
              />
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label
                className="ms-2 fs-6"
                htmlFor={`${url}-popover-qualifier-switch`}
                onMouseEnter={() => {
                  setStatusBarMessage(
                    qualifier === 'required'
                      ? 'config.popover.required'
                      : 'config.popover.suggested',
                  );
                }}
                onMouseLeave={() => {
                  setStatusBarMessage(undefined);
                }}
              />
              <span className=""> |</span>
            </>
          ) : undefined}

          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,
      jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus */}
          <Button
            disabled={locked}
            role="button"
            className="ms-2 me-2"
            id={`${url}-popover-reset-button`}
            onClick={() => {
              setUserConfiguration({
                type: 'clear-key',
                key: url,
              });
              setConfiguration({
                type: 'set-multiple',
                value: { [url]: defaultValue },
              });
              setConfigurationTouched({
                type: 'clear-key',
                key: url,
              });
              setQualifier({
                type: 'set-multiple',
                value: { [url]: 'suggested' },
              });
              setDirty(true);
            }}
            onMouseEnter={() => {
              setStatusBarMessage('config.popover.reset');
            }}
            onMouseLeave={() => {
              setStatusBarMessage(undefined);
            }}
          >
            <TrashFill />
          </Button>
        </div>
      )}
    </Overlay>
  );
}
