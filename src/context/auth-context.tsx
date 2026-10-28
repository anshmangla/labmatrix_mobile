import React, { createContext, useContext, useEffect, useState } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { User } from "@/types/api";
import { api } from "@/lib/api";
import {
  getAuthToken,
  saveAuthToken,
  removeAuthToken,
  getCachedUser,
  saveCachedUser,
  removeCachedUser,
} from "@/lib/storage";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
  "732621225229-p3t2c05pif5eiq11lg20k6pnv109gr10.apps.googleusercontent.com";

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
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on app boot
  useEffect(() => {
    async function initAuth() {
      try {
        const storedToken = await getAuthToken();
        const storedUser = await getCachedUser();

        if (storedToken) {
          setToken(storedToken);
          if (storedUser) setUser(storedUser);

          // Verify token validity and get latest profile from backend if possible
          try {
            const res = await api.get("/api/auth/mobile/me");
            if (res.data?.user) {
              setUser(res.data.user);
              await saveCachedUser(res.data.user);
            }
          } catch (err: any) {
            if (err.response?.status === 401 && !storedUser?.email) {
              await removeAuthToken();
              await removeCachedUser();
              setToken(null);
              setUser(null);
            }
          }
        }
      } catch (e) {
        console.error("Auth init error:", e);
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await api.post("/api/auth/mobile/login", {
        email: email.trim().toLowerCase(),
        password,
      });
      const { token: receivedToken, user: receivedUser } = res.data;

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

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      // Use the authorized Expo HTTPS proxy URI registered in Google Cloud Console
      const redirectUri = "https://auth.expo.io/@anshmangla/labmatrix-market";
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&response_type=token&scope=openid%20profile%20email`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (result.type === "success" && result.url) {
        // Parse access_token from the URL hash or query params
        const urlPart = result.url.includes("#") ? result.url.split("#")[1] : result.url.split("?")[1];
        const params = new URLSearchParams(urlPart);
        const accessToken = params.get("access_token");

        if (accessToken) {
          // Fetch Google user profile
          const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (userRes.ok) {
            const googleProfile = await userRes.json();
            const authenticatedUser: User = {
              id: googleProfile.sub || `google_${Date.now()}`,
              name: googleProfile.name || "Verified Researcher",
              email: googleProfile.email,
              role: "USER",
            };

            setToken(accessToken);
            setUser(authenticatedUser);

            await saveAuthToken(accessToken);
            await saveCachedUser(authenticatedUser);

            return { success: true };
          }
        }
        return { success: false, error: "Could not retrieve Google profile tokens." };
      }

      if (result.type === "cancel" || result.type === "dismiss") {
        return { success: false, error: "Google sign-in was cancelled." };
      }

      return { success: false, error: "Authentication was interrupted." };
    } catch (err: any) {
      console.error("Google auth error:", err);
      return { success: false, error: err.message || "Failed to sign in with Google." };
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
      await removeAuthToken();
      await removeCachedUser();
      setToken(null);
      setUser(null);
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
