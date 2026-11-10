import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

type ListState<Row> =
  | { status: 'ready'; rows: Row[] }
  | { status: 'error' };

const EMPTY_ROWS: never[] = [];

export function useFocusedList<Key extends string, Row>(
  key: Key,
  load: (key: Key) => Promise<Row[]>,
  paused = false,
  preloadBeforeFocus = false,
) {
  type Entry = ListState<Row>;
  type AllTabs = Record<Key, Entry>;
  type Cache = Partial<AllTabs>;

  const [cache, setCache] = useState<Cache>({});
  
  const revision = useRef(0);
  const hasFocused = useRef(false);
  const warmedKey = useRef<Key | null>(null);

  useFocusEffect(useCallback(() => {
    if (paused) return;

    const refreshingPreloadedRows = !hasFocused.current && warmedKey.current === key;
    hasFocused.current = true;

    let active = true;
    const startRevision = revision.current;

    async function refresh() {
      try {
        const rows = await load(key);

        if (active && revision.current === startRevision) {
          setCache((current) => {
            const previous = current[key];
            if (
              refreshingPreloadedRows && previous?.status === 'ready' &&
              JSON.stringify(previous.rows) === JSON.stringify(rows)
            ) {
              return current;
            }
            return { ...current, [key]: { status: 'ready', rows } };
          });
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

  useEffect(() => {
    if (!preloadBeforeFocus || hasFocused.current || warmedKey.current !== null) {
      return;
    }

    let active = true;

    void load(key).then((rows) => {
      if (!active || hasFocused.current) return;
      warmedKey.current = key;
      setCache((current) => ({
        ...current,
        [key]: { status: 'ready', rows },
      }));
    }).catch((error) => {
      if (active && !hasFocused.current) {
        console.warn('Failed to preload list', key, error);
      }
    });

    return () => { active = false; };
  }, [key, load, preloadBeforeFocus]);

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