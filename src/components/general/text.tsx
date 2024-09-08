/* eslint-disable react/require-default-props */
import { useAtomValue } from 'jotai';
import { Suspense } from 'react';
import {
  GUI_LOCALIZATION_ATOM,
  Message,
  MessageResolverAtom,
} from '../../localization/localization';

interface MessageProps {
  message: Message;
  alternativeSource?: MessageResolverAtom;
}

// usage for cases where node not directly applicable, but still inside React context
export function useText(alternativeSource?: MessageResolverAtom) {
  return useAtomValue(alternativeSource ?? GUI_LOCALIZATION_ATOM);
}

function InnerText(props: MessageProps) {
  const { message, alternativeSource } = props;
  const localize = useText(alternativeSource);
  return localize(message);
}

export default function Text(props: Partial<MessageProps>) {
  const { message, alternativeSource } = props;
  if (!message) {
    return null;
  }

  return (
    <Suspense>
      <InnerText message={message} alternativeSource={alternativeSource} />
    </Suspense>
  );
}
