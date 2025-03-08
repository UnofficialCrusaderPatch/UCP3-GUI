/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable react/jsx-props-no-spreading */
import './launch.css';
import './launch-options/launch-options.css'; // currently imported here, als long as single files not needed

import { Form } from 'react-bootstrap';
import { ExclamationCircleFill } from 'react-bootstrap-icons';
import { useAtom, useAtomValue } from 'jotai';
import logoCrusaderVanilla from '../../../assets/game-assets/logo-crusader-vanilla.png';
import logoCrusaderExtreme from '../../../assets/game-assets/logo-crusader-extreme.png';
import GameStarter from './game-starter/game-starter';
import FreeArgs from './launch-options/free-args';
import FreeEnvs from './launch-options/free-envs';
import {
  UcpConsoleLogLevel,
  UcpFileLogLevel,
} from './launch-options/verbosity-args';
import { CONFIG_DIRTY_STATE_ATOM } from '../common/buttons/config-serialized-state';
import GameDataPath from './launch-options/game-data-path';
import * as GuiSettings from '../../../function/gui-settings/settings';
import { saveCurrentConfig } from '../common/save-config';
import Message from '../../general/message';
import UCP2_STATE_ATOM from '../../../function/game-files/game-ucp2-check';
import GAME_VERSION_ATOM from '../../../function/game-files/game-version-state';
import EXE_PATHS_ATOM from '../../../function/game-files/game-path';
import { LAUNCH_OPTION_DISPLAY_ATOM } from './launch-options/option-display';
import { LAUNCH_OPTION_NO_SECURITY_ATOM } from './launch-options/option-security';
import { LAUNCH_OPTION_CONSOLE_SHOW_ATOM } from './launch-options/option-console-show';
import { LAUNCH_OPTION_GAME_DATA_PATH_ATOM } from './launch-options/option-game-data-path';
import {
  UCP_CONSOLE_ARG,
  UCP_CONSOLE_VERBOSITY_ARG,
  UCP_FILE_VERBOSITY_ARG,
  UCP_GAME_DATA_PATH_ARG,
  UCP_NO_CONSOLE_ARG,
  UCP_NO_SECURITY_ARG,
  UCP_SECURITY_ARG,
} from './launch-options/ucp-args';
import { LAUNCH_OPTION_LOG_LEVEL_FILE_ARG_ATOM } from './launch-options/option-log-level-file';
import { LAUNCH_OPTION_LOG_LEVEL_CONSOLE_ARG_ATOM } from './launch-options/option-log-level-console';
import { LAUNCH_OPTION_ENVIRONMENT_VARIABLES_ATOM } from './launch-options/option-environment-variables';
import Logger from '../../../util/scripts/logging';
import { getStore } from '../../../hooks/jotai/base';
import { LAUNCH_OPTION_COMMAND_LINE_ARGUMENTS_TOKENS_ATOM } from './launch-options/option-command-line-arguments';
import { STATUS_BAR_MESSAGE_ATOM } from '../../footer/footer';
import { NOT_INSTALLED_ATOM } from '../display-logic';

const LOGGER = new Logger('launch.tsx');

