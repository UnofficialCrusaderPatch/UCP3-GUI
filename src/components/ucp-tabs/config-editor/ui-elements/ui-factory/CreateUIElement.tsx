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
import CreateUCP2Switch from './CreateUCP2Switch';
import CreateCustomMenu from './CreateCustomMenu';
import CreateFileInput from './CreateFileInput';
import { useMessage } from '../../../../general/message';

const LOGGER = new Logger('CreateUIElement.tsx');

function CreateUIElement(args: {
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

export default CreateUIElement;
