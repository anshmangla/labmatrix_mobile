import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "labmatrix_auth_token";
const USER_KEY = "labmatrix_user_data";

export async function saveAuthToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Ignore web storage errors
    }
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }
}

export async function getAuthToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  } else {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  }
}

export async function removeAuthToken(): Promise<void> {
  if (Platform.OS === "web") {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Ignore web storage errors
    }
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

export async function saveCachedUser(user: any): Promise<void> {
  const json = JSON.stringify(user);
  if (Platform.OS === "web") {
    try {
      localStorage.setItem(USER_KEY, json);
    } catch {}
  } else {
    await SecureStore.setItemAsync(USER_KEY, json);
  }
}

export async function getCachedUser(): Promise<any | null> {
  let json: string | null = null;
  if (Platform.OS === "web") {
    try {
      json = localStorage.getItem(USER_KEY);
    } catch {}
  } else {
    json = await SecureStore.getItemAsync(USER_KEY);
  }
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export async function removeCachedUser(): Promise<void> {
  if (Platform.OS === "web") {
    try {
      localStorage.removeItem(USER_KEY);
    } catch {}
  } else {
    await SecureStore.deleteItemAsync(USER_KEY);
  }
}
