import React, { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { User } from "@/types/api";
import { api, setAuthHeader } from "@/lib/api";
import {
  getAuthToken,
  saveAuthToken,
  removeAuthToken,
  getCachedUser,
  saveCachedUser,
  removeCachedUser,
} from "@/lib/storage";
import { clearPersistedQueries, removeViewerSpecificQueries } from "@/lib/query-persistence";

const GOOGLE_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
  "732621225229-p3t2c05pif5eiq11lg20k6pnv109gr10.apps.googleusercontent.com";

// Safely obtain native GoogleSignin module so Expo Go does not crash on TurboModuleRegistry
let GoogleSignin: any = null;
// Google's DEVELOPER_ERROR status, reported by the native module as the code "10"
const GOOGLE_DEVELOPER_ERROR = "10";

let statusCodes: any = {
  SIGN_IN_CANCELLED: "SIGN_IN_CANCELLED",
  IN_PROGRESS: "IN_PROGRESS",
  PLAY_SERVICES_NOT_AVAILABLE: "PLAY_SERVICES_NOT_AVAILABLE",
};

try {
  // Loaded with require() inside try/catch: a static import would crash Expo Go, which lacks this native module
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const gModule = require("@react-native-google-signin/google-signin");
  GoogleSignin = gModule.GoogleSignin;
  if (gModule.statusCodes) {
    statusCodes = gModule.statusCodes;
  }
  if (GoogleSignin?.configure) {
    GoogleSignin.configure({
      webClientId: GOOGLE_CLIENT_ID,
      scopes: ["profile", "email"],
      offlineAccess: false,
    });
  }
} catch {
  // Running inside standard Expo Go where RNGoogleSignin native binary is not embedded
  GoogleSignin = null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    otp: string;
    phoneNumber?: string;
    companyName?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on app boot. The app opens as soon as the stored session is read from the
  // device; the token is then verified with the server in the background, so launch never waits
  // on the network. A rejected token still signs the user out, and the server checks every request.
  useEffect(() => {
    async function verifyStoredSession(storedToken: string) {
      try {
        const res = await api.get("/api/auth/mobile/me");
        // Ignore the result if the user signed out or into another account meanwhile
        if (res.data?.user && (await getAuthToken()) === storedToken) {
          setUser(res.data.user);
          await saveCachedUser(res.data.user);
        }
      } catch (err: any) {
        // The response interceptor may already have removed the rejected token (null);
        // a different token means the user signed in again meanwhile, so leave that alone.
        const current = await getAuthToken();
        if (err.response?.status === 401 && (current === storedToken || current === null)) {
          setAuthHeader(null);
          await removeAuthToken();
          await removeCachedUser();
          setToken(null);
          setUser(null);
          // Drop anything loaded with the rejected session, including the copy saved on the device
          queryClient.clear();
          await clearPersistedQueries();
        }
      }
    }

    async function initAuth() {
      let storedToken: string | null = null;
      try {
        const [tokenValue, storedUser] = await Promise.all([getAuthToken(), getCachedUser()]);
        storedToken = tokenValue;

        if (storedToken) {
          setAuthHeader(storedToken);
          setToken(storedToken);
          if (storedUser) setUser(storedUser);
        }
      } catch (e) {
        console.error("Auth init error:", e);
      } finally {
        setIsLoading(false);
      }

      if (storedToken) {
        verifyStoredSession(storedToken);
      }
    }

    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await api.post("/api/auth/mobile/login", {
        email: email.trim().toLowerCase(),
        password,
      });
      const { token: receivedToken, user: receivedUser } = res.data;

      // Drop any previous account's data (in memory and saved on the device) before switching
      removeViewerSpecificQueries(queryClient);
      await clearPersistedQueries();

      setAuthHeader(receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);

      await saveAuthToken(receivedToken);
      await saveCachedUser(receivedUser);

      return { success: true };
    } catch (error: any) {
      // Avoid console.error which triggers full-screen LogBox in development
      console.warn("Login failed with status:", error.response?.status);
      if (error.response?.status === 401) {
        return {
          success: false,
          error: "Incorrect email or password. Please verify your credentials and try again.",
        };
      }
      if (error.response?.status === 429) {
        return {
          success: false,
          error: "Too many login attempts. Please wait a few minutes before trying again.",
        };
      }
      if (error.response?.data?.error) {
        return { success: false, error: error.response.data.error };
      }
      if (error.message === "Network Error" || !error.response) {
        return {
          success: false,
          error: "Network error: Unable to reach server. Please check your internet connection.",
        };
      }
      return { success: false, error: "Incorrect credentials. Please verify your details." };
    }
  };

  const exchangeGoogleCredential = async (
    credential: { idToken: string }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await api.post("/api/auth/mobile/google", credential);
      const { token: receivedToken, user: receivedUser } = res.data;

      // Drop any previous account's data (in memory and saved on the device) before switching
      removeViewerSpecificQueries(queryClient);
      await clearPersistedQueries();

      setAuthHeader(receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);

      await saveAuthToken(receivedToken);
      await saveCachedUser(receivedUser);

      return { success: true };
    } catch (error: any) {
      console.warn("Google sign-in exchange failed with status:", error.response?.status);
      if (error.response?.data?.error) {
        return { success: false, error: error.response.data.error };
      }
      if (error.message === "Network Error" || !error.response) {
        return {
          success: false,
          error: "Network error: Unable to reach server. Please check your internet connection.",
        };
      }
      return { success: false, error: "Google sign-in failed. Please try again." };
    }
  };

  // Native Google Sign-In only. (The old browser fallback through auth.expo.io could never complete:
  // Expo's auth proxy is deprecated, and it hid the real error behind a second account picker.)
  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    if (!GoogleSignin) {
      // Expo Go and other builds without the native Google Sign-In module
      return {
        success: false,
        error: "Google sign-in isn't available in this version of the app. Please sign in with your email and password.",
      };
    }

    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Sign out previous session first so Android ALWAYS shows the account chooser dialog
      try {
        await GoogleSignin.signOut();
      } catch {}

      const signInResult = await GoogleSignin.signIn();
      if (signInResult.type === "cancelled") {
        return { success: false, error: "Google sign-in was cancelled." };
      }

      const idToken = signInResult.data?.idToken;
      if (signInResult.type !== "success" || !idToken) {
        return { success: false, error: "Google did not return a sign-in token. Please try again." };
      }
      return await exchangeGoogleCredential({ idToken });
    } catch (nativeErr: any) {
      const code = String(nativeErr?.code ?? "");
      if (code === statusCodes.SIGN_IN_CANCELLED) {
        return { success: false, error: "Google sign-in was cancelled." };
      }
      if (code === statusCodes.IN_PROGRESS) {
        return { success: false, error: "Google sign-in is already in progress." };
      }
      if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return { success: false, error: "Google Play Services is not available or outdated." };
      }
      if (code === GOOGLE_DEVELOPER_ERROR) {
        // This build's signing certificate (SHA-1) isn't registered as an Android OAuth client in
        // Google Cloud for this package (e.g. the Play app signing key after a Play Store install)
        console.warn("Google Sign-In DEVELOPER_ERROR (10): signing certificate not registered for this build");
        return {
          success: false,
          error: "Google sign-in isn't set up for this version of the app yet (Google error 10). Please sign in with your email and password for now.",
        };
      }
      console.warn("Google sign-in failed:", code, nativeErr?.message);
      return { success: false, error: "Google sign-in failed. Please try again." };
    }
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
    otp: string;
    phoneNumber?: string;
    companyName?: string;
  }) => {
    try {
      const res = await api.post("/api/auth/mobile/register", data);
      const { token: receivedToken, user: receivedUser } = res.data;

      // Drop any previous account's data (in memory and saved on the device) before switching
      removeViewerSpecificQueries(queryClient);
      await clearPersistedQueries();

      setAuthHeader(receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);

      await saveAuthToken(receivedToken);
      await saveCachedUser(receivedUser);

      return { success: true };
    } catch (error: any) {
      const msg = error.response?.data?.error || "Registration failed. Please try again.";
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    try {
      if (GoogleSignin) {
        try {
          await GoogleSignin.signOut();
        } catch {}
      }
      setAuthHeader(null);
      await removeAuthToken();
      await removeCachedUser();
      setToken(null);
      setUser(null);
      // Drop cached inquiries, items, notifications and admin data so the next account can't see them,
      // including the copy saved on the device
      queryClient.clear();
      await clearPersistedQueries();
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  const refreshProfile = async () => {
    try {
      const res = await api.get("/api/auth/mobile/me");
      if (res.data?.user) {
        setUser(res.data.user);
        await saveCachedUser(res.data.user);
      }
    } catch (e) {
      console.warn("Could not refresh profile:", e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        loginWithGoogle,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
