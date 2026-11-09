import { useRef } from 'react';
import type { GestureResponderEvent } from 'react-native';

export function useDismissOnOutsideTap(open: boolean, onDismiss: () => void) {
  const outsideTouch = useRef<{ x: number; y: number } | null>(null);

  function onTouchStartCapture({ nativeEvent }: GestureResponderEvent) {
    outsideTouch.current = open && nativeEvent.touches.length === 1
      ? { x: nativeEvent.pageX, y: nativeEvent.pageY }
      : null;
  }

  function clearTouch() {
    outsideTouch.current = null;
  }

  function onTouchEndCapture({ nativeEvent }: GestureResponderEvent) {
    const start = outsideTouch.current;
    clearTouch();

    if (open && start && Math.hypot(
      nativeEvent.pageX - start.x,
      nativeEvent.pageY - start.y,
    ) <= 8) {
      onDismiss();
    }
  }

  return {
    outsideTapHandlers: {
      onTouchStartCapture,
      onTouchEndCapture,
      onTouchCancelCapture: clearTouch,
    },
    markInsideTouch: clearTouch,
  };
}