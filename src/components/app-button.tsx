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
import Svg, { Path } from 'react-native-svg';

const ACTION_ICON_PATHS = {
  check: 'M5 12l4 4L19 6',
  cancel: 'M19 12H5m6-6-6 6 6 6',
  delete: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7m4-7v7',
  archive: 'M3 4h18v5H3zM5 9v11h14V9M10 13h4',
  restore: 'M8 5l-4 4 4 4M4 9h11a5 5 0 0 1 0 10h-4',
  calendar: 'M4 6h16v14H4zM4 10h16M8 4v4m8-4v4',
  clock: 'M12 3a9 9 0 1 1 0 18 9 9 0 1 1 0-18zM12 7v5l3 2',
  refresh: 'M20 10a8 8 0 0 0-14-4L4 8m0-5v5h5m-5 6a8 8 0 0 0 14 4l2-2m0 5v-5h-5',
  dropdown: 'm6 9 6 6 6-6',
} as const;

type AppButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  rightSymbol?: string;
  rightIcon?: keyof typeof ACTION_ICON_PATHS;
  nativeGlass?: boolean;
  variant?: 'default' | 'danger';
  keepTitleCentered?: boolean;
  compact?: boolean;
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
  nativeGlass = false,
  variant = 'default',
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

      {loading && (
        <ActivityIndicator
          color={palette.text}
          size="small"
        />
      )}

      <Text
        style={[
          styles.label,
          compact && styles.compactLabel,
          { 
            color: palette.text,
          },
        ]}
      >
        {title}
      </Text>

      {rightIcon && !keepTitleCentered && (
        <View pointerEvents="none" style={styles.actionIconSpacer} />
      )}

      {rightIcon && (
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.actionIcon}
        >
          {loading ? (
            <ActivityIndicator color={palette.text} size="small" />
          ) : (
            <Svg width={20} height={20} viewBox="0 0 24 24">
              <Path
                d={ACTION_ICON_PATHS[rightIcon]}
                fill="none"
                stroke={palette.text}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          )}
        </View>
      )}

      {rightSymbol && (
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