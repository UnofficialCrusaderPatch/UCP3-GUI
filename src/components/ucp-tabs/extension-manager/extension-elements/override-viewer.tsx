import { useAtomValue } from 'jotai';
import { useTranslation } from 'react-i18next';
import { Extension } from '../../../../config/ucp/common';
import { OverlayContentProps } from '../../../overlay/overlay';
import { EXTENSION_STATE_INTERFACE_ATOM } from '../../../../function/extensions/state/state';
import { compareObjects } from '../../../../util/scripts/objectCompare';

export type OverrideViewerProps = {
  extension: Extension;
};

export function OverrideViewer(
  props: OverlayContentProps<OverrideViewerProps>,
) {
  const { args, closeFunc } = props;
  const { extension } = args;

  const extensionsState = useAtomValue(EXTENSION_STATE_INTERFACE_ATOM);
  const overrides = extensionsState.configuration.overrides
    .get(extension.name)!
    .filter(
      (override) =>
        !override.overridden.url.endsWith('.menu') &&
        !override.overridden.url.endsWith('.defaultLanguage'),
    )
    .filter(
      (override) =>
        !compareObjects(override.overridden.value, override.overriding.value),
    );

  const content = overrides.map((override) => (
    <p key={override.overridden.url}>
      The value for {override.overridden.url} as {override.overridden.qualifier}{' '}
      by {override.overridden.name}{' '}
      {override.overridden.value instanceof Object
        ? ''
        : `(${override.overridden.value})`}{' '}
      is being overridden with a different value by {override.overriding.name}{' '}
      {override.overriding.value instanceof Object
        ? ''
        : `(${override.overriding.value})`}
    </p>
  ));

  const [t] = useTranslation(['gui-general', 'gui-landing', 'gui-editor']);

  return (
    <div className="credits-container">
      <h1 className="credits-title">Configuration Conflict Information</h1>
      <div
        className="parchment-box-dark credits-text-box"
        style={{
          backgroundImage: '',
        }}
      >
        <div className="credits-text text-light">{content}</div>
      </div>
      <button type="button" className="credits-close" onClick={closeFunc}>
        {t('gui-general:close')}
      </button>
    </div>
  );
}
