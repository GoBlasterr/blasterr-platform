import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';

const STARS = [
  [7, 8, 2, 0.54], [22, 17, 1, 0.35], [42, 6, 1, 0.28], [67, 13, 2, 0.4],
  [88, 21, 1, 0.3], [14, 31, 1, 0.34], [34, 28, 2, 0.46], [55, 36, 1, 0.28],
  [77, 30, 1, 0.36], [96, 42, 2, 0.42], [5, 49, 1, 0.3], [26, 46, 1, 0.42],
  [48, 56, 2, 0.34], [72, 51, 1, 0.27], [91, 64, 1, 0.38], [17, 69, 2, 0.44],
  [38, 73, 1, 0.3], [61, 67, 1, 0.38], [82, 78, 2, 0.48], [3, 84, 1, 0.3],
  [28, 88, 1, 0.34], [52, 92, 2, 0.42], [73, 87, 1, 0.3], [94, 95, 1, 0.4],
  [11, 97, 2, 0.35], [47, 19, 1, 0.25], [63, 25, 1, 0.34], [85, 8, 1, 0.3],
  [8, 63, 1, 0.28], [57, 78, 1, 0.32], [97, 25, 1, 0.34],
] as const;

function shootingStarStyle(
  progress: Animated.Value,
  width: number,
  height: number,
  top: `${number}%`,
) {
  const opacity = progress.interpolate({
    inputRange: [0, 0.62, 0.65, 0.83, 0.88, 1],
    outputRange: [0, 0, 0.88, 0.88, 0, 0],
  });
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-width * 0.05, width * 1.18],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-height * 0.08, height * 0.72],
  });
  const scaleX = progress.interpolate({
    inputRange: [0, 0.75, 0.83, 1],
    outputRange: [0.35, 0.7, 1.05, 1.05],
  });

  return {
    ...StyleSheet.flatten(styles.shootingStar),
    top,
    opacity,
    transform: [{ translateX }, { translateY }, { rotate: '-25deg' }, { scaleX }],
  } as any;
}

function webShootingStarStyle(
  progress: number,
  width: number,
  height: number,
  top: `${number}%`,
) {
  const opacity = progress >= 0.65 && progress <= 0.83
    ? 0.88
    : progress > 0.62 && progress < 0.65
      ? ((progress - 0.62) / 0.03) * 0.88
      : progress > 0.83 && progress < 0.88
        ? ((0.88 - progress) / 0.05) * 0.88
        : 0;

  return {
    ...StyleSheet.flatten(styles.shootingStar),
    top,
    opacity,
    transform: [
      { translateX: -width * 0.05 + width * 1.23 * progress },
      { translateY: -height * 0.08 + height * 0.8 * progress },
      { rotate: '-25deg' },
      { scaleX: 0.35 + 0.7 * progress },
    ],
  };
}

export function CosmicBackground() {
  const colors = useColors();
  const { width, height } = useWindowDimensions();
  const useNativeDriver = Platform.OS !== 'web';
  const [webTick, setWebTick] = useState(0);
  const drift = useRef(new Animated.Value(0)).current;
  const firstShootingStar = useRef(new Animated.Value(0)).current;
  const secondShootingStar = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS === 'web') {
      const interval = setInterval(() => setWebTick((tick) => tick + 1), 100);
      return () => clearInterval(interval);
    }

    const driftAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 26000,
          easing: Easing.linear,
          useNativeDriver,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 26000,
          easing: Easing.linear,
          useNativeDriver,
        }),
      ]),
    );
    const firstStarAnimation = Animated.sequence([
      Animated.delay(4000),
      Animated.loop(
        Animated.timing(firstShootingStar, {
          toValue: 1,
          duration: 16000,
          easing: Easing.linear,
          useNativeDriver,
        }),
      ),
    ]);
    const secondStarAnimation = Animated.sequence([
      Animated.delay(11000),
      Animated.loop(
        Animated.timing(secondShootingStar, {
          toValue: 1,
          duration: 19000,
          easing: Easing.linear,
          useNativeDriver,
        }),
      ),
    ]);

    driftAnimation.start();
    firstStarAnimation.start();
    secondStarAnimation.start();

    return () => {
      driftAnimation.stop();
      firstStarAnimation.stop();
      secondStarAnimation.stop();
    };
  }, [drift, firstShootingStar, secondShootingStar, useNativeDriver]);

  const driftX = drift.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -15, 0],
  });
  const driftY = drift.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 16, 0],
  });
  const starOpacity = drift.interpolate({
    inputRange: [0, 0.45, 0.6, 1],
    outputRange: [0.62, 0.78, 0.68, 0.62],
  });
  const webPhase = (webTick % 260) / 260;
  const webWave = Math.sin(webPhase * Math.PI * 2);
  const webStarFieldStyle = {
    opacity: 0.7 + webWave * 0.08,
    transform: [{ translateX: -7.5 + webWave * 7.5 }, { translateY: 8 - webWave * 8 }],
  };
  const firstWebPhase = ((webTick + 96) % 160) / 160;
  const secondWebPhase = ((webTick + 133) % 190) / 190;

  return (
    <View pointerEvents="none" style={styles.container} accessibilityElementsHidden>
      <Animated.View
        style={[
          styles.starField,
          Platform.OS === 'web'
            ? webStarFieldStyle
            : { opacity: starOpacity, transform: [{ translateX: driftX }, { translateY: driftY }] },
        ]}
      >
        {STARS.map(([left, top, size, opacity], index) => (
          <View
            key={`${left}-${top}-${index}`}
            style={[
              styles.star,
              {
                left: `${left}%`,
                top: `${top}%`,
                width: size + 1,
                height: size + 1,
                borderRadius: (size + 1) / 2,
                opacity: Math.min(opacity + 0.2, 0.68),
                backgroundColor: index % 3 === 0 ? colors.primary : colors.foreground,
              },
            ]}
          />
        ))}
      </Animated.View>
      <Animated.View style={Platform.OS === 'web' ? webShootingStarStyle(firstWebPhase, width, height, '20%') : shootingStarStyle(firstShootingStar, width, height, '20%')}>
        <LinearGradient
          colors={['transparent', colors.foreground, colors.foreground, colors.primary]}
          locations={[0, 0.2, 0.76, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.streak}
        />
      </Animated.View>
      <Animated.View style={[Platform.OS === 'web' ? webShootingStarStyle(secondWebPhase, width, height, '58%') : shootingStarStyle(secondShootingStar, width, height, '58%'), styles.secondShootingStar]}>
        <LinearGradient
          colors={['transparent', colors.foreground, colors.foreground, colors.primary]}
          locations={[0, 0.2, 0.76, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.shortStreak}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  starField: { ...StyleSheet.absoluteFillObject },
  star: { position: 'absolute' },
  shootingStar: { position: 'absolute', left: -192, width: 192, height: 2, borderRadius: 999 },
  secondShootingStar: { width: 144 },
  streak: { flex: 1, borderRadius: 999 },
  shortStreak: { flex: 1, borderRadius: 999 },
});