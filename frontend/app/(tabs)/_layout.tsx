import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Colors } from '../../constants/theme';
import { BlurView } from 'expo-blur';
import { Home, Bot, MessageSquareText, Zap, Link } from 'lucide-react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

type TabIconProps = {
  label: string;
  Icon: any;
  focused: boolean;
  color: string;
};

function TabIcon({ label, Icon, focused, color }: TabIconProps) {
  const animatedIconStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: withSpring(focused ? 1.15 : 1, { mass: 1, damping: 15, stiffness: 200 }) }],
    };
  });

  const animatedLabelStyle = useAnimatedStyle(() => {
    return {
      opacity: withSpring(focused ? 1 : 0.6),
      transform: [{ translateY: withSpring(focused ? 0 : 2) }],
    };
  });

  return (
    <View style={styles.tabIconWrap}>
      <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
        <Icon size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
      </Animated.View>
      <Animated.Text style={[styles.tabLabel, { color }, animatedLabelStyle]}>
        {label}
      </Animated.Text>
      {focused && <View style={styles.activeDot} />}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => (
          <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
        ),
        tabBarActiveTintColor: Colors.emerald,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon label="HQ" Icon={Home} focused={focused} color={color} />
          ),
        }}
        listeners={{ tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }}
      />
      <Tabs.Screen
        name="agents"
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon label="Agents" Icon={Bot} focused={focused} color={color} />
          ),
        }}
        listeners={{ tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon label="Chat" Icon={MessageSquareText} focused={focused} color={color} />
          ),
        }}
        listeners={{ tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }}
      />
      <Tabs.Screen
        name="social"
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon label="Execute" Icon={Zap} focused={focused} color={color} />
          ),
        }}
        listeners={{ tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }}
      />
      <Tabs.Screen
        name="stores"
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon label="Connect" Icon={Link} focused={focused} color={color} />
          ),
        }}
        listeners={{ tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    borderTopWidth: 0,
    elevation: 0,
    height: Platform.OS === 'ios' ? 88 : 70,
    backgroundColor: 'transparent', // The BlurView handles the background
  },
  tabIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    width: 60,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: 'Manrope_600SemiBold',
    marginTop: 4,
    marginBottom: 2,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.emerald,
    position: 'absolute',
    bottom: -10,
  },
});
