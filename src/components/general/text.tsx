/* eslint-disable react/require-default-props */
import { useAtomValue } from 'jotai';
import { Suspense } from 'react';
import {
  GUI_LOCALIZATION_ATOM,
  Message,
  MessageResolverAtom,
} from '../../localization/localization';

interface TextProps {
  message?: Message;
  alternativeSource?: MessageResolverAtom;
}

// usage for cases where node not directly applicable, but still inside React context
export function useText(alternativeSource?: MessageResolverAtom) {
  const resolveMessage = useAtomValue(
    alternativeSource ?? GUI_LOCALIZATION_ATOM,
  );
  return <T extends undefined | Message>(message: T) =>
    (!message ? null : resolveMessage(message)) as T extends undefined
      ? null
      : string;
}

function InnerText(props: TextProps) {
  const { message, alternativeSource } = props;
  const localize = useText(alternativeSource);
  return localize(message);
}

export default function Text(props: TextProps) {
  const { message, alternativeSource } = props;
  return (
    <Suspense>
      <InnerText message={message} alternativeSource={alternativeSource} />
    </Suspense>
  );
}
