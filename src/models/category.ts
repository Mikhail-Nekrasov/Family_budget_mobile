import type { EntryType } from '@/models/entry-type';

export type Category = {
  syncId: string;
  serverId: number | null;
  serverVersion: number | null;
  name: string;
  iconKey: string;
  type: EntryType;
};