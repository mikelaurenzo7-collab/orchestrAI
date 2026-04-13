import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { Colors } from '../constants/theme';

function AuthGate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [checkedOnboard, setCheckedOnboard] = useState(false);
  const [needsOnboard, setNeedsOnboard] = useState(false);

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === 'auth';
    const inOnboard = segments[0] === 'onboarding';

    if (!user && !inAuth) {
      router.replace('/auth');
    } else if (user && inAuth) {
      // Check if user needs onboarding (no profile set yet)
      checkOnboarding();
    } else if (user && !inAuth && !inOnboard && !checkedOnboard) {
      checkOnboarding();
    }
  }, [user, loading, segments]);

  const checkOnboarding = async () => {
    try {
      const { authFetch } = require('../utils/api');
      const res = await authFetch('/api/profile');
      if (res.ok) {
        const profile = await res.json();
        if (!profile.niche && !profile.brand_name && !profile.goals) {
          setNeedsOnboard(true);
          router.replace('/onboarding');
        } else {
          setNeedsOnboard(false);
          if (segments[0] === 'auth' || segments[0] === 'onboarding') {
            router.replace('/(tabs)');
          }
        }
      } else {
        router.replace('/(tabs)');
      }
    } catch (e) {
      router.replace('/(tabs)');
    }
    setCheckedOnboard(true);
  };

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
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <AuthGate />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },
});
