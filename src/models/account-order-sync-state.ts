export type AccountOrderSyncState = {
  serverOwnerUsername: string | null;
  serverVersion: number | null;
  localRevision: number;
  syncedRevision: number;
};