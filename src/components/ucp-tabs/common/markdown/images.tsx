import { ClassAttributes, ImgHTMLAttributes } from 'react';
import { JSX } from 'react/jsx-runtime';

// eslint-disable-next-line import/prefer-default-export
export function ResizeImage100PercentWidth(
  props: JSX.IntrinsicAttributes &
    ClassAttributes<HTMLImageElement> &
    ImgHTMLAttributes<HTMLImageElement>,
) {
  // eslint-disable-next-line jsx-a11y/alt-text, react/jsx-props-no-spreading
  return <img {...props} style={{ maxWidth: '100%' }} />;
}
