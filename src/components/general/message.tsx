/* eslint-disable react/require-default-props */
import { useAtomValue } from 'jotai';
import { Suspense } from 'react';
import {
  GUI_LOCALIZATION_ATOM,
  MessageType,
  MessageResolverAtom,
} from '../../localization/localization';

interface MessageProps {
  message: MessageType;
  alternativeSource?: MessageResolverAtom;
}

// usage for cases where node not directly applicable, but still inside React context
export function useMessage(alternativeSource?: MessageResolverAtom) {
  return useAtomValue(alternativeSource ?? GUI_LOCALIZATION_ATOM);
}

function InnerMessage(props: MessageProps) {
  const { message, alternativeSource } = props;
  const localize = useMessage(alternativeSource);
  return localize(message);
}

export default function Message(props: Partial<MessageProps>) {
  const { message, alternativeSource } = props;
  if (!message) {
    return null;
  }

  return (
    <Suspense>
      <InnerMessage message={message} alternativeSource={alternativeSource} />
    </Suspense>
  );
}
