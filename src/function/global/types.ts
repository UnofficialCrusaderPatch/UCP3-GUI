export type Warning = {
  text: string;
  level: 'error' | 'warning' | 'info';
};

export type UIDefinition = {
  flat: object[];
  hierarchical: { elements: object[]; sections: { [key: string]: object } };
};
