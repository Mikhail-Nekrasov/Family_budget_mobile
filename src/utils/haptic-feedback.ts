import * as Haptics from 'expo-haptics';

export function playSelectionFeedback(): void {
  void Haptics.selectionAsync().catch(() => undefined);
}

export function playCompletionFeedback(): void {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    .catch(() => undefined);
}