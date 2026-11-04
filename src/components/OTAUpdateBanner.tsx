import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import * as Updates from "expo-updates";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import RefreshCw from "lucide-react-native/icons/refresh-cw";
import X from "lucide-react-native/icons/x";

export function OTAUpdateBanner() {
  const insets = useSafeAreaInsets();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [manualReady, setManualReady] = useState(false);
  const isFetchingRef = useRef(false);

  // Native updates state hook (handles ON_LOAD downloads and state machine)
  const { isUpdatePending, isUpdateAvailable } = Updates.useUpdates();

  // Background check and download after app has launched and settled
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;

    // Wait 4 seconds after launch so app startup, native splash, and initial
    // critical network queries finish without competition
    const timer = setTimeout(async () => {
      try {
        const check = await Updates.checkForUpdateAsync();
        if (check.isAvailable) {
          isFetchingRef.current = true;
          await Updates.fetchUpdateAsync();
          setManualReady(true);
        }
      } catch {
        // Silently catch and ignore any network errors or timeouts
      } finally {
        isFetchingRef.current = false;
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  // If useUpdates notifies us that an update is available but not yet pending,
  // fetch it in the background
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    if (isUpdateAvailable && !isUpdatePending && !isFetchingRef.current) {
      isFetchingRef.current = true;
      Updates.fetchUpdateAsync()
        .then(() => setManualReady(true))
        .catch(() => {})
        .finally(() => {
          isFetchingRef.current = false;
        });
    }
  }, [isUpdateAvailable, isUpdatePending]);

  const isReady = isUpdatePending || manualReady;

  // Animation values for smooth entrance and exit
  const translateY = useRef(new Animated.Value(60)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isReady && !isDismissed) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          tension: 65,
          friction: 9,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isReady, isDismissed]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 60,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsDismissed(true);
    });
  };

  const handleRestart = async () => {
    if (isReloading) return;
    setIsReloading(true);
    try {
      await Updates.reloadAsync();
    } catch {
      setIsReloading(false);
    }
  };

  if (!isReady || isDismissed) {
    return null;
  }

  // Float neatly above bottom tabs or bottom safe area
  const bottomPosition = Math.max(insets.bottom + 65, 80);

  return (
    <View
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFill, { zIndex: 999999 }]}
    >
      <Animated.View
        style={[
          styles.card,
          {
            bottom: bottomPosition,
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        <View style={styles.iconCircle}>
          <RefreshCw size={16} color="#60a5fa" />
        </View>

        <Text style={styles.messageText} numberOfLines={2}>
          A new version is ready. Restart to update.
        </Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.restartBtn}
            onPress={handleRestart}
            activeOpacity={0.8}
            disabled={isReloading}
          >
            {isReloading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.restartBtnText}>Restart</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleDismiss}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <X size={16} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    left: 14,
    right: 14,
    backgroundColor: "#0f172a",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(96, 165, 250, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  messageText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#ffffff",
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  restartBtn: {
    backgroundColor: "#033a7d",
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1d4ed8",
    minWidth: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  restartBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  closeBtn: {
    padding: 6,
    marginLeft: 6,
  },
});
