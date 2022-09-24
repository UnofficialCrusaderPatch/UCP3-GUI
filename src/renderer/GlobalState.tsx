import { createContext } from 'react';
import { Extension } from '../common/config/common';

export default createContext({
  warnings: {},
  extensions: [],
  definition: { flat: [], hierarchical: { elements: [], sections: {} } },
} as {
  warnings: { [key: string]: unknown };
  extensions: Extension[];
  definition: {
    flat: object[];
    hierarchical: { elements: object[]; sections: { [key: string]: object } };
  };
});
