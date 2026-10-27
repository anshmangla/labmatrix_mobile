import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useColorScheme } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/auth-context";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 2, // 2 minutes
    },
  },
});

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="listing/[id]"
              options={{
                headerShown: true,
                title: "Instrument Details",
                headerBackTitle: "Back",
              }}
            />
            <Stack.Screen
              name="requests/[id]"
              options={{
                headerShown: true,
                title: "Requirement Details",
                headerBackTitle: "Back",
              }}
            />
            <Stack.Screen
              name="notifications"
              options={{
                headerShown: true,
                title: "Notifications",
                headerBackTitle: "Back",
              }}
            />
            <Stack.Screen
              name="(auth)/login"
              options={{
                presentation: "modal",
                headerShown: true,
                title: "Sign In",
              }}
            />
            <Stack.Screen
              name="(auth)/register"
              options={{
                presentation: "modal",
                headerShown: true,
                title: "Create Account",
              }}
            />
            <Stack.Screen
              name="(auth)/forgot-password"
              options={{
                presentation: "modal",
                headerShown: true,
                title: "Reset Password",
              }}
            />
          </Stack>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
