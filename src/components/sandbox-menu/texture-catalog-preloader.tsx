import { useEffect } from 'react';
import { useAtomValue } from 'jotai';
import {
  ACTIVE_EXTENSIONS_FULL_ATOM,
  EXTENSIONS_ATOM,
} from '../../function/extensions/state/focus';
import { useCurrentGameFolder } from '../../function/game-folder/utils';
import { prepareTextureCatalog } from './texture-catalog-service';

export default function TextureCatalogPreloader() {
  const folder = useCurrentGameFolder();
  const active = useAtomValue(ACTIVE_EXTENSIONS_FULL_ATOM);
  const discovery = useAtomValue(EXTENSIONS_ATOM);
  useEffect(() => {
    if (
      folder &&
      active.some((extension) => extension.name === 'textureSwapper')
    ) {
      // Preparation is read-only. A failure is shown once, in the menu that
      // requests the catalog, rather than interrupting Content with dialogs.
      prepareTextureCatalog(folder, discovery, active).catch(() => {});
    }
  }, [folder, active, discovery]);
  return null;
}
