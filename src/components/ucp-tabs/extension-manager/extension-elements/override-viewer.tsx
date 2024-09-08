import { useAtomValue } from 'jotai';
import Markdown, { Components } from 'react-markdown';
import { Extension } from '../../../../config/ucp/common';
import { OverlayContentProps } from '../../../overlay/overlay';
import { EXTENSION_STATE_INTERFACE_ATOM } from '../../../../function/extensions/state/state';
import { compareObjects } from '../../../../util/scripts/objectCompare';
import Text from '../../../general/text';

/* eslint-disable react/jsx-props-no-spreading */
const theme = {
  strong(props) {
    const { node, ...rest } = props;
    return <span style={{ color: 'green' }} {...rest} />;
  },
  em(props) {
    const { node, ...rest } = props;
    return <span style={{ color: 'red' }} {...rest} />;
  },
} as Partial<Components>;

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

  const content = overrides
    .map(
      (override) =>
        `
${override.overridden.url}:
1. ${override.overriding.name}  
   ${override.overriding.qualifier} value: ${override.overriding.value instanceof Object ? '<object>' : `(${override.overriding.value})`}  
   status: **applied**
2. ${override.overridden.name}  
   ${override.overridden.qualifier} value: ${override.overridden.value instanceof Object ? '<object>' : `(${override.overridden.value})`}  
   status: *overridden*`,
      // <p key={override.overridden.url}>
      //    {override.overridden.url} as {override.overridden.qualifier}{' '}
      //   by {override.overridden.name}{' '}
      //   {override.overridden.value instanceof Object
      //     ? ''
      //     : `(${override.overridden.value})`}{' '}
      //   is being overridden with a different value by {override.overriding.name}{' '}
      //   {override.overriding.value instanceof Object
      //     ? ''
      //     : `(${override.overriding.value})`}
      // </p>
    )
    .join('\n');

  return (
    <div className="credits-container">
      <h1 className="credits-title">Configuration Conflict Information</h1>
      <div
        className="parchment-box-dark credits-text-box"
        style={{
          backgroundImage: '',
        }}
      >
        <div
          className="credits-text text-light"
          style={{ fontFamily: 'monospace' }}
        >
          <Markdown components={theme}>{content}</Markdown>
        </div>
      </div>
      <button type="button" className="credits-close" onClick={closeFunc}>
        <Text message="close" />
      </button>
    </div>
  );
}
