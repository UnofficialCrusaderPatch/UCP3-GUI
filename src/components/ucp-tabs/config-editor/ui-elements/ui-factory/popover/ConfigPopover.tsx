import './popover.css';
import { useAtomValue } from 'jotai';
import { MutableRefObject } from 'react';
import { Overlay } from 'react-bootstrap';
import { CREATOR_MODE_ATOM } from '../../../../../../function/gui-settings/settings';
import ResetSettingButton from './ResetSettingButton';
import useResetAvailable from './useResetAvailable';
import useHoverBridge from './useHoverBridge';

/** If performance becomes an issue: https://github.com/floating-ui/react-popper/issues/419 */

// eslint-disable-next-line import/prefer-default-export
export function ConfigPopover(props: {
  url: string;
  show: boolean;
  theRef: MutableRefObject<null>;
}) {
  const { url, show, theRef } = props;

  const creator = useAtomValue(CREATOR_MODE_ATOM);
  const resetAvailable = useResetAvailable(url);
  const hover = useHoverBridge(show, !creator && resetAvailable);
  if (creator || !resetAvailable) return null;

  return (
    <Overlay
      show={hover.visible}
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
          {
            name: 'offset',
            options: {
              offset: [0, 13],
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
          className="ucp-popover sword-checkbox"
          // eslint-disable-next-line react/jsx-props-no-spreading
          {...prps}
          onMouseEnter={hover.enter}
          onMouseLeave={hover.leave}
          style={{
            position: 'absolute',
            backgroundColor: '#c7a464',
            borderRadius: '5px',
            // backgroundColor: 'white',
            ...prps.style,
          }}
        >
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,
      jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus */}
          <ResetSettingButton url={url} />
        </div>
      )}
    </Overlay>
  );
}
