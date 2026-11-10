export type TransferHistoryItem = {
  syncId: string;
  fromAccountSyncId: string;
  toAccountSyncId: string;
  fromName: string;
  fromIconKey: string;
  fromIconColor: string | null;
  fromArchivedAt: string | null;
  toName: string;
  toIconKey: string;
  toIconColor: string | null;
  toArchivedAt: string | null;
  amountMinor: number;
  targetAmountMinor: number;
  sourceCurrencyCode: string;
  targetCurrencyCode: string;
  dateTime: string;
  description: string | null;
};
