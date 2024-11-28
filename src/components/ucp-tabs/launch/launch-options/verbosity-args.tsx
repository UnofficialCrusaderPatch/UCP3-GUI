import { useAtom } from 'jotai';
import Message from '../../../general/message';
import {
  LAUNCH_OPTION_LOG_LEVEL_CONSOLE_ATOM,
  LOG_LEVELS,
} from './option-log-level-console';
import { LAUNCH_OPTION_LOG_LEVEL_FILE_ATOM } from './option-log-level-file';

function LogLevelSetting(props: { label: string }) {
  const { label } = props;

  const fileLogLevel = useAtom(LAUNCH_OPTION_LOG_LEVEL_FILE_ATOM);
  const consoleLogLevel = useAtom(LAUNCH_OPTION_LOG_LEVEL_CONSOLE_ATOM);
  const [logLevel, setLogLevel] =
    label === 'ucp.log.level' ? fileLogLevel : consoleLogLevel;

  if (logLevel === '') setLogLevel('DEFAULT');

  return (
    <div className="launch__options__box--ucp-log-level">
      <h5>
        <Message message={`launch.options.${label}`} />
      </h5>
      <select
        value={logLevel}
        onChange={(event) => {
          const newLevel = event.currentTarget.value;
          setLogLevel(newLevel);
        }}
      >
        {Object.keys(LOG_LEVELS).map((level) => (
          <option key={level} value={level}>
            {level}
          </option>
        ))}
      </select>
    </div>
  );
}

export function UcpFileLogLevel() {
  return LogLevelSetting({
    label: 'ucp.log.level',
  });
}

export function UcpConsoleLogLevel() {
  return LogLevelSetting({
    label: 'ucp.log.level.console',
  });
}
