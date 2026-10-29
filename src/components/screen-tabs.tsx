import { BlurView } from 'expo-blur';
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';

type TabOption<Value extends string> = {
  value: Value;
  label: string;
};

type ScreenTabsProps<Value extends string> = {
  options: readonly TabOption<Value>[];
  value: Value;
  onChange: (value: Value) => void;
};

export function ScreenTabs<Value extends string>({
  options,
  value,
  onChange,
}: ScreenTabsProps<Value>) {
  const dark = useColorScheme() === 'dark';
  const useNativeGlass =
    isGlassEffectAPIAvailable() &&
    isLiquidGlassAvailable();

  const palette = dark
    ? {
        accent: '#A0B8FF',
        muted: '#A8B3C5',
        line: '#333F52',
      }
    : {
        accent: '#365BBC',
        muted: '#6C7890',
        line: '#E0E5EE',
      };

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.container,
        { borderBottomColor: palette.line },
      ]}
    >
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.tab,
              {
                borderBottomColor: selected
                  ? dark
                    ? 'rgba(255, 255, 255, 0.12)'
                    : 'rgba(54, 91, 188, 0.18)'
                  : 'transparent',
                opacity: useNativeGlass && selected
                  ? 1
                  : pressed
                    ? 0.6
                    : 1,
              },
            ]}
          >
            {selected && (
              useNativeGlass ? (
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
                      intensity={10}
                      tint={dark ? 'dark' : 'light'}
                      pointerEvents="none"
                      style={[
                        StyleSheet.absoluteFill,
                        { opacity: 0.5 },
                      ]}
                    />

                    <LinearGradient
                      colors={[
                        dark
                          ? 'rgba(255, 255, 255, 0.18)'
                          : 'rgba(255, 255, 255, 0.65)',
                        'rgba(255, 255, 255, 0)',
                      ]}
                      start={{ x: 0.2, y: 0 }}
                      end={{ x: 0.4, y: 1 }}
                      pointerEvents="none"
                      style={styles.glassHighlight}
                    />

                    <View
                      pointerEvents="none"
                      style={[
                        styles.glassEdge,
                        {
                          borderTopColor: dark
                            ? 'rgba(255, 255, 255, 0.45)'
                            : 'rgba(255, 255, 255, 0.95)',
                          borderLeftColor: dark
                            ? 'rgba(255, 255, 255, 0.25)'
                            : 'rgba(255, 255, 255, 0.75)',
                          borderRightColor: dark
                            ? 'rgba(255, 255, 255, 0.12)'
                            : 'rgba(54, 91, 188, 0.18)',
                        },
                      ]}
                    />
                </>
              )
            )}
            <Text
              style={[
                styles.label,
                {
                  color: selected
                    ? palette.accent
                    : palette.muted,
                  fontWeight: selected ? '600' : '400',
                },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomWidth: 1,
    overflow: 'hidden',
  },
  label: {
    fontSize: 20,
  },
  glassEdge: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  glassHighlight: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    height: '200%',
    borderTopLeftRadius: 11,
    borderTopRightRadius: 11,
  },
  nativeGlass: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
});