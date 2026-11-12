import { useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { IconSelectOption } from '@/components/compact-icon-select';

type IconSelectGroup = {
  id: string;
  title: string;
  options: readonly IconSelectOption[];
};

export type IconSelectPage =
  | IconSelectGroup
  | { id: string; title: string; groups: readonly IconSelectGroup[] };

type GridRow =
  | { id: string; kind: 'heading'; title: string }
  | { id: string; kind: 'icons'; options: readonly IconSelectOption[] };

const COLUMN_COUNT = 4;

function makeRows(page: IconSelectPage): GridRow[] {
  const rows: GridRow[] = [];

  function addIcons(group: IconSelectGroup) {
    for (let offset = 0; offset < group.options.length; offset += COLUMN_COUNT) {
      rows.push({
        id: `${group.id}:${offset}`,
        kind: 'icons',
        options: group.options.slice(offset, offset + COLUMN_COUNT),
      });
    }
  }

  if ('groups' in page) {
    for (const group of page.groups) {
      rows.push({ id: group.id, kind: 'heading', title: group.title });
      addIcons(group);
    }
  } else {
    addIcons(page);
  }

  return rows;
}

type Props = {
  pages: readonly IconSelectPage[];
  pendingValue: string | null;
  palette: { card: string; border: string; text: string; accent: string };
  renderOption: (option: IconSelectOption) => ReactNode;
};

export function IconOptionPager({ pages, pendingValue, palette, renderOption }: Props) {
  const [width, setWidth] = useState(0);
  const [activePage, setActivePage] = useState(0);
  const pager = useRef<ComponentRef<typeof ScrollView>>(null);

  return (
    <>
      <View
        style={styles.viewport}
        onLayout={({ nativeEvent }) => {
          const nextWidth = nativeEvent.layout.width;
          if (nextWidth !== width) {
            setWidth(nextWidth);
            setActivePage(0);
          }
        }}
      >
        {width > 0 && (
          <ScrollView
            key={width}
            ref={pager}
            style={styles.viewport}
            horizontal
            pagingEnabled
            directionalLockEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={({ nativeEvent }) => {
              const index = Math.round(nativeEvent.contentOffset.x / width);
              setActivePage(Math.max(0, Math.min(index, pages.length - 1)));
            }}
          >
            {pages.map((page, index) => (
              <View
                key={page.id}
                style={[styles.page, { width }]}
                accessibilityElementsHidden={index !== activePage}
                importantForAccessibility={index === activePage ? 'auto' : 'no-hide-descendants'}
              >
                <Text accessibilityRole="header" style={[styles.heading, { color: palette.text }]}>
                  {page.title}
                </Text>
                <FlatList
                  style={styles.viewport}
                  data={makeRows(page)}
                  extraData={pendingValue}
                  keyExtractor={(row) => row.id}
                  contentContainerStyle={styles.grid}
                  renderItem={({ item }) => item.kind === 'heading' ? (
                    <Text
                      accessibilityRole="header"
                      style={[styles.groupHeading, { color: palette.text }]}
                    >
                      {item.title}
                    </Text>
                  ) : (
                    <View style={styles.iconRow}>
                      {item.options.map((option) => (
                        <View key={option.value} style={styles.cell}>{renderOption(option)}</View>
                      ))}
                    </View>
                  )}
                />
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.pagination}>
        <View style={[styles.dots, { backgroundColor: palette.card, borderColor: palette.border }]}>
          {pages.map((page, index) => (
            <Pressable
              key={page.id}
              accessibilityRole="button"
              accessibilityLabel={page.title}
              accessibilityState={{ selected: index === activePage }}
              onPress={() => pager.current?.scrollTo({ x: index * width, animated: true })}
              style={styles.dotButton}
            >
              <View style={[
                styles.dot,
                { backgroundColor: index === activePage ? palette.accent : palette.text },
                index !== activePage && styles.inactiveDot,
              ]} />
            </Pressable>
          ))}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  viewport: { flex: 1 },
  page: { flexShrink: 0, height: '100%' },
  heading: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    fontSize: 17,
    fontWeight: '600',
  },
  grid: { paddingHorizontal: 16, paddingBottom: 16 },
  groupHeading: { paddingHorizontal: 4, marginTop: 8, marginBottom: 6, fontSize: 15, fontWeight: '600' },
  iconRow: { flexDirection: 'row' },
  cell: { width: '25%', padding: 4 },
  pagination: { alignItems: 'center', paddingHorizontal: 12, paddingTop: 6 },
  dots: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 288,
    paddingHorizontal: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
  },
  dotButton: {
    flex: 1,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  inactiveDot: { opacity: 0.3 },
});
