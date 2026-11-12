import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, useColorScheme } from 'react-native';

export function EntryCardSurface() {
  const dark = useColorScheme() === 'dark';
  const top = dark ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.95)';
  const left = dark ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.75)';
  const shadow = dark ? 'rgba(255,255,255,0.12)' : 'rgba(54,91,188,0.18)';

  return (
    <>
      <BlurView intensity={15} tint="default" pointerEvents="none" style={[StyleSheet.absoluteFill, styles.blur]} />
      <View pointerEvents="none" style={[
        StyleSheet.absoluteFill,
        { backgroundColor: dark ? 'rgba(100,140,220,0.12)' : 'rgba(100,140,220,0.08)' },
      ]} />
      <LinearGradient
        colors={[dark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.65)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        pointerEvents="none"
        style={styles.highlight}
      />
      <View pointerEvents="none" style={[
        StyleSheet.absoluteFill,
        styles.edge,
        { borderTopColor: top, borderLeftColor: left, borderRightColor: shadow, borderBottomColor: shadow },
      ]} />
    </>
  );
}

const styles = StyleSheet.create({
  blur: { opacity: 0.7 },
  highlight: { position: 'absolute', top: 1, left: 1, right: 1, height: '5%', borderRadius: 15 },
  edge: { borderRadius: 16, borderWidth: 1 },
});
