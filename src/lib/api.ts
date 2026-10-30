import axios from "axios";
import { Platform } from "react-native";
import { getAuthToken, removeAuthToken, removeCachedUser } from "./storage";

// Live production backend on Vercel: https://surplus.labmatrixindia.com
// Can be overridden via EXPO_PUBLIC_API_URL for local development (e.g., http://192.168.1.X:3000)
const getBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  return "https://surplus.labmatrixindia.com";
};

export const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Helper to set or clear Authorization header immediately in memory
export const setAuthHeader = (token: string | null) => {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
};

// Attach Authorization header if token exists
api.interceptors.request.use(async (config) => {
  try {
    if (!config.headers.Authorization && !config.headers.authorization) {
      const token = await getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch (error) {
    console.warn("Error reading auth token for request:", error);
  }
  return config;
});

// Only clear token if session verification endpoint specifically returns 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const isVerifyEndpoint = error.config?.url?.includes("/api/auth/mobile/me");
    if (error.response?.status === 401 && isVerifyEndpoint) {
      setAuthHeader(null);
      await removeAuthToken();
      await removeCachedUser();
    }
    return Promise.reject(error);
  }
);
