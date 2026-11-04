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
import { useColorScheme, View, Image, ActivityIndicator, StyleSheet, AppState } from "react-native";
import { QueryClient, useIsRestoring } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/context/auth-context";
import { getAuthToken } from "@/lib/storage";
import {
  PERSIST_BUSTER,
  PERSIST_MAX_AGE,
  queryPersister,
  removeViewerSpecificQueries,
  shouldPersistQuery,
} from "@/lib/query-persistence";
import { wakeServer } from "@/lib/wake-server";
import { OnboardingModal } from "@/components/OnboardingModal";

// After this long in the background, connections may have died and data may be out of date
const RESUME_REFRESH_AFTER_MS = 30_000;

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
      // Retry quickly (0.5s, then 1s): a failed attempt has usually already waited for its timeout
      retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 3000),
      staleTime: 1000 * 60 * 2, // 2 minutes
      // Keep loaded data (also needed for it to be saved on the device for PERSIST_MAX_AGE)
      gcTime: PERSIST_MAX_AGE,
    },
  },
});

function RootNavigation() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  // Wait for data saved on the device too, so screens never flash an empty state before it arrives
  const isRestoring = useIsRestoring();
  const isLoading = isAuthLoading || isRestoring;
  const segments = useSegments();
  const router = useRouter();

  // Wake the server's database at launch. After time in the background, wake it again and
  // refresh what's on screen: requests stuck on a connection that died while the app was away
  // are cancelled and started again on a fresh one.
  useEffect(() => {
    wakeServer();
    let backgroundedAt: number | null = null;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        if (backgroundedAt !== null && Date.now() - backgroundedAt > RESUME_REFRESH_AFTER_MS) {
          wakeServer();
          queryClient.invalidateQueries({ refetchType: "active" });
        }
        backgroundedAt = null;
      } else if (backgroundedAt === null) {
        backgroundedAt = Date.now();
      }
    });
    return () => subscription.remove();
  }, []);

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

  // Keep the native splash up while the session and saved data are read from the device (a few ms),
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
      <OnboardingModal />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      {/* Restores data saved on the device before any query fetches, and keeps saving it */}
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: queryPersister,
          maxAge: PERSIST_MAX_AGE,
          buster: PERSIST_BUSTER,
          dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
        }}
        onSuccess={async () => {
          // Nobody is signed in: drop anything that belonged to, or depended on, a previous account
          if (!(await getAuthToken())) removeViewerSpecificQueries(queryClient);
        }}
      >
        <AuthProvider>
          <RootNavigation />
        </AuthProvider>
      </PersistQueryClientProvider>
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
