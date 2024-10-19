/* eslint-disable react/jsx-props-no-spreading */
import './launch.css';
import './launch-options/launch-options.css'; // currently imported here, als long as single files not needed

import { useRef, useState } from 'react';
import { Form } from 'react-bootstrap';
import { ExclamationCircleFill } from 'react-bootstrap-icons';
import { useAtom, useAtomValue } from 'jotai';
import logoCrusaderVanilla from '../../../assets/game-assets/logo-crusader-vanilla.png';
import logoCrusaderExtreme from '../../../assets/game-assets/logo-crusader-extreme.png';
import GameStarter from './game-starter/game-starter';
import { createLaunchOptionFuncs } from './launch-options/launch-options';
import FreeArgs from './launch-options/free-args';
import FreeEnvs from './launch-options/free-envs';
import {
  UcpConsoleLogLevel,
  UcpLogLevel,
} from './launch-options/verbosity-args';
import { CONFIG_DIRTY_STATE_ATOM } from '../common/buttons/config-serialized-state';
import GameDataPath from './launch-options/game-data-path';
import * as GuiSettings from '../../../function/gui-settings/settings';
import { saveCurrentConfig } from '../common/save-config';
import Message from '../../general/message';
import UCP2_STATE_ATOM from '../../../function/game-files/game-ucp2-check';
import GAME_VERSION_ATOM from '../../../function/game-files/game-version-state';
import EXE_PATHS_ATOM from '../../../function/game-files/game-path';

export default function Launch() {
  const internalArgs = useRef<Record<string, string[]>>({}).current;
  const internalEnvs = useRef<Record<string, Record<string, string>>>(
    {},
  ).current;

  const receiveArgs = () => Object.values(internalArgs).flat();
  const receiveEnvs = () => Object.assign({}, ...Object.values(internalEnvs));

  const [displayAdvancedLaunchOptions, setDisplayAdvancedLaunchOptions] =
    useState(false);

  const configurationDirtyState = useAtomValue(CONFIG_DIRTY_STATE_ATOM);

  const [autoSave, setAutoSave] = useAtom(GuiSettings.AUTOSAVE_ON_LAUNCH);

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
          <em>Note: you have unsaved changes in your configuration</em>
        </span>
      </div>
      <div className="d-flex align-self-start">
        <Form.Switch
          variant="link"
          defaultChecked={displayAdvancedLaunchOptions}
          id="display-launch-options-switch"
          onChange={(e) => setDisplayAdvancedLaunchOptions(e.target.checked)}
          className="ps-5"
          label={<Message message="launch.options.view" />}
        />
        <Form.Switch
          label="Save (apply) configuration before launching the game"
          defaultChecked={autoSave}
          id="save-config-before-launch-switch"
          onChange={(e) => setAutoSave(e.target.checked)}
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
            <GameDataPath
              {...createLaunchOptionFuncs(
                'GAME_DATA_PATH_ARGS',
                internalArgs,
                internalEnvs,
              )}
            />
          </div>
          <div className="launch__options__box__row">
            <UcpLogLevel
              {...createLaunchOptionFuncs(
                'UCP_LOG_ARGS',
                internalArgs,
                internalEnvs,
              )}
            />
            <UcpConsoleLogLevel
              {...createLaunchOptionFuncs(
                'UCP_CONSOLE_LOG_ARGS',
                internalArgs,
                internalEnvs,
              )}
            />
          </div>
          <div className="launch__options__box__row">
            <FreeArgs
              {...createLaunchOptionFuncs(
                'FREE_ARGS',
                internalArgs,
                internalEnvs,
              )}
            />
            <FreeEnvs
              {...createLaunchOptionFuncs(
                'FREE_ENVS',
                internalArgs,
                internalEnvs,
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
