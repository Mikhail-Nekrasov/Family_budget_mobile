export type AccountOrderServerResponse = Readonly<{
  accountSyncIds: readonly string[];
  version: number;
}>;