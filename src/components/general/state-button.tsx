import { ReactNode, useState } from 'react';
import { Button } from 'react-bootstrap';
import { useTimeout } from 'util/scripts/hooks';
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
  const [buttonValue, setButtonValue] = useState(buttonValues.idle);

  const setResState = (res: void | ReactNode, newButtonValue: string) => {
    setButtonValue(newButtonValue);
    if (res !== undefined && res !== null) {
      setDivState(res);
    }
  };

  useTimeout(
    () => {
      setDivState(null);
      setButtonValue(buttonValues.idle);
    },
    active && buttonValue !== buttonValues.idle ? 3000 : null
  );

  return (
    <div className="row m-3">
      <Button
        className="col-4"
        variant={buttonVariant}
        disabled={!active || !buttonActive}
        onClick={async () => {
          if (funcBefore) funcBefore();
          setActive(false);
          setButtonValue(buttonValues.running);
          (await func(setDivState)).consider(
            (ok) => setResState(ok, buttonValues.success),
            (err) => setResState(err, buttonValues.failed)
          );
          setActive(true);
          if (funcAfter) funcAfter();
        }}
      >
        {buttonValue}
      </Button>
      <div className="col d-flex align-items-center">{divState}</div>
    </div>
  );
}
