import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';

import type { Category } from '@/models/category';

type CategoryCardProps = {
  category: Category;
};

export function CategoryCard({
  category,
}: CategoryCardProps) {
  const dark = useColorScheme() === 'dark';

  const palette = dark
    ? {
        text: '#F0F3FA',
        edgeTop: 'rgba(255, 255, 255, 0.45)',
        edgeLeft: 'rgba(255, 255, 255, 0.25)',
        edgeShadow: 'rgba(255, 255, 255, 0.12)',
        highlight: 'rgba(255, 255, 255, 0.18)',
      }
    : {
        text: '#192238',
        edgeTop: 'rgba(255, 255, 255, 0.95)',
        edgeLeft: 'rgba(255, 255, 255, 0.75)',
        edgeShadow: 'rgba(54, 91, 188, 0.18)',
        highlight: 'rgba(255, 255, 255, 0.65)',
      };

  const highlightColor = category.type === 'INCOME'
    ? dark
      ? 'rgba(100, 220, 160, 0.75)'
      : 'rgba(100, 220, 160, 0.45)'
    : palette.highlight;

  return (
    <View style={styles.card}>
      <BlurView
        intensity={15}
        tint="default"
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.blur,
        ]}
      />

      {category.type === 'INCOME' && (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: dark
                ? 'rgba(60, 180, 120, 0.15)'
                : 'rgba(60, 180, 120, 0.05)',
            },
          ]}
        />
      )}

      <LinearGradient
        colors={[
          highlightColor,
          'rgba(255, 255, 255, 0)',
        ]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.5, y: 1 }}
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

      <Text
        style={[
          styles.name,
          { color: palette.text },
        ]}
      >
        {category.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    padding: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  blur: {
    opacity: 0.6,
  },
  highlight: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    height: '10%',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  edge: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 16,
    borderWidth: 1,
  },
  name: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
  },
});