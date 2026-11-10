import { ActionIcon, type ActionIconName } from '@/components/icons/action-icon';
import { BlurView } from 'expo-blur';
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View
} from 'react-native';


type AppButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  rightSymbol?: string;
  rightIcon?: ActionIconName;
  nativeGlass?: boolean;
  variant?: 'default' | 'danger';
  keepTitleCentered?: boolean;
  compact?: boolean;
  iconOnly?: boolean;
  titleOffsetX?: number;
};

export function AppButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  rightSymbol,
  rightIcon,
  keepTitleCentered = false,
  compact = false,
  iconOnly = false,
  nativeGlass = false,
  variant = 'default',
  titleOffsetX = 0,
}: AppButtonProps) {
  const dark = useColorScheme() === 'dark';
  const unavailable = disabled || loading;
  const useNativeGlass =
    nativeGlass &&
    !unavailable &&
    isGlassEffectAPIAvailable() &&
    isLiquidGlassAvailable();

  const palette = dark
    ? {
        text: variant === 'danger' ? '#FF8A80' : '#A0B8FF',
        edgeTop: 'rgba(255, 255, 255, 0.45)',
        edgeLeft: 'rgba(255, 255, 255, 0.25)',
        edgeShadow: 'rgba(255, 255, 255, 0.12)',
        highlight: 'rgba(255, 255, 255, 0.18)',
      }
    : {
        text: variant === 'danger' ? '#C62828' : '#365BBC',
        edgeTop: 'rgba(255, 255, 255, 0.95)',
        edgeLeft: 'rgba(255, 255, 255, 0.75)',
        edgeShadow: 'rgba(54, 91, 188, 0.18)',
        highlight: 'rgba(255, 255, 255, 0.65)',
      };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{
        disabled: unavailable,
        busy: loading,
      }}
      disabled={unavailable}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.compact,
        iconOnly && styles.iconOnly,
        {
          opacity: unavailable ? 0.45 : pressed ? 0.75 : 1,
          transform: [
            { scale: pressed ? 0.985 : 1 },
          ],
        },
      ]}
    >
      {useNativeGlass ? (
        <GlassView
          glassEffectStyle="regular"
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            styles.nativeGlass,
          ]}
        />
      ) : (
        <>
          <BlurView
            intensity={15}
            tint="default"
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              styles.blur,
            ]}
          />

          <LinearGradient
            colors={[
              palette.highlight,
              'rgba(255, 255, 255, 0)',
            ]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            pointerEvents="none"
            style={styles.highlight}
          />

          <View
            pointerEvents="none"
            style={[
              styles.edge,
              {
                borderTopColor: palette.edgeTop,
                borderLeftColor: palette.edgeLeft,
                borderRightColor: palette.edgeShadow,
                borderBottomColor: palette.edgeShadow,
              },
            ]}
          />
        </>
      )}

      {loading && !iconOnly && (
        <ActivityIndicator
          color={palette.text}
          size="small"
        />
      )}

      {!iconOnly && (
        <Text
          style={[
            styles.label,
            compact && styles.compactLabel,
            {
              color: palette.text,
              transform: [{ translateX: titleOffsetX }],
            },
          ]}
        >
          {title}
        </Text>
      )}

      {rightIcon && !iconOnly && !keepTitleCentered && (
        <View pointerEvents="none" style={styles.actionIconSpacer} />
      )}

      {rightIcon && (
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={!iconOnly && styles.actionIcon}
        >
          {loading ? (
            <ActivityIndicator color={palette.text} size="small" />
          ) : (
            <ActionIcon name={rightIcon} color={palette.text} />
          )}
        </View>
      )}

      {rightSymbol && !iconOnly && (
        <View
            pointerEvents="none"
            style={[
            styles.symbolCircle,
            { borderColor: palette.text },
            ]}
        >
            <Text
            accessible={false}
            style={[
                styles.rightSymbol,
                { 
                  color: palette.text,
                },
            ]}
            >
            {rightSymbol}
            </Text>
        </View>
        )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 48,
    paddingVertical: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  iconOnly: { width: 48, height: 48, padding: 0, paddingHorizontal: 0, paddingVertical: 0 },
  compact: { paddingHorizontal: 6, paddingVertical: 6, gap: 4 },
  compactLabel: { fontSize: 14, flexShrink: 1 },
  blur: {
    opacity: 0.35,
  },
  highlight: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    height: '40%',
    borderTopLeftRadius: 11,
    borderTopRightRadius: 11,
  },
  edge: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 12,
    borderWidth: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  symbolCircle: {
    position: 'absolute',
    right: 12,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSymbol: {
    fontSize: 16,
    lineHeight: 20,
    textAlign: 'center',
  },
  nativeGlass: {
    borderRadius: 12,
  },
  actionLabel: {
    flexShrink: 1,
  },
  actionIconSpacer: {
    width: 20,
  },
  actionIcon: {
    position: 'absolute',
    right: 15,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});