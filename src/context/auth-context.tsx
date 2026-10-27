import React, { createContext, useContext, useEffect, useState } from "react";
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

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
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

          // Verify token validity and get latest profile from backend
          try {
            const res = await api.get("/api/auth/mobile/me");
            if (res.data?.user) {
              setUser(res.data.user);
              await saveCachedUser(res.data.user);
            }
          } catch (err: any) {
            if (err.response?.status === 401) {
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
      const res = await api.post("/api/auth/mobile/login", { email, password });
      const { token: receivedToken, user: receivedUser } = res.data;

      setToken(receivedToken);
      setUser(receivedUser);

      await saveAuthToken(receivedToken);
      await saveCachedUser(receivedUser);

      return { success: true };
    } catch (error: any) {
      const msg = error.response?.data?.error || "Login failed. Please check your credentials.";
      return { success: false, error: msg };
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
