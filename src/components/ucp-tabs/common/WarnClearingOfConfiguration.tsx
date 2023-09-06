import { showGeneralModalOkCancel } from 'components/modals/ModalOkCancel';
import { GeneralOkCancelModalWindow } from 'function/global/types';

async function warnClearingOfConfiguration(
  configurationTouched: {
    [key: string]: boolean;
  },
  modalWindow: {
    generalOkCancelModalWindow: GeneralOkCancelModalWindow;
    setGeneralOkCancelModalWindow: (arg0: GeneralOkCancelModalWindow) => void;
  }
) {
  // Defer here to a processor for the current list of active extensions to yield the

  const touchedOptions = Object.entries(configurationTouched).filter(
    (pair) => pair[1] === true
  );
  if (touchedOptions.length > 0) {
    const confirmed = await showGeneralModalOkCancel({
      title: 'Warning',
      message:
        'Changing the active extensions will reset your configuration. Proceed anyway?',
      ok: 'Yes',
      cancel: 'No',
    });

    return confirmed;
  }

  return true;
}

export default warnClearingOfConfiguration;
