import AsyncStorage from '@react-native-async-storage/async-storage';

const API = process.env.EXPO_PUBLIC_BACKEND_URL;

// In-memory token cache — avoids AsyncStorage disk read on every request
let cachedToken: string | null = null;

export function setCachedToken(token: string | null) {
  cachedToken = token;
}

export async function getToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  cachedToken = await AsyncStorage.getItem('auth_token');
  return cachedToken;
}

export async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const response = await fetch(`${API}${path}`, { ...options, headers });

    if (response.status === 401) {
      console.warn('Unauthorized request, clearing token');
      await AsyncStorage.removeItem('auth_token');
      setCachedToken(null);
    }

    return response;
  } catch (error) {
    console.error(`Fetch error for ${path}:`, error);
    throw error;
  }
}
