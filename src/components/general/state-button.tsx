import { ReactNode, useState } from 'react';
// import { Button } from 'react-bootstrap';
import { useTimeout } from 'hooks/general/util';
import Result from 'util/structs/result';

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
    updateState: (stateUpdate: ReactNode) => void
  ) => Promise<Result<void | ReactNode, void | ReactNode>>;
  // eslint-disable-next-line react/require-default-props
  funcBefore?: () => void;
  // eslint-disable-next-line react/require-default-props
  funcAfter?: () => void;
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
  } = props;
  const [active, setActive] = useState(true);
  const [divState, setDivState] = useState<ReactNode>();
  const [buttonState, setButtonState] = useState(ButtonState.IDLE);

  const setResState = (res: void | ReactNode, newButtonState: ButtonState) => {
    setButtonState(newButtonState);
    if (res !== undefined && res !== null) {
      setDivState(res);
    }
  };

  useTimeout(
    () => {
      setDivState(null);
      setButtonState(ButtonState.IDLE);
    },
    active && buttonState !== ButtonState.IDLE ? 5000 : null
  );

  return (
    <div className="m-2 ">
      <button
        type="button"
        className={`col-8 ${buttonVariant}`}
        disabled={!active || !buttonActive}
        onClick={async () => {
          if (funcBefore) funcBefore();
          setActive(false);
          setButtonState(ButtonState.RUNNING);
          (await func(setDivState)).consider(
            (ok) => setResState(ok, ButtonState.SUCCESS),
            (err) => setResState(err, ButtonState.FAILED)
          );
          setActive(true);
          if (funcAfter) funcAfter();
        }}
      >
        <div className="buttontext">
          <div className=""> </div>
          {buttonValues[buttonState]}
        </div>
      </button>
      <div className="col d-flex align-items-center">{divState}</div>
    </div>
  );
}
