import { ReactNode, useState } from 'react';
import { Button } from 'react-bootstrap';
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
}

export default function StateButton(props: StateButtonProps) {
  const { func, buttonValues, buttonVariant, buttonActive } = props;
  const [active, setActive] = useState(true);
  const [divState, setDivState] = useState<ReactNode>();
  const [buttonValue, setButtonValue] = useState(buttonValues.idle);

  const setResState = (res: void | ReactNode, newButtonValue: string) => {
    setButtonValue(newButtonValue);
    if (res !== undefined && res !== null) {
      setDivState(res);
    }
  };

  return (
    <div className="row m-3">
      <Button
        className="col-4"
        variant={buttonVariant}
        disabled={!active || !buttonActive}
        onClick={async () => {
          setActive(false);
          setButtonValue(buttonValues.running);
          (await func(setDivState)).consider(
            (ok) => setResState(ok, buttonValues.success),
            (err) => setResState(err, buttonValues.failed)
          );
          setTimeout(() => {
            setActive(true);
            setDivState(null);
            setButtonValue(buttonValues.idle);
          }, 3000);
        }}
      >
        {buttonValue}
      </Button>
      <div className="col d-flex align-items-center">{divState}</div>
    </div>
  );
}
