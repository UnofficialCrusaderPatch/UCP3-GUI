export type NewsMeta = {
  timestamp: Date;
  category: 'framework' | 'frontend' | 'store' | 'community' | 'error';
};

export type NewsElement = {
  meta: NewsMeta;
  content: string;
};

export type News = NewsElement[];
