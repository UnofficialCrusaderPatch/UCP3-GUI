// TODO: The whole thing is deeply linked to the config currently.
// As a result, every update to the object triggers a redraw of everything that uses the config
// Including every single option, despite only one of them changes.
// once the basic structure is set, here is a big place for optimization
// for example: the state is kept in the config, but also the elements,
// the config is not replaced, so it does not trigger a redraw of everything
// the number of warnings could be kept in an extra value, or be coupled with a redraw trigger;

import ConfigWarning from './ui-elements/ui-factory/ConfigWarning';
import CreateUCP2RadioGroup from './ui-elements/ui-factory/CreateUCP2RadioGroup';
import CreateUCP2Slider from './ui-elements/ui-factory/CreateUCP2Slider';
import CreateUCP2Switch from './ui-elements/ui-factory/CreateUCP2Switch';
import CreateUCP2SliderChoice from './ui-elements/ui-factory/CreateUCP2SliderChoice';

import CreateParagraph from './ui-elements/ui-factory/CreateParagraph';
import CreateGroup from './ui-elements/ui-factory/CreateGroup';
import CreateUIElement from './ui-elements/ui-factory/CreateUIElement';
import CreateGroupBox from './ui-elements/ui-factory/CreateGroupBox';
import CreateSlider from './ui-elements/ui-factory/CreateSlider';
import CreateSwitch from './ui-elements/ui-factory/CreateSwitch';
import CreateNumberInput from './ui-elements/ui-factory/CreateNumberInput';
import CreateChoice from './ui-elements/ui-factory/CreateChoice';
import CreateRadioGroup from './ui-elements/ui-factory/CreateRadioGroup';
import CreateSection from './ui-elements/ui-factory/CreateSection';
import NavSection from './ui-elements/ui-factory/navigation/NavSection';
import CreateSectionsNav from './ui-elements/ui-factory/CreateSectionsNav';
import CreateSections from './ui-elements/ui-factory/CreateSections';
import CreateCustomMenu from './ui-elements/ui-factory/CreateCustomMenu';

const UIFactory = {
  ConfigWarning,
  CreateUCP2RadioGroup,
  CreateUCP2Slider,
  CreateUCP2Switch,
  CreateUCP2SliderChoice,
  CreateParagraph,
  CreateGroup,
  CreateGroupBox,
  CreateSlider,
  CreateSwitch,
  CreateNumberInput,
  CreateChoice,
  CreateRadioGroup,
  CreateUIElement,
  CreateSection,
  NavSection,
  CreateSectionsNav,
  CreateSections,
  CreateCustomMenu,
};

// eslint-disable-next-line import/prefer-default-export
export { UIFactory };
