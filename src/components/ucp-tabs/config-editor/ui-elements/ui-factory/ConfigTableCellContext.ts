import { createContext } from 'react';
import { ConfigTableColumn } from '../../../../../config/ucp/common';

/** Table choices: controls still own their configuration and validation. */
const ConfigTableCellContext = createContext<{
  label: string;
  choices?: ConfigTableColumn['choices'];
  unselectedValues?: ConfigTableColumn['unselectedValues'];
} | null>(null);

export default ConfigTableCellContext;
