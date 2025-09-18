function createTouchedStyle(touched: boolean) {
  if (!touched) return ``;
  return `border-4 border-start border-primary`;
}

// eslint-disable-next-line import/prefer-default-export
export { createTouchedStyle };
