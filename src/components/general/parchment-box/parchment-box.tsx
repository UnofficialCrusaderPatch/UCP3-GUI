/* eslint-disable react/require-default-props */
import './parchment-box.css';

import { ReactNode } from 'react';

export default function ParchmentBox({
  children,
  className = '',
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`parchment-box${className ? ' ' : ''}${className}`}>
      {children}
    </div>
  );
}
