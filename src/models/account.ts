export type Account = {
  syncId: string;
  serverId: number | null;
  serverVersion: number | null;

  name: string;
  description: string | null;

  currencyCode: string;
  iconKey: string;

  openingBalanceMinor: number;
  balanceMinor: number;
};