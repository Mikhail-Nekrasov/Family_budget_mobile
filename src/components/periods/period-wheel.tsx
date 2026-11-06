import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';

const ROW_HEIGHT = 44;
const PADDING = ROW_HEIGHT * 2;
const CYCLES = 100;
const MIDDLE_CYCLE = Math.floor(CYCLES / 2);

export type WheelOption = {
  value: number;
  label: string;
};

export type PeriodWheelProps = {
  label: string;
  options: readonly WheelOption[];
  value: number;
  onChange: (value: number) => void;
  cyclic?: boolean;
};

export function PeriodWheel({
  label,
  options,
  value,
  onChange,
  cyclic: requestedCyclic = false,
}: PeriodWheelProps) {
  const cyclic = requestedCyclic && options.length > 1;
  const dark = useColorScheme() === 'dark';
  const list = useRef<FlatList<number>>(null);
  const count = options.length * (cyclic ? CYCLES : 1);
  const middle = cyclic ? MIDDLE_CYCLE * options.length : 0;
  const [initialIndex] = useState(() => middle + Math.max(
    0,
    options.findIndex((option) => option.value === value),
  ));
  const [scrollY] = useState(() => new Animated.Value(initialIndex * ROW_HEIGHT));
  const currentIndex = useRef(initialIndex);
  const publishedValue = useRef(value);
  const interacting = useRef(false);
  const lastFeedback = useRef(0);

  // Lightweight numeric positions, not React/native row components.
  const positions = useMemo(
    () => Array.from({ length: count }, (_, index) => index),
    [count],
  );
  const text = dark ? '#F0F3FA' : '#192238';
  const muted = dark ? '#A8B3C5' : '#6C7890';
  const accent = dark ? '#A0B8FF' : '#365BBC';

  useEffect(() => {
    if (interacting.current || value === publishedValue.current || options.length === 0) {
      return;
    }
    const optionIndex = options.findIndex((option) => option.value === value);
    if (optionIndex < 0) {
      return;
    }
    const cycle = cyclic ? Math.floor(currentIndex.current / options.length) : 0;
    const index = cycle * options.length + optionIndex;
    publishedValue.current = value;
    currentIndex.current = index;
    interacting.current = false;
    scrollY.setValue(index * ROW_HEIGHT);
    list.current?.scrollToOffset({ offset: index * ROW_HEIGHT, animated: false });
  }, [value, options, cyclic, scrollY]);

  function indexAt(offset: number): number {
    return Math.max(0, Math.min(count - 1, Math.round(offset / ROW_HEIGHT)));
  }

  const publish = useCallback((index: number, feedback: boolean) => {
    const option = options[index % options.length];
    if (!option) {
      return;
    }
    const changed = currentIndex.current !== index;
    currentIndex.current = index;

    if (changed && feedback && Platform.OS !== 'web') {
      const now = Date.now();
      // Avoid a queue of vibrations during a fast fling.
      if (now - lastFeedback.current >= 45) {
        lastFeedback.current = now;
        void Haptics.selectionAsync().catch(() => undefined);
      }
    }
    if (publishedValue.current !== option.value) {
      publishedValue.current = option.value;
      onChange(option.value);
    }
  }, [options, onChange]);

  useEffect(() => {
    const subscription = scrollY.addListener(({ value: offset }) => {
      if (interacting.current) {
        const index = Math.max(0, Math.min(count - 1, Math.round(offset / ROW_HEIGHT)));
        publish(index, true);
      }
    });
    return () => scrollY.removeListener(subscription);
  }, [scrollY, count, publish]);

  function settle(offset: number) {
    interacting.current = false;
    let index = indexAt(offset);
    publish(index, false);
    if (cyclic && (index < options.length * 2 || index >= count - options.length * 2)) {
      index = middle + index % options.length;
    }
    currentIndex.current = index;
    scrollY.setValue(index * ROW_HEIGHT);
    list.current?.scrollToOffset({ offset: index * ROW_HEIGHT, animated: false });
  }

  function select(index: number) {
    interacting.current = false;
    publish(index, true);
    list.current?.scrollToOffset({ offset: index * ROW_HEIGHT, animated: true });
  }

  return (
    <View
      style={styles.column}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: options.find((option) => option.value === value)?.label }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        const direction = event.nativeEvent.actionName === 'increment' ? 1 : -1;
        select(indexAt((currentIndex.current + direction) * ROW_HEIGHT));
      }}
    >
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
        <Animated.FlatList
          ref={list}
          data={positions}
          extraData={value}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
          keyExtractor={(index) => String(index)}
          contentContainerStyle={styles.listContent}
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          showsVerticalScrollIndicator={false}
          snapToInterval={ROW_HEIGHT}
          decelerationRate="fast"
          bounces={false}
          initialNumToRender={9}
          windowSize={5}
          maxToRenderPerBatch={10}
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true },
          )}
          onScrollBeginDrag={() => { interacting.current = true; }}
          onMomentumScrollEnd={(event) => settle(event.nativeEvent.contentOffset.y)}
          onScrollEndDrag={(event) => {
            if (!event.nativeEvent.velocity?.y) {
              settle(event.nativeEvent.contentOffset.y);
            }
          }}
          renderItem={({ item: index }) => {
            const option = options[index % options.length];
            const offset = index * ROW_HEIGHT;
            const inputRange = [offset - PADDING, offset, offset + PADDING];
            return (
              <Pressable onPress={() => select(index)} style={styles.item}>
                <Animated.View
                  pointerEvents="none"
                  style={{
                    opacity: scrollY.interpolate({
                      inputRange,
                      outputRange: [0.35, 1, 0.35],
                      extrapolate: 'clamp',
                    }),
                    transform: [
                      { perspective: 600 },
                      { rotateX: scrollY.interpolate({
                        inputRange,
                        outputRange: ['45deg', '0deg', '-45deg'],
                        extrapolate: 'clamp',
                      }) },
                      { scale: scrollY.interpolate({
                        inputRange,
                        outputRange: [0.85, 1, 0.85],
                        extrapolate: 'clamp',
                      }) },
                    ],
                  }}
                >
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    style={[
                      styles.value,
                      {
                        color: option.value === value ? accent : muted,
                        fontWeight: option.value === value ? '600' : '400',
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Animated.View>
              </Pressable>
            );
          }}
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
