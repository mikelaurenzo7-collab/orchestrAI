import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ToastProvider } from '../contexts/ToastContext';
import { authFetch } from '../utils/api';
import { Colors } from '../constants/theme';
import { useFonts, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

function AuthGate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [checkedOnboard, setCheckedOnboard] = useState(false);

  const checkOnboarding = useCallback(async () => {
    try {
      const res = await authFetch('/api/profile');
      if (res.ok) {
        const profile = await res.json();
        if (!profile.niche && !profile.brand_name && !profile.goals) {
          router.replace('/onboarding');
        } else {
          router.replace('/(tabs)');
        }
      } else {
        router.replace('/(tabs)');
      }
    } catch {
      router.replace('/(tabs)');
    }
    setCheckedOnboard(true);
  }, [router]);

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === 'auth';
    const inOnboard = segments[0] === 'onboarding';

    if (!user && !inAuth) {
      router.replace('/auth');
    } else if (user && (inAuth || (!inOnboard && !checkedOnboard))) {
      checkOnboarding();
    }
  }, [user, loading, segments, checkedOnboard, checkOnboarding, router]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.emerald} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auth" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <ToastProvider>
        <StatusBar style="light" />
        <View style={{ flex: 1, backgroundColor: Colors.bg }}>
          <View style={StyleSheet.absoluteFill}>
            <View style={styles.grain} />
          </View>
          <AuthGate />
        </View>
      </ToastProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },
  grain: {
    flex: 1,
    backgroundColor: '#030712',
    opacity: 0.05,
    // Note: backgroundImage with radial-gradient is web-only.
    // On native, we'd use a repeating image asset if available.
    // For now, this provides a visual layer that matches guidelines.
    // @ts-ignore
    backgroundImage: 'radial-gradient(#ffffff 0.5px, transparent 0.5px)',
    backgroundSize: '10px 10px',
  },
});
