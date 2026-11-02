import type { EntryType } from '@/models/entry-type';

export type Entry = {
  syncId: string;
  serverId: number | null;
  serverVersion: number | null;
  title: string;
  type: EntryType;
  amountMinor: number;
  dateTime: string;
  description: string | null;
  accountSyncId: string;
  categorySyncId: string;
};