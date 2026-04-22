import React, { useEffect } from 'react';
import { StyleSheet, View, LayoutRectangle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/theme';

interface TracingBeamProps {
  children: React.ReactNode;
  color?: string;
  duration?: number;
  active?: boolean;
}

export function TracingBeam({
  children,
  color = Colors.emerald,
  duration = 3000,
  active = true
}: TracingBeamProps) {
  const progress = useSharedValue(0);
  const [layout, setLayout] = React.useState<LayoutRectangle | null>(null);

  useEffect(() => {
    if (active) {
      progress.value = withRepeat(
        withTiming(1, { duration, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      progress.value = 0;
    }
  }, [active, duration]);

  const beamStyle = useAnimatedStyle(() => {
    if (!layout) return { opacity: 0 };

    const perimeter = (layout.width + layout.height) * 2;
    const distance = progress.value * perimeter;

    let translateX = 0;
    let translateY = 0;
    let rotate = '0deg';

    if (distance <= layout.width) {
      translateX = distance - layout.width / 2;
      translateY = -layout.height / 2;
      rotate = '0deg';
    } else if (distance <= layout.width + layout.height) {
      translateX = layout.width / 2;
      translateY = (distance - layout.width) - layout.height / 2;
      rotate = '90deg';
    } else if (distance <= layout.width * 2 + layout.height) {
      translateX = layout.width / 2 - (distance - (layout.width + layout.height));
      translateY = layout.height / 2;
      rotate = '180deg';
    } else {
      translateX = -layout.width / 2;
      translateY = layout.height / 2 - (distance - (layout.width * 2 + layout.height));
      rotate = '270deg';
    }

    return {
      transform: [
        { translateX },
        { translateY },
        { rotate }
      ],
      opacity: withTiming(active ? 1 : 0),
    };
  });

  return (
    <View
      style={styles.container}
      onLayout={(e) => setLayout(e.nativeEvent.layout)}
    >
      {children}
      {active && layout && (
        <Animated.View style={[styles.beamContainer, beamStyle]}>
          <LinearGradient
            colors={['transparent', color, 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.beam}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  beamContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 100,
    height: 2,
    zIndex: 10,
  },
  beam: {
    flex: 1,
    height: '100%',
  },
});

export default TracingBeam;
