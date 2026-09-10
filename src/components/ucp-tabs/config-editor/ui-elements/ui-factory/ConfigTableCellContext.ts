import { createContext } from 'react';
import { ConfigTableColumn } from '../../../../../config/ucp/common';

/** Presentation only: controls still own their configuration and validation. */
const ConfigTableCellContext = createContext<{
  label: string;
  choices?: ConfigTableColumn['choices'];
} | null>(null);

export default ConfigTableCellContext;
