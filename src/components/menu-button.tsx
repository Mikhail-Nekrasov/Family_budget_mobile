import { GlassView } from 'expo-glass-effect';
import { DrawerToggleButton } from 'expo-router/drawer';
import {
  StyleSheet,
  View,
  useColorScheme,
} from 'react-native';

export function MenuButton() {
  const dark = useColorScheme() === 'dark';

  return (
    <View style={styles.container}>
      <GlassView
        glassEffectStyle="regular"
        style={styles.glass}
      >
        <DrawerToggleButton
          tintColor={dark ? '#F0F3FA' : '#192238'}
        />
      </GlassView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glass: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});