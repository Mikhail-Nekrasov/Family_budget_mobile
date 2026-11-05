import { useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';

const ROW_HEIGHT = 44;
const PADDING = ROW_HEIGHT * 2;

export type WheelOption = { value: number; label: string };

type Props = {
  label: string;
  options: readonly WheelOption[];
  value: number;
  onChange: (value: number) => void;
};

export function PeriodWheel({ label, options, value, onChange }: Props) {
  const list = useRef<FlatList<WheelOption>>(null);
  const dark = useColorScheme() === 'dark';
  const [initialIndex] = useState(() => Math.max(0, options.findIndex((option) => option.value === value)));
  const text = dark ? '#F0F3FA' : '#192238';
  const muted = dark ? '#A8B3C5' : '#6C7890';
  const accent = dark ? '#A0B8FF' : '#365BBC';

  function finishScroll(offset: number) {
    const index = Math.max(0, Math.min(options.length - 1, Math.round(offset / ROW_HEIGHT)));
    onChange(options[index].value);
  }

  return (
    <View style={styles.column}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
      <View style={styles.window}>
        <View
          pointerEvents="none"
          style={[
            styles.selection,
            {
              backgroundColor: dark ? 'rgba(160, 184, 255, 0.12)' : 'rgba(54, 91, 188, 0.08)',
              borderColor: dark ? '#333F52' : '#E0E5EE',
            },
          ]}
        />
        <FlatList
          ref={list}
          data={options}
          extraData={value}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
          keyExtractor={(item) => String(item.value)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          snapToInterval={ROW_HEIGHT}
          decelerationRate="fast"
          bounces={false}
          initialNumToRender={7}
          windowSize={5}
          maxToRenderPerBatch={15}
          scrollEventThrottle={32}
          onScroll={(event) => finishScroll(event.nativeEvent.contentOffset.y)}
          onMomentumScrollEnd={(event) => finishScroll(event.nativeEvent.contentOffset.y)}
          onScrollEndDrag={(event) => {
            if (!event.nativeEvent.velocity?.y) {
              finishScroll(event.nativeEvent.contentOffset.y);
            }
          }}
          renderItem={({ item, index }) => (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: item.value === value }}
              accessibilityLabel={`${label}: ${item.label}`}
              onPress={() => {
                list.current?.scrollToOffset({ offset: index * ROW_HEIGHT, animated: true });
                onChange(item.value);
              }}
              style={styles.item}
            >
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[
                  styles.value,
                  { color: item.value === value ? accent : muted, fontWeight: item.value === value ? '600' : '400' },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  window: {
    height: ROW_HEIGHT * 5,
    overflow: 'hidden',
  },
  selection: {
    position: 'absolute',
    top: PADDING,
    left: 0,
    right: 0,
    height: ROW_HEIGHT,
    borderWidth: 1,
    borderRadius: 12,
  },
  listContent: {
    paddingVertical: PADDING,
  },
  item: {
    height: ROW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  value: {
    fontSize: 20,
    textAlign: 'center',
  },
});
