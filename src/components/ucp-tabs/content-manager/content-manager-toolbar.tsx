import { useAtomValue } from 'jotai';
import { InstallButton } from './buttons/install-button';
import { CONTENT_INTERFACE_STATE_ATOM } from './state/atoms';
import { UninstallButton } from './buttons/uninstall-button';

// eslint-disable-next-line import/prefer-default-export
export function ContentManagerToolbar() {
  const interfaceState = useAtomValue(CONTENT_INTERFACE_STATE_ATOM);

  const containsInstalled =
    interfaceState.selected.filter((ce) => ce.installed).length > 0;

  return (
    <div className="extension-manager-control__box__buttons">
      <div className="" />
      <div className="extension-manager-control__box__buttons--apply-button">
        {containsInstalled ? <UninstallButton /> : <InstallButton />}
      </div>
    </div>
  );
}
