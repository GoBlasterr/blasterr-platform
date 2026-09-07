import React, { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Image } from 'expo-image';
import { ClerkLoaded, ClerkProvider, useAuth } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setAuthTokenGetter, setBaseUrl } from '@workspace/api-client-react';
import { CosmicBackground } from '@/components/cosmic-background';
import { useColors } from '@/hooks/useColors';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();
setBaseUrl(process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : null);

const queryClient = new QueryClient();
const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
const proxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;

function ApiAuthBridge() {
  const { getToken } = useAuth();
  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [getToken]);
  return null;
}

function RootLayoutNav() {
  const colors = useColors();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const showAuthLogo =
    pathname === '/sign-in' ||
    pathname === '/sign-up' ||
    (__DEV__ && Platform.OS === 'web' && pathname === '/settings');

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <CosmicBackground />
      <Image
        source={require('@/assets/images/blasterr-auth-logo.png')}
        style={[
          styles.authLogo,
          {
            top: insets.top + 164,
            opacity: showAuthLogo ? 1 : 0,
          },
        ]}
        contentFit="contain"
        cachePolicy="memory-disk"
        priority="high"
        accessibilityLabel={showAuthLogo ? 'BLASTERR' : undefined}
        pointerEvents="none"
      />
      <Stack initialRouteName="index" screenOptions={{ headerBackTitle: 'Back', contentStyle: { backgroundColor: 'transparent' } }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="splash" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="create" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="sign-up" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="sign-in" options={{ headerShown: false, gestureEnabled: false }} />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;
  if (!publishableKey) throw new Error('Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY.');

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache} proxyUrl={proxyUrl}>
      <ClerkLoaded>
        <SafeAreaProvider>
          <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <ApiAuthBridge />
              <GestureHandlerRootView>
                <KeyboardProvider>
                  <RootLayoutNav />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </QueryClientProvider>
          </ErrorBoundary>
        </SafeAreaProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  authLogo: {
    position: 'absolute',
    zIndex: 1,
    width: 220,
    height: 74,
    alignSelf: 'center',
  },
});
