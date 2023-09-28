import { showGeneralModalOkCancel } from 'components/modals/ModalOkCancel';

async function warnClearingOfConfiguration(configurationTouched: {
  [key: string]: boolean;
}) {
  // Defer here to a processor for the current list of active extensions to yield the
  console.log('displaying warning');

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
