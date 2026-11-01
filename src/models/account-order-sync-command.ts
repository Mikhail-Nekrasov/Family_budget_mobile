export type AccountOrderSyncCommand = Readonly<{
  commandId: string;
  ownerUsername: string;
  localRevision: number;
  expectedVersion: number;
  requestBody: string;
}>;