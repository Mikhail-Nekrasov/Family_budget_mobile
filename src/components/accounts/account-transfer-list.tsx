import { createContext, useContext, useEffect, useRef, useState, type ComponentProps } from 'react';
import {
  FlatList,
  StyleSheet,
  View,
  useColorScheme,
  type FlatListProps,
  type LayoutRectangle,
} from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { AccountCard } from '@/components/accounts/account-card';
import type { Account } from '@/models/account';

type Frames = Record<string, LayoutRectangle>;
type Drag = { id: string; frame: LayoutRectangle; grabX: number; grabY: number };
type Point = { x: number; y: number };

const AnimatedAccountList = Animated.createAnimatedComponent(FlatList<Account>);
const DragFramesContext = createContext<SharedValue<Frames> | null>(null);
type AccountCellProps = ComponentProps<NonNullable<FlatListProps<Account>['CellRendererComponent']>>;

function AccountCell({ children, item, onFocusCapture, onLayout, style }: AccountCellProps) {
  const frames = useContext(DragFramesContext);
  const id = item.syncId;

  useEffect(() => () => {
    frames?.modify((current) => {
      'worklet';
      const next = { ...current };
      delete next[id];
      return next;
    });
  }, [frames, id]);

  return (
    <View
      style={style}
      onFocusCapture={onFocusCapture}
      onLayout={(event) => {
        onLayout?.(event);
        const frame = event.nativeEvent.layout;
        frames?.modify((current) => {
          'worklet';
          return { ...current, [id]: frame };
        });
      }}
    >
      {children}
    </View>
  );
}

function accountAt(frames: Frames, x: number, y: number) {
  'worklet';
  for (const id of Object.keys(frames)) {
    const frame = frames[id];
    if (
      x >= frame.x && x < frame.x + frame.width &&
      y >= frame.y && y < frame.y + frame.height
    ) {
      return id;
    }
  }
  return null;
}

type TransferAccountRowProps = {
  account: Account;
  locale: string;
  onPress: () => void;
  onLayout?: () => void;
  drag: SharedValue<Drag | null>;
  target: SharedValue<string | null>;
  sourceColor: string;
  targetColor: string;
};

function TransferAccountRow({
  account,
  locale,
  onPress,
  onLayout,
  drag,
  target,
  sourceColor,
  targetColor,
}: TransferAccountRowProps) {
  const id = account.syncId;
  const outline = useAnimatedStyle(() => {
    const source = drag.value?.id === id;
    const destination = target.value === id;

    return {
      borderColor: source ? sourceColor : targetColor,
      opacity: source || destination ? 1 : 0,
    };
  });

  return (
    <View onLayout={onLayout}>
      <AccountCard account={account} locale={locale} onPress={onPress} />
      <Animated.View pointerEvents="none" style={[styles.outline, outline]} />
    </View>
  );
}

type AccountTransferListProps = {
  accounts: Account[];
  locale: string;
  enabled: boolean;
  empty: FlatListProps<Account>['ListEmptyComponent'];
  contentStyle: FlatListProps<Account>['contentContainerStyle'];
  onOpen: (account: Account) => void;
  onFirstCardLayout?: () => void;
  onTransfer: (fromId: string, toId: string) => void;
};

