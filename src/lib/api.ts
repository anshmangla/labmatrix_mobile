import axios from "axios";
import { Platform } from "react-native";
import { getAuthToken, removeAuthToken, removeCachedUser } from "./storage";

// During local development on a physical phone/emulator:
// iOS Simulator uses localhost.
// Android Emulator uses 10.0.2.2.
// Physical device uses your computer's LAN IP (or production domain when deployed).
const getBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (Platform.OS === "android") {
    return "http://10.0.2.2:3000";
  }
  return "http://localhost:3000";
};

export const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach Authorization header if token exists
api.interceptors.request.use(async (config) => {
  try {
    const token = await getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.warn("Error reading auth token for request:", error);
  }
  return config;
});

// Auto-cleanup on 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await removeAuthToken();
      await removeCachedUser();
    }
    return Promise.reject(error);
  }
);
