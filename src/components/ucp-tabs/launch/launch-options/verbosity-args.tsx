import { useState } from 'react';
import { LaunchOptions } from './launch-options';
import Message from '../../../general/message';

const LOG_LEVELS: Record<string, string> = {
  DEFAULT: '',
  FATAL: '-3',
  ERROR: '-2',
  WARNING: '-1',
  INFO: '0',
  DEBUG: '1',
  VERBOSE: '2',
};

const LOG_LEVELS_INVERSE: Record<string, string> = {
  '': 'DEFAULT',
  '-3': 'FATAL',
  '-2': 'ERROR',
  '-1': 'WARNING',
  '0': 'INFO',
  '1': 'DEBUG',
  '2': 'VERBOSE',
};

const UCP_VERBOSITY_ARG = '--ucp-verbosity';
const UCP_CONSOLE_VERBOSITY_ARG = '--ucp-console-verbosity';

function LogLevelSetting(
  props: LaunchOptions & { arg: string; label: string },
) {
  const { arg, label, getArgs, setArgs } = props;

  const [logLevel, setLogLevel] = useState(
    LOG_LEVELS_INVERSE[getArgs().at(1) ?? ''],
  );

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

          const newArgs =
            newLevel === 'DEFAULT' ? [] : [arg, LOG_LEVELS[newLevel]];
          setArgs(newArgs);
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

export function UcpLogLevel(props: LaunchOptions) {
  return LogLevelSetting({
    ...props,
    arg: UCP_VERBOSITY_ARG,
    label: 'ucp.log.level',
  });
}

export function UcpConsoleLogLevel(props: LaunchOptions) {
  return LogLevelSetting({
    ...props,
    arg: UCP_CONSOLE_VERBOSITY_ARG,
    label: 'ucp.log.level.console',
  });
}
