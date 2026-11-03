import { useEffect } from "react";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
  Stack,
  useRouter,
  useSegments,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useColorScheme, View, Image, ActivityIndicator, StyleSheet } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/context/auth-context";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry network and server errors, but not 4xx answers (unauthorized, not found,
      // pending review): repeating those only delays the error screen.
      retry: (failureCount, error: any) => {
        const status = error?.response?.status;
        if (status >= 400 && status < 500 && status !== 408 && status !== 429) return false;
        return failureCount < 2;
      },
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 10, // Keep screens' data for instant back-navigation
    },
  },
});

function RootNavigation() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    // Guests can browse the marketplace and requests; screens that need an account
    // (Sell, Inquiries, Profile, Notifications, Admin) show their own sign-in prompt.
    const inAuthGroup = segments[0] === "(auth)";

    if (isAuthenticated && inAuthGroup) {
      // Just signed in: go back to where sign-in was started (e.g. a listing), else the marketplace
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(tabs)");
      }
    }
  }, [isAuthenticated, isLoading, segments, router]);

  // Keep the native splash up while the session is read from the device (a few ms),
  // then reveal the first screen directly instead of showing a second, JS-drawn splash.
  useEffect(() => {
    if (!isLoading) SplashScreen.hide();
  }, [isLoading]);

  // Branded splash while restoring secure session (normally hidden behind the native splash)
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, isDark && styles.loadingContainerDark]}>
        <Image
          source={require("@/assets/images/logo.png")}
          style={styles.loadingLogo}
          resizeMode="contain"
        />
        <ActivityIndicator size="small" color="#033a7d" style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Auth Group: full screen entry gate */}
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/register" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/forgot-password" options={{ headerShown: false }} />

        {/* Authenticated Application */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* These screens draw their own header with a back button */}
        <Stack.Screen name="listing/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="requests/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen name="contact" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RootNavigation />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainerDark: {
    backgroundColor: "#011936",
  },
  loadingLogo: {
    width: 200,
    height: 50,
  },
});
