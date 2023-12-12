import { showModalOkCancel } from 'components/modals/ModalOkCancel';
import Logger from 'util/scripts/logging';

const LOGGER = new Logger('WarnClearingOfConfiguration.tsx');

async function warnClearingOfConfiguration(configurationTouched: {
  [key: string]: boolean;
}) {
  // Defer here to a processor for the current list of active extensions to yield the
  LOGGER.msg('Displaying warning').info();

  const touchedOptions = Object.entries(configurationTouched).filter(
    (pair) => pair[1] === true,
  );
  if (touchedOptions.length > 0) {
    const confirmed = await showModalOkCancel({
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
