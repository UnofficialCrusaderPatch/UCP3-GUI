import { useAtomValue } from 'jotai';
import { useTranslation } from 'react-i18next';
import { Extension } from '../../../../config/ucp/common';
import { OverlayContentProps } from '../../../overlay/overlay';
import { EXTENSION_STATE_INTERFACE_ATOM } from '../../../../function/extensions/state/state';

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
    );

  const content = overrides.map((override) => (
    <p key={override.overridden.url}>
      The value for {override.overridden.url} as {override.overridden.qualifier}{' '}
      by {override.overridden.name} is being overridden by{' '}
      {override.overriding.name}
      <br />
      Value as {override.overridden.qualifier} by {override.overridden.name}:
      <br />
      {override.overridden.value instanceof Object
        ? '<object>'
        : `${override.overridden.value}`}
      <br />
      Value as {override.overriding.qualifier} by {override.overriding.name}:
      <br />
      {override.overriding.value instanceof Object
        ? '<object>'
        : `${override.overriding.value}`}
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
