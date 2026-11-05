import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CircleArrowUp from "lucide-react-native/icons/circle-arrow-up";
import ShieldAlert from "lucide-react-native/icons/shield-alert";
import X from "lucide-react-native/icons/x";
import ExternalLink from "lucide-react-native/icons/external-link";
import { api } from "@/lib/api";

interface VersionCheckResponse {
  latestVersion: string;
  minRequiredVersion?: string;
  forceUpdate?: boolean;
  releaseNotes?: string;
  updateUrl?: string;
  updateUrls?: {
    android?: string;
    androidWeb?: string;
    ios?: string;
  };
}

/**
 * Compare two semver strings (e.g. "1.0.0" vs "1.0.1").
 * Returns true if current is strictly older than target.
 */
function isVersionOlder(current: string, target: string): boolean {
  if (!current || !target) return false;
  const parse = (v: string) =>
    v
      .replace(/^v/i, "")
      .split(".")
      .map((part) => parseInt(part, 10) || 0);

  const curParts = parse(current);
  const tgtParts = parse(target);
  const len = Math.max(curParts.length, tgtParts.length);

  for (let i = 0; i < len; i++) {
    const c = curParts[i] ?? 0;
    const t = tgtParts[i] ?? 0;
    if (c < t) return true;
    if (c > t) return false;
  }
  return false;
}

export function AppVersionBanner() {
  const insets = useSafeAreaInsets();
  const [updateInfo, setUpdateInfo] = useState<VersionCheckResponse | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  const currentVersion = Constants.expoConfig?.version || "1.0.0";

  // Animation values for smooth entrance and exit of optional banner
  const translateY = useRef(new Animated.Value(-60)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Wait 2.5s after launch to avoid competing with splash or initial feed fetches
    const timer = setTimeout(async () => {
      try {
        const response = await api.get<VersionCheckResponse>("/api/app-version");
        if (response.data && response.data.latestVersion) {
          setUpdateInfo(response.data);
        }
      } catch {
        // Silently ignore network or offline failures
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const latestVersion = updateInfo?.latestVersion;
  const minRequiredVersion = updateInfo?.minRequiredVersion;

  const isForceUpdate =
    !!updateInfo &&
    (updateInfo.forceUpdate === true ||
      (!!minRequiredVersion && isVersionOlder(currentVersion, minRequiredVersion)));

  const isOptionalUpdate =
    !isForceUpdate &&
    !!latestVersion &&
    isVersionOlder(currentVersion, latestVersion);

  useEffect(() => {
    if (isOptionalUpdate && !isDismissed) {
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
  }, [isOptionalUpdate, isDismissed]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -60,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsDismissed(true);
    });
  };

  const handleOpenStore = async () => {
    const isIos = Platform.OS === "ios";
    const marketUrl =
      (isIos ? updateInfo?.updateUrls?.ios : updateInfo?.updateUrl) ||
      "market://details?id=com.labmatrix.market";
    const webFallbackUrl =
      (isIos
        ? updateInfo?.updateUrls?.ios
        : updateInfo?.updateUrls?.androidWeb) ||
      "https://play.google.com/store/apps/details?id=com.labmatrix.market";

    try {
      const canOpen = await Linking.canOpenURL(marketUrl);
      if (canOpen) {
        await Linking.openURL(marketUrl);
        return;
      }
    } catch {
      // Fallback to web browser below
    }

    try {
      await Linking.openURL(webFallbackUrl);
    } catch {
      // Ignore
    }
  };

  // 1. Mandatory/Force Update: Fullscreen blocking modal
  if (isForceUpdate) {
    return (
      <Modal visible animationType="fade" transparent={false} statusBarTranslucent>
        <View style={[styles.forceContainer, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.forceContent}>
            <View style={styles.forceIconCircle}>
              <ShieldAlert size={44} color="#f59e0b" />
            </View>

            <Text style={styles.forceTitle}>Update Required</Text>

            <Text style={styles.forceSubtitle}>
              A critical update for Labmatrix is available ({latestVersion}). To keep your account and orders secure, please update your app from the Google Play Store before continuing.
            </Text>

            {updateInfo?.releaseNotes ? (
              <View style={styles.releaseNotesBox}>
                <Text style={styles.releaseNotesTitle}>What's New in v{latestVersion}:</Text>
                <Text style={styles.releaseNotesText}>{updateInfo.releaseNotes}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.forceUpdateBtn}
              onPress={handleOpenStore}
              activeOpacity={0.85}
            >
              <CircleArrowUp size={20} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.forceUpdateBtnText}>Update Now on Play Store</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // 2. Optional Update: Native floating top notification banner
  if (!isOptionalUpdate || isDismissed) {
    return null;
  }

  const topPosition = Math.max(insets.top + 10, 16);

  return (
    <View
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFill, { zIndex: 999998 }]}
    >
      <Animated.View
        style={[
          styles.card,
          {
            top: topPosition,
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.cardContent}
          onPress={handleOpenStore}
          activeOpacity={0.85}
        >
          <View style={styles.iconCircle}>
            <CircleArrowUp size={18} color="#60a5fa" />
          </View>

          <View style={styles.textColumn}>
            <Text style={styles.messageText} numberOfLines={2}>
              New version available! Tap here to update from Play Store.
            </Text>
            {latestVersion ? (
              <Text style={styles.versionSubtext}>Version {latestVersion}</Text>
            ) : null}
          </View>

          <View style={styles.updateBadge}>
            <Text style={styles.updateBadgeText}>Update</Text>
            <ExternalLink size={12} color="#ffffff" style={{ marginLeft: 4 }} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.closeBtn}
          onPress={handleDismiss}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <X size={16} color="#94a3b8" />
        </TouchableOpacity>
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
    paddingVertical: 10,
    paddingHorizontal: 12,
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
  cardContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(96, 165, 250, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  textColumn: {
    flex: 1,
    marginRight: 8,
  },
  messageText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ffffff",
    lineHeight: 18,
  },
  versionSubtext: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 2,
  },
  updateBadge: {
    backgroundColor: "#033a7d",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1d4ed8",
  },
  updateBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  closeBtn: {
    padding: 6,
    marginLeft: 6,
  },

  // Forced update modal styling
  forceContainer: {
    flex: 1,
    backgroundColor: "#090d16",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  forceContent: {
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    backgroundColor: "#0f172a",
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  forceIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  forceTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 10,
    textAlign: "center",
  },
  forceSubtitle: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  releaseNotesBox: {
    width: "100%",
    backgroundColor: "#1e293b",
    padding: 14,
    borderRadius: 12,
    marginBottom: 24,
  },
  releaseNotesTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#60a5fa",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  releaseNotesText: {
    fontSize: 13,
    color: "#cbd5e1",
    lineHeight: 18,
  },
  forceUpdateBtn: {
    width: "100%",
    backgroundColor: "#033a7d",
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1d4ed8",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  forceUpdateBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
});
