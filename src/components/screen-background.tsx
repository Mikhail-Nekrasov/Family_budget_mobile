import type { PropsWithChildren } from 'react';
import {
    Image,
    StyleSheet,
    View,
    useColorScheme,
} from 'react-native';

export function ScreenBackground({
  children,
}: PropsWithChildren) {
  const dark = useColorScheme() === 'dark';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: dark ? '#111722' : '#F5F6F9',
        },
      ]}
    >
      {!dark && (
        <Image
          source={require('../../assets/images/bears-background.png')}
          style={styles.image}
          resizeMode="cover"
          accessible={false}
          pointerEvents="none"
        />
      )}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  image: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
});