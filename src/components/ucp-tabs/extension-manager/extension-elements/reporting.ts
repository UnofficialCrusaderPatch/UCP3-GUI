import { ExtensionsState } from '../../../../function/extensions/extensions-state';
import Logger, { ConsoleLogger } from '../../../../util/scripts/logging';
import { showModalOkCancel } from '../../../modals/modal-ok-cancel';

const LOGGER = new Logger('reporting.ts');

export default async function reportAndConfirmBuildResult(
  res: ExtensionsState,
) {
  if (res.configuration.statusCode !== 0) {
    if (res.configuration.statusCode === 2) {
      const msg = `Invalid extension configuration. New configuration has ${
        res.configuration.errors.length
      } errors. Try to proceed anyway?\n\n${res.configuration.errors.join(
        '\n\n',
      )}`;
      LOGGER.msg(msg).error();
      const confirmed1 = await showModalOkCancel({
        title: 'Error',
        message: msg,
      });
      if (!confirmed1) return false;
    }
    if (res.configuration.warnings.length > 0) {
      const msg = `Be warned, new configuration has ${
        res.configuration.warnings.length
      } warnings. Proceed anyway?\n\n${res.configuration.warnings.join(
        '\n\n',
      )}`;
      LOGGER.msg(msg).warn();
      const confirmed2 = await showModalOkCancel({
        title: 'Warning',
        message: msg,
      });
      if (!confirmed2) return false;
    }
  } else {
    LOGGER.msg('New configuration build without errors or warnings').info();
    ConsoleLogger.debug(res);
  }

  return true;
}
