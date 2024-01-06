/* eslint-disable react/require-default-props */
import { ReactNode, useState } from 'react';
import { useTimeout } from '../../hooks/general/util';
import Result from '../../util/structs/result';

interface ButtonStateValues {
  idle: string;
  running: string;
  failed: string;
  success: string;
}

interface StateButtonProps {
  buttonActive: boolean;
  buttonValues: ButtonStateValues;
  buttonVariant: string | undefined;
  func: (
    updateState: (stateUpdate: ReactNode) => void,
  ) => Promise<Result<void | ReactNode, void | ReactNode>>;
  funcBefore?: () => void;
  funcAfter?: () => void;
  tooltip?: string;
  setResultNodeState?: (node: ReactNode) => void;
}

enum ButtonState {
  IDLE = 'idle',
  RUNNING = 'running',
  FAILED = 'failed',
  SUCCESS = 'success',
}

export default function StateButton(props: StateButtonProps) {
  const {
    func,
    buttonValues,
    buttonVariant,
    buttonActive,
    funcBefore,
    funcAfter,
    tooltip,
    setResultNodeState = () => {},
  } = props;
  const [active, setActive] = useState(true);
  const [buttonState, setButtonState] = useState(ButtonState.IDLE);

  const setResState = (res: void | ReactNode, newButtonState: ButtonState) => {
    setButtonState(newButtonState);
    if (res !== undefined && res !== null) {
      setResultNodeState(res);
    }
  };

  useTimeout(
    () => {
      setResultNodeState(null);
      setButtonState(ButtonState.IDLE);
    },
    active && buttonState !== ButtonState.IDLE ? 5000 : null,
  );

  return (
    <button
      type="button"
      className={`${buttonVariant}`}
      disabled={!active || !buttonActive}
      onClick={async () => {
        if (funcBefore) funcBefore();
        setActive(false);
        setButtonState(ButtonState.RUNNING);
        (await func(setResultNodeState)).consider(
          (ok) => setResState(ok, ButtonState.SUCCESS),
          (err) => setResState(err, ButtonState.FAILED),
        );
        setActive(true);
        if (funcAfter) funcAfter();
      }}
      data-bs-toggle="tooltip"
      data-bs-placement="top"
      title={tooltip}
    >
      <div className="icon-placeholder" />
      <div className="button-text">{buttonValues[buttonState]}</div>
    </button>
  );
}
