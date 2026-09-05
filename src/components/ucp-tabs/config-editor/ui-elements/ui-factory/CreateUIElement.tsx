import { useAtomValue } from 'jotai';
import {
  CONFIGURATION_USER_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
} from '../../../../../function/configuration/state';
import { createSpecifiedStyleIfSpecifiedAndTouched } from './specified/SpecifiedStyle';
import { CREATOR_MODE_ATOM } from '../../../../../function/gui-settings/settings';
import QualifierControl from './QualifierControl';
import ResetSettingButton from './popover/ResetSettingButton';
import { settingRoots } from '../../../../../function/configuration/qualifiers';
import './common.css';
import './UCPAccordion.css';

import { DisplayConfigElement } from '../../../../../config/ucp/common';
import Logger from '../../../../../util/scripts/logging';
import CreateChoice from './CreateChoice';
// eslint-disable-next-line import/no-cycle
import CreateGroup from './CreateGroup';
// eslint-disable-next-line import/no-cycle
import CreateGroupBox from './CreateGroupBox';
import CreateNumberInput from './CreateNumberInput';
import CreateParagraph from './CreateParagraph';
import CreateRadioGroup from './CreateRadioGroup';
import CreateSlider from './CreateSlider';
import CreateSwitch from './CreateSwitch';
import CreateUCP2RadioGroup from './CreateUCP2RadioGroup';
import CreateUCP2Slider from './CreateUCP2Slider';
import CreateUCP2SliderChoice from './CreateUCP2SliderChoice';
// eslint-disable-next-line import/no-cycle
import CreateUCP2Switch from './CreateUCP2Switch';
import CreateCustomMenu from './CreateCustomMenu';
import CreateFileInput from './CreateFileInput';
import { useMessage } from '../../../../general/message';

const LOGGER = new Logger('CreateUIElement.tsx');

function CreateUIElementContent(args: {
  spec: DisplayConfigElement;
  disabled: boolean;
  className: string;
}) {
  const { spec, disabled, className } = args;

  const localize = useMessage();

  switch (spec.display) {
    case 'UCP2Slider':
      return (
        <CreateUCP2Slider
          spec={spec}
          disabled={disabled}
          className={className}
        />
      );
    case 'UCP2SliderChoice':
      return (
        <CreateUCP2SliderChoice
          spec={spec}
          disabled={disabled}
          className={className}
        />
      );
    case 'UCP2Switch':
      return (
        <CreateUCP2Switch
          spec={spec}
          disabled={disabled}
          className={className}
        />
      );
    case 'UCP2RadioGroup':
      return (
        <CreateUCP2RadioGroup
          spec={spec}
          disabled={disabled}
          className={className}
        />
      );
    case 'Slider':
      return (
        <CreateSlider spec={spec} disabled={disabled} className={className} />
      );
    case 'Paragraph':
      return (
        <CreateParagraph
          spec={spec}
          disabled={disabled}
          className={className}
        />
      );
    case 'Group':
      return (
        <CreateGroup spec={spec} disabled={disabled} className={className} />
      );
    case 'GroupBox':
      return (
        <CreateGroupBox spec={spec} disabled={disabled} className={className} />
      );
    case 'Switch':
      return (
        <CreateSwitch spec={spec} disabled={disabled} className={className} />
      );
    case 'Number':
      return (
        <CreateNumberInput
          spec={spec}
          disabled={disabled}
          className={className}
        />
      );
    case 'Choice':
      return (
        <CreateChoice spec={spec} disabled={disabled} className={className} />
      );
    case 'RadioGroup':
      return (
        <CreateRadioGroup
          spec={spec}
          disabled={disabled}
          className={className}
        />
      );

    case 'CustomMenu':
      return (
        <CreateCustomMenu
          spec={spec}
          disabled={disabled}
          className={className}
        />
      );
    case 'FileInput':
      return (
        <CreateFileInput
          spec={spec}
          disabled={disabled}
          className={className}
        />
      );
    default: {
      LOGGER.msg(
        localize({
          key: 'config.element.unsupported.type',
          args: spec,
        }),
      ).warn();
      return <div />;
    }
  }
}

function CreateUIElement(args: Parameters<typeof CreateUIElementContent>[0]) {
  const creator = useAtomValue(CREATOR_MODE_ATOM);
  const user = useAtomValue(CONFIGURATION_USER_REDUCER_ATOM);
  const touched = useAtomValue(CONFIGURATION_TOUCHED_REDUCER_ATOM);
  const { spec, disabled, className } = args;
  const roots = settingRoots(spec);
  const group = ['Group', 'GroupBox', 'CustomMenu'].includes(spec.display);
  if (!creator || !roots.length || ['Group', 'GroupBox'].includes(spec.display))
    return (
      <CreateUIElementContent
        spec={spec}
        disabled={disabled}
        className={className}
      />
    );
  return (
    <div
      className={`qualifier-row ${createSpecifiedStyleIfSpecifiedAndTouched(user, touched, roots[0])}`}
    >
      {!group && (
        <ResetSettingButton url={roots[0]} compact disabled={disabled} />
      )}
      <QualifierControl roots={roots} single={!group} disabled={disabled} />
      <div className="qualifier-value">
        <CreateUIElementContent
          spec={spec}
          disabled={disabled}
          className={className}
        />
      </div>
    </div>
  );
}
export default CreateUIElement;