export default function Launch() {
  const [displayAdvancedLaunchOptions, setDisplayAdvancedLaunchOptions] =
    useAtom(LAUNCH_OPTION_DISPLAY_ATOM);
  const [noSecurity, setNoSecurity] = useAtom(LAUNCH_OPTION_NO_SECURITY_ATOM);
  const [consoleShow, setConsoleShow] = useAtom(
    LAUNCH_OPTION_CONSOLE_SHOW_ATOM,
  );
  const gameDataPath = useAtomValue(LAUNCH_OPTION_GAME_DATA_PATH_ATOM);

  const configurationDirtyState = useAtomValue(CONFIG_DIRTY_STATE_ATOM);

  const [autoSave, setAutoSave] = useAtom(GuiSettings.AUTOSAVE_ON_LAUNCH);

  const fileVerbosity = useAtomValue(LAUNCH_OPTION_LOG_LEVEL_FILE_ARG_ATOM);
  const consoleVerbosity = useAtomValue(
    LAUNCH_OPTION_LOG_LEVEL_CONSOLE_ARG_ATOM,
  );

  const envVars = useAtomValue(LAUNCH_OPTION_ENVIRONMENT_VARIABLES_ATOM);

  const receiveArgs = () => {
    const args = new Array<string>();

    args.push(noSecurity ? UCP_NO_SECURITY_ARG : UCP_SECURITY_ARG);
    args.push(consoleShow ? UCP_CONSOLE_ARG : UCP_NO_CONSOLE_ARG);

    if (gameDataPath !== undefined && gameDataPath.length > 0) {
      args.push(UCP_GAME_DATA_PATH_ARG);
      args.push(gameDataPath);
    }

    args.push(UCP_FILE_VERBOSITY_ARG);
    args.push(fileVerbosity);

    args.push(UCP_CONSOLE_VERBOSITY_ARG);
    args.push(consoleVerbosity);

    getStore()
      .get(LAUNCH_OPTION_COMMAND_LINE_ARGUMENTS_TOKENS_ATOM)
      .forEach((tok) => args.push(tok));

    LOGGER.msg(args.join(' ')).info();
    LOGGER.msg(
      JSON.stringify(
        getStore().get(GuiSettings.LAUNCH_SETTINGS_ATOM),
        undefined,
        2,
      ),
    ).info();

    return args;
  };
  const receiveEnvs = () => envVars;

  const active = !useAtomValue(NOT_INSTALLED_ATOM);

  return (
    <div className="launch__container flex-default">
      <div className="launch__boxes">
        <GameStarter
          exeType="vanilla"
          imagePath={logoCrusaderVanilla}
          pathAtom={EXE_PATHS_ATOM}
          versionAtom={GAME_VERSION_ATOM}
          ucp2CheckAtom={UCP2_STATE_ATOM}
          receiveArgs={receiveArgs}
          receiveEnvs={receiveEnvs}
          beforeLaunch={() => {
            if (autoSave) {
              saveCurrentConfig();
            }
          }}
        />
        <GameStarter
          exeType="extreme"
          imagePath={logoCrusaderExtreme}
          pathAtom={EXE_PATHS_ATOM}
          versionAtom={GAME_VERSION_ATOM}
          ucp2CheckAtom={UCP2_STATE_ATOM}
          receiveArgs={receiveArgs}
          receiveEnvs={receiveEnvs}
          beforeLaunch={() => {
            if (autoSave) {
              saveCurrentConfig();
            }
          }}
        />
      </div>
      {/* eslint-disable-next-line react/jsx-no-useless-fragment */}
      {active ? (
        <>
          <div
            className={`d-flex align-self-start ps-4 ${
              configurationDirtyState && !autoSave ? '' : 'd-none'
            }`}
            style={{
              lineHeight: '1.5rem',
            }}
          >
            <ExclamationCircleFill color="yellow" size={20} />
            <span className="ps-3">
              <em>
                <Message message="launch.unsaved" />
              </em>
            </span>
          </div>
          <div className="d-flex align-self-start">
            <Form.Switch
              variant="link"
              checked={displayAdvancedLaunchOptions}
              id="display-launch-options-switch"
              onChange={() => {
                setDisplayAdvancedLaunchOptions(!displayAdvancedLaunchOptions);
              }}
              onClick={() =>
                setDisplayAdvancedLaunchOptions(!displayAdvancedLaunchOptions)
              }
              className="ps-5"
              label={<Message message="launch.options.view" />}
            />
            <Form.Switch
              label={<Message message="launch.options.autoSave" />}
              checked={autoSave}
              id="save-config-before-launch-switch"
              onClick={() => setAutoSave(!autoSave)}
              onChange={() => {
                setAutoSave(!autoSave);
              }}
              className="ps-5"
            />
          </div>
          <div className="d-flex align-self-start" />
          <div
            className={
              displayAdvancedLaunchOptions
                ? 'flex-default launch__options'
                : 'd-none'
            }
          >
            <h4>
              <Message message="launch.options" />
            </h4>
            <div className="parchment-box launch__options__box">
              <div className="launch__options__box__row">
                <GameDataPath />
              </div>
              <div className="launch__options__box__row">
                <div
                  className="launch__options__box--ucp-checkbox"
                  onClick={() => setConsoleShow(!consoleShow)}
                  onMouseEnter={() => {
                    getStore().set(
                      STATUS_BAR_MESSAGE_ATOM,
                      'launch.options.console.show.help',
                    );
                  }}
                  onMouseLeave={() => {
                    getStore().set(STATUS_BAR_MESSAGE_ATOM, undefined);
                  }}
                >
                  <h5>
                    <Message message="launch.options.console.show" />
                  </h5>
                  <input
                    type="checkbox"
                    checked={consoleShow}
                    onChange={() => setConsoleShow(!consoleShow)}
                  />
                </div>
                <div
                  className="launch__options__box--ucp-checkbox"
                  onClick={() => setNoSecurity(!noSecurity)}
                  onMouseEnter={() => {
                    getStore().set(
                      STATUS_BAR_MESSAGE_ATOM,
                      'launch.options.disable.security.help',
                    );
                  }}
                  onMouseLeave={() => {
                    getStore().set(STATUS_BAR_MESSAGE_ATOM, undefined);
                  }}
                >
                  <h5>
                    <Message message="launch.options.disable.security" />
                  </h5>
                  <input
                    type="checkbox"
                    checked={noSecurity}
                    onChange={() => setNoSecurity(!noSecurity)}
                  />
                </div>
              </div>
              <div className="launch__options__box__row">
                <UcpFileLogLevel />
                <UcpConsoleLogLevel />
              </div>
              <div className="launch__options__box__row">
                <FreeArgs />
                <FreeEnvs />
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
