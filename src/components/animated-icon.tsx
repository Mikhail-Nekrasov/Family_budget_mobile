import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, View, useColorScheme } from 'react-native';
import Animated, {
  Easing,
  Keyframe,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

const INITIAL_SCALE_FACTOR = Dimensions.get('screen').height / 90;
const DURATION = 600;

const MINIMUM_SPLASH_MS = 1_000;
const SPLASH_FADE_MS = 220;
// Positions are in the original PNG's coordinate space.
const SPLASH_RING = { x: 426, y: 577, radius: 213.5, width: 70 };
const SPLASH_RING_LENGTH = 2 * Math.PI * SPLASH_RING.radius;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function AnimatedSplashOverlay({ ready, progress }: { ready: boolean; progress: number }) {
  const dark = useColorScheme() === 'dark';
  const [shownAt, setShownAt] = useState<number | null>(null);
  const [visible, setVisible] = useState(true);
  const revealing = useRef(false);
  const fill = useSharedValue(0);
  const opacity = useSharedValue(1);

  const showImage = useCallback(() => {
    if (revealing.current) return;
    revealing.current = true;
    void SplashScreen.hideAsync().catch(() => undefined).finally(() => {
      setShownAt(performance.now());
    });
  }, []);

  useEffect(() => {
    if (shownAt !== null) return;
    const fallback = setTimeout(showImage, 600);
    return () => clearTimeout(fallback);
  }, [shownAt, showImage]);

  useEffect(() => {
    if (shownAt === null) return;

    if (!ready) {
      fill.set(withTiming(Math.min(progress, 0.99), { duration: 140 }));
      return;
    }

    const remaining = Math.max(0, MINIMUM_SPLASH_MS - (performance.now() - shownAt));

    fill.set(withTiming(1, {
      duration: Math.max(120, remaining),
      easing: Easing.out(Easing.quad),
    }));

    const finish = setTimeout(() => {
      opacity.set(withTiming(0, { duration: SPLASH_FADE_MS }, (finished) => {
        if (finished) scheduleOnRN(setVisible, false);
      }));
    }, remaining);

    return () => clearTimeout(finish);
  }, [fill, opacity, progress, ready, shownAt]);

  const cover = useAnimatedProps(() => ({
    strokeDashoffset: -SPLASH_RING_LENGTH * fill.get(),
    opacity: fill.get() >= 1 ? 0 : 1,
  }));
  const fade = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.splashOverlay, fade]}>
      <Image
        source={
          dark
            ? require('@/assets/images/panda-loading-screen-dark.png')
            : require('@/assets/images/panda-loading-screen.png')
        }
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        onDisplay={showImage}
        onError={showImage}
      />
      <Svg
        style={StyleSheet.absoluteFill}
        width="100%"
        height="100%"
        viewBox="0 0 852 1846"
        preserveAspectRatio="xMidYMid slice"
        pointerEvents="none"
      >
        <AnimatedCircle
          animatedProps={cover}
          cx={SPLASH_RING.x}
          cy={SPLASH_RING.y}
          r={SPLASH_RING.radius}
          fill="none"
          stroke={dark ? '#111722' : '#E4E9F2'}
          strokeWidth={SPLASH_RING.width}
          strokeDasharray={[SPLASH_RING_LENGTH, SPLASH_RING_LENGTH]}
          rotation={-90}
          originX={SPLASH_RING.x}
          originY={SPLASH_RING.y}
        />
      </Svg>
    </Animated.View>
  );
}

const keyframe = new Keyframe({
  0: {
    transform: [{ scale: INITIAL_SCALE_FACTOR }],
  },
  100: {
    transform: [{ scale: 1 }],
    easing: Easing.elastic(0.7),
  },
});

const logoKeyframe = new Keyframe({
  0: {
    transform: [{ scale: 1.3 }],
    opacity: 0,
  },
  40: {
    transform: [{ scale: 1.3 }],
    opacity: 0,
    easing: Easing.elastic(0.7),
  },
  100: {
    opacity: 1,
    transform: [{ scale: 1 }],
    easing: Easing.elastic(0.7),
  },
});

const glowKeyframe = new Keyframe({
  0: {
    transform: [{ rotateZ: '0deg' }],
  },
  100: {
    transform: [{ rotateZ: '7200deg' }],
  },
});

export function AnimatedIcon() {
  return (
    <View style={styles.iconContainer}>
      <Animated.View entering={glowKeyframe.duration(60 * 1000 * 4)} style={styles.glow}>
        <Image style={styles.glow} source={require('@/assets/images/logo-glow.png')} />
      </Animated.View>

      <Animated.View entering={keyframe.duration(DURATION)} style={styles.background} />
      <Animated.View style={styles.imageContainer} entering={logoKeyframe.duration(DURATION)}>
        <Image style={styles.image} source={require('@/assets/images/expo-logo.png')} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    width: 201,
    height: 201,
    position: 'absolute',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 128,
    height: 128,
    zIndex: 100,
  },
  image: {
    width: 76,
    height: 71,
  },
  background: {
    borderRadius: 40,
    experimental_backgroundImage: `linear-gradient(180deg, #3C9FFE, #0274DF)`,
    width: 128,
    height: 128,
    position: 'absolute',
  },
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#F5F6F9',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
});
