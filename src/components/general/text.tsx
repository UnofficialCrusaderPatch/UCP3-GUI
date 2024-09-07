/* eslint-disable react/require-default-props */
import { useAtomValue } from 'jotai';
import {
  GUI_LOCALIZATION_ATOM,
  Message,
  MessageResolverAtom,
} from '../../localization/localization';

interface TextProps {
  message: Message;
  alternativeSource?: MessageResolverAtom;
}

export default function Text(props: TextProps) {
  const { message, alternativeSource } = props;
  const resolveMessage = useAtomValue(
    alternativeSource ?? GUI_LOCALIZATION_ATOM,
  );
  return resolveMessage(message);
}
