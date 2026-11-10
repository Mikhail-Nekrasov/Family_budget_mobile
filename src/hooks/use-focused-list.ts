import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

type ListState<Row> =
  | { status: 'ready'; rows: Row[] }
  | { status: 'error' };

const EMPTY_ROWS: never[] = [];

export function useFocusedList<Key extends string, Row>(
  key: Key,
  load: (key: Key) => Promise<Row[]>,
  paused = false,
) {
  type Entry = ListState<Row>;
  type AllTabs = Record<Key, Entry>;
  type Cache = Partial<AllTabs>;

  const [cache, setCache] = useState<Cache>({});
  
  const revision = useRef(0);

  useFocusEffect(useCallback(() => {
    if (paused) return;

    let active = true;
    const startRevision = revision.current;

    async function refresh() {
      try {
        const rows = await load(key);

        if (active && revision.current === startRevision) {
          setCache((current) => ({
            ...current,
            [key]: { status: 'ready', rows },
          }));
        }
      } catch (error) {
        if (!active || revision.current !== startRevision) return;

        console.warn('Failed to refresh list', key, error);
        setCache((current) => current[key]
          ? current
          : { ...current, [key]: { status: 'error' } });
      }
    }

    void refresh();

    return () => {
      active = false;
    };
  }, [key, load, paused]));

  function setRows(rows: Row[]) {
    revision.current += 1;
    setCache((current) => ({
      ...current,
      [key]: { status: 'ready', rows },
    }));
  }

  const entry = cache[key];

  return {
    rows: entry?.status === 'ready' ? entry.rows : EMPTY_ROWS,
    status: entry?.status ?? 'loading',
    setRows,
  };
}