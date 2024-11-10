import { useRef } from 'react';
import { useAtom } from 'jotai';
import Message from '../../../general/message';
import { LAUNCH_OPTION_COMMAND_LINE_ARGUMENTS_ATOM } from './option-command-line-arguments';

export default function FreeArgs() {
  const [internalArgs, setInternalArgs] = useAtom(
    LAUNCH_OPTION_COMMAND_LINE_ARGUMENTS_ATOM,
  );

  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="launch__options__box--free-args">
      <h5>
        <Message message="launch.options.free.args" />
      </h5>
      <form ref={formRef}>
        <input
          type="text"
          name="arg"
          value={internalArgs}
          onChange={(e) => setInternalArgs(e.target.value.replaceAll("'", ''))}
        />
        <button type="submit" className="d-none" />
      </form>
    </div>
  );
}
