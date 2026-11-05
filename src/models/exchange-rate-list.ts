export type RateListQuote = {
  currencyCode: string;
  rate: number;
  rateDate: string;
  fetchedAt: string;
};

export type RateListData = {
  baseCurrency: string;
  quotes: RateListQuote[];
};

export type RateListRow = {
  currencyCode: string;
  rate: number | null;
  sourceDate: string | null;
  targetDate: string | null;
  fetchedAt: string | null;
};
