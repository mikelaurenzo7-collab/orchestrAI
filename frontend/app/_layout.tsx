import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { authFetch } from '../utils/api';
import { Colors } from '../constants/theme';

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
