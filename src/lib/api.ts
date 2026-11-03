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

// Public feeds that never read the session. Sending a token with them makes the CDN skip
// its cache, so signed-in users would always wait for the server and database.
const PUBLIC_GET_PATHS = new Set(["/api/listings", "/api/requirements"]);

function isPublicFeedRequest(method?: string, url?: string): boolean {
  if ((method || "get").toLowerCase() !== "get" || !url) return false;
  return PUBLIC_GET_PATHS.has(url.split("?")[0]);
}

// Attach Authorization header if token exists
api.interceptors.request.use(async (config) => {
  try {
    if (isPublicFeedRequest(config.method, config.url)) {
      config.headers.delete("Authorization");
      config.headers.delete("authorization");
    } else if (!config.headers.Authorization && !config.headers.authorization) {
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
    // Only clear the token this request was sent with, not one from a newer sign-in
    const sentWith = String(error.config?.headers?.Authorization ?? "");
    const current = await getAuthToken();
    if (error.response?.status === 401 && isVerifyEndpoint && current && sentWith === `Bearer ${current}`) {
      setAuthHeader(null);
      await removeAuthToken();
      await removeCachedUser();
    }
    return Promise.reject(error);
  }
);
