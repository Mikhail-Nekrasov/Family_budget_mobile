import type { EntryType } from '@/models/entry-type';

import type { Language } from '@/i18n/languages';

export type Category = {
  syncId: string;
  serverId: number | null;
  serverVersion: number | null;
  name: string;
  defaultKey: string | null;
  nameOverrides: Partial<Record<Language, string>>;
  sortOrder: number;
  iconKey: string;
  iconColor: string | null;
  type: EntryType;
};