import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { MutableRefObject } from 'react';
import { Form, Overlay } from 'react-bootstrap';

import {
  CONFIGURATION_DEFAULTS_REDUCER_ATOM,
  CONFIGURATION_QUALIFIER_REDUCER_ATOM,
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
} from '../../../../../../function/configuration/state';
import { CREATOR_MODE_ATOM } from '../../../../../../function/gui-settings/settings';

/** If performance becomes an issue: https://github.com/floating-ui/react-popper/issues/419 */

// eslint-disable-next-line import/prefer-default-export
export function ConfigPopover(props: {
  url: string;
  show: boolean;
  theRef: MutableRefObject<null>;
}) {
  const { url, show, theRef } = props;

  const setUserConfiguration = useSetAtom(CONFIGURATION_USER_REDUCER_ATOM);
  const setConfiguration = useSetAtom(CONFIGURATION_FULL_REDUCER_ATOM);
  const setConfigurationTouched = useSetAtom(
    CONFIGURATION_TOUCHED_REDUCER_ATOM,
  );
  const configurationDefaults = useAtomValue(
    CONFIGURATION_DEFAULTS_REDUCER_ATOM,
  );

  const [qualifiers, setQualifier] = useAtom(
    CONFIGURATION_QUALIFIER_REDUCER_ATOM,
  );

  const { [url]: defaultValue } = configurationDefaults;

  const qualifier = qualifiers[url];

  const creatorMode = useAtomValue(CREATOR_MODE_ATOM);

  return (
    <Overlay
      show={show}
      target={theRef.current}
      placement="top-end"
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
          className="d-flex justify-content-center"
          // eslint-disable-next-line react/jsx-props-no-spreading
          {...prps}
          style={{
            position: 'absolute',
            ...prps.style,
          }}
        >
          {creatorMode ? (
            <>
              <Form>
                <Form.Switch
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
                  }}
                  checked={qualifier === 'required'}
                  label={qualifier === 'required' ? 'Required' : 'Suggested'}
                  id="popover-qualifier-button-test"
                />
              </Form>
              <span className="ms-1 me-1"> |</span>
            </>
          ) : undefined}

          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,
      jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus */}
          <span
            role="button"
            className="ms-1 me-1"
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
            }}
          >
            Reset
          </span>
        </div>
      )}
    </Overlay>
  );
}
