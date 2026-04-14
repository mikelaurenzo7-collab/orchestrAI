import React, { ReactNode } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle, Gestures } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedPress = Animated.createAnimatedComponent(Pressable);

export interface AnimatedPressableProps extends PressableProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle> | any;
  scaleDown?: number;
  haptic?: Haptics.ImpactFeedbackStyle | Haptics.NotificationFeedbackType;
}

export function AnimatedPressable({ 
  children, 
  style, 
  scaleDown = 0.96, 
  haptic, 
  onPressIn, 
  onPressOut, 
  onPress, 
  ...rest 
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (e: any) => {
    scale.value = withSpring(scaleDown, { damping: 14, stiffness: 200 });
    if (haptic) {
      if (['light', 'medium', 'heavy', 'soft', 'rigid'].includes(haptic as string)) {
        Haptics.impactAsync(haptic as Haptics.ImpactFeedbackStyle);
      } else {
        Haptics.notificationAsync(haptic as Haptics.NotificationFeedbackType);
      }
    }
    if (onPressIn) onPressIn(e);
  };

  const handlePressOut = (e: any) => {
    scale.value = withSpring(1, { damping: 14, stiffness: 200 });
    if (onPressOut) onPressOut(e);
  };

  return (
    <AnimatedPress
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={[style, animatedStyle]}
      {...rest}
    >
      {children}
    </AnimatedPress>
  );
}