export function AccountTransferList({
  accounts,
  locale,
  enabled,
  empty,
  contentStyle,
  onOpen,
  onFirstCardLayout,
  onTransfer,
}: AccountTransferListProps) {
  const ignorePressUntil = useRef(0);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const previewAccount = accounts.find((account) => account.syncId === previewId);
  const dark = useColorScheme() === 'dark';
  const sourceColor = dark ? '#A0B8FF' : '#365BBC';
  const targetColor = dark ? '#7BD4B0' : '#217E5D';

  const list = useAnimatedRef<FlatList<Account>>();
  const frames = useSharedValue<Frames>({});
  const drag = useSharedValue<Drag | null>(null);
  const point = useSharedValue<Point>({ x: 0, y: 0 });
  const scrollY = useSharedValue(0);
  const viewportHeight = useSharedValue(0);
  const contentHeight = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.set(event.contentOffset.y);
  });

  const target = useDerivedValue(() => {
    const active = drag.value;
    const { x, y } = point.value;
    if (!active || y < 0 || y >= viewportHeight.value) return null;

    const id = accountAt(frames.value, x, y + scrollY.value);
    return id !== active.id ? id : null;
  });

  const previewStyle = useAnimatedStyle(() => {
    const active = drag.value;
    if (!active) return { opacity: 0 };

    return {
      opacity: 0.9,
      width: active.frame.width,
      transform: [
        { translateX: point.value.x - active.grabX },
        { translateY: point.value.y - active.grabY },
        { scale: 0.88 },
      ],
    };
  });

  const autoScroll = useFrameCallback(({ timeSincePreviousFrame }) => {
    if (!drag.value || !timeSincePreviousFrame) return;

    const y = point.value.y;
    const height = viewportHeight.value;
    const edge = Math.min(48, height / 4);
    if (!edge || y < 0 || y >= height) return;

    const speed = y < edge
      ? -(1 - y / edge)
      : y > height - edge ? (y - (height - edge)) / edge : 0;
    if (!speed) return;

    const maxOffset = Math.max(0, contentHeight.value - height);
    const next = Math.max(0, Math.min(
      maxOffset,
      scrollY.value + speed * Math.min(timeSincePreviousFrame, 34) * 0.45,
    ));
    if (next !== scrollY.value) scrollTo(list, 0, next, false);
  }, false);

  useEffect(() => {
    autoScroll.setActive(previewId !== null);
    return () => autoScroll.setActive(false);
  }, [autoScroll, previewId]);

  function startTransfer(fromId: string) {
    ignorePressUntil.current = Infinity;
    setPreviewId(fromId);
  }

  function finishTransfer(fromId: string, toId: string | null) {
    ignorePressUntil.current = Date.now() + 150;
    setPreviewId(null);
    if (toId) onTransfer(fromId, toId);
  }

  const pan = usePanGesture({
    enabled,
    maxPointers: 1,
    activateAfterLongPress: 450,
    shouldCancelWhenOutside: false,
    onActivate: ({ x, y }) => {
      'worklet';
      const id = accountAt(frames.value, x, y + scrollY.value);
      if (!id) return;

      const frame = frames.value[id];
      point.set({ x, y });
      drag.set({
        id,
        frame,
        grabX: x - frame.x,
        grabY: y + scrollY.value - frame.y,
      });
      scheduleOnRN(startTransfer, id);
    },
    onUpdate: ({ x, y }) => {
      'worklet';
      if (drag.value) point.set({ x, y });
    },
    onDeactivate: ({ x, y, canceled }) => {
      'worklet';
      const active = drag.value;
      if (!active) return;

      const destination = canceled || y < 0 || y >= viewportHeight.value
        ? null
        : accountAt(frames.value, x, y + scrollY.value);
      drag.set(null);
      scheduleOnRN(finishTransfer, active.id, destination === active.id ? null : destination);
    },
  });

  return (
    <DragFramesContext.Provider value={frames}>
      <GestureDetector gesture={pan}>
        <View
          collapsable={false}
          style={styles.viewport}
          onLayout={(event) => viewportHeight.set(event.nativeEvent.layout.height)}
        >
          <AnimatedAccountList
            ref={list}
            data={accounts}
            keyExtractor={(account) => account.syncId}
            CellRendererComponent={AccountCell}
            contentContainerStyle={contentStyle}
            contentInsetAdjustmentBehavior="never"
            ListEmptyComponent={empty}
            scrollEnabled={previewId === null}
            onScroll={onScroll}
            scrollEventThrottle={16}
            onContentSizeChange={(_, height) => contentHeight.set(height)}
            renderItem={({ item, index }) => (
              <TransferAccountRow
                account={item}
                locale={locale}
                onPress={() => {
                  if (Date.now() >= ignorePressUntil.current) onOpen(item);
                }}
                onLayout={index === 0 ? onFirstCardLayout : undefined}
                drag={drag}
                target={target}
                sourceColor={sourceColor}
                targetColor={targetColor}
              />
            )}
          />
          {previewAccount && (
            <Animated.View
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[
                styles.preview,
                { backgroundColor: dark ? '#1C2432' : '#F5F6F9' },
                previewStyle,
              ]}
            >
              <AccountCard account={previewAccount} locale={locale} onPress={() => {}} />
              <View style={[styles.outline, { borderColor: sourceColor }]} />
            </Animated.View>
          )}
        </View>
      </GestureDetector>
    </DragFramesContext.Provider>
  );
}

const styles = StyleSheet.create({
  viewport: {
    flex: 1,
    overflow: 'hidden',
  },
  outline: {
    ...StyleSheet.absoluteFill,
    borderWidth: 2,
    borderRadius: 16,
  },
  preview: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: 16,
  },
});
