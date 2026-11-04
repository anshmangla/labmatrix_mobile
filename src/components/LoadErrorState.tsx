import { useColorScheme } from '@/hooks/use-color-scheme';
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import CloudOff from "lucide-react-native/icons/cloud-off";
import RefreshCw from "lucide-react-native/icons/refresh-cw";

/**
 * Shown when a list failed to load, so a failed request isn't mistaken for "nothing here".
 */
export function LoadErrorState({
  message = "Couldn't load this right now. Please check your connection and try again.",
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  const isDark = useColorScheme() === "dark";

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <CloudOff size={28} color="#94a3b8" />
      <Text style={[styles.message, isDark && styles.messageDark]}>{message}</Text>
      <TouchableOpacity style={styles.retryBtn} activeOpacity={0.8} onPress={onRetry}>
        <RefreshCw size={14} color="#ffffff" />
        <Text style={styles.retryText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 32,
    paddingHorizontal: 24,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  containerDark: {
    backgroundColor: "#0b1329",
    borderColor: "#1e293b",
  },
  message: {
    fontSize: 14,
    color: "#475569",
    textAlign: "center",
    lineHeight: 20,
  },
  messageDark: {
    color: "#cbd5e1",
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#033a7d",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});
