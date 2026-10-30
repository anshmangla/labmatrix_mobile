import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  useColorScheme,
  Image,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Clock, ArrowLeft, ArrowRight, MessageSquare, Package, ChevronRight } from "lucide-react-native";
import { api } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { LabMatrixTokens } from "@/constants/theme";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { colors } = LabMatrixTokens;
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();

  const [localNotifications, setLocalNotifications] = useState<NotificationItem[]>([]);

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["notifications"],
    enabled: isAuthenticated,
    queryFn: async () => {
      try {
        const res = await api.get("/api/notifications");
        if (res.data?.notifications) {
          return res.data as { notifications: NotificationItem[]; unreadCount: number };
        }
      } catch (err: any) {
        console.warn("Could not fetch remote notifications:", err.message);
      }
      return {
        notifications: [],
        unreadCount: 0,
      };
    },
  });

  React.useEffect(() => {
    if (data?.notifications) {
      setLocalNotifications(data.notifications);
    }
  }, [data]);

  const unreadCount = localNotifications.filter((n: NotificationItem) => !n.isRead).length;

  const handleMarkAllRead = async () => {
    setLocalNotifications((prev: NotificationItem[]) => prev.map((n: NotificationItem) => ({ ...n, isRead: true })));
    try {
      await api.patch("/api/notifications", { all: true });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (_) {}
  };

  const handleNotificationPress = async (item: NotificationItem) => {
    // If not read, mark single as read locally & remotely
    if (!item.isRead) {
      setLocalNotifications((prev: NotificationItem[]) =>
        prev.map((n: NotificationItem) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
      try {
        await api.patch("/api/notifications", { id: item.id });
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      } catch (e) {
        // Silent fail
      }
    }

    if (item.link) {
      // Links are website paths written by the server; map each one to the matching app screen
      const [path, query = ""] = item.link.split("?");
      const segments = path.split("/").filter(Boolean);
      const [section, id] = segments;

      if (section === "admin") {
        router.push("/admin" as any);
      } else if (section === "listings" && id) {
        router.push(`/listing/${encodeURIComponent(id)}` as any);
      } else if (section === "requests" && id) {
        router.push(`/requests/${encodeURIComponent(id)}` as any);
      } else if (section === "requests" || query.includes("tab=wanted")) {
        router.push("/(tabs)/requests" as any);
      } else if (section === "inquiries" || item.type === "INQUIRY_RECEIVED") {
        router.push("/(tabs)/inquiries" as any);
      } else if (section === "dashboard") {
        // Titles are server-written ("Request Submitted…", "Listing Edits…"); messages contain user text
        const isRequest = /request|requirement/i.test(item.title);
        router.push({
          pathname: "/(tabs)/profile",
          params: { tab: isRequest ? "requests" : "listings" },
        } as any);
      } else {
        // "/", "/listings", "/spare-parts" and "/new-instruments" all live on the catalog tab
        router.push("/(tabs)" as any);
      }
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <TouchableOpacity
      style={[
        styles.card,
        isDark && styles.cardDark,
        !item.isRead && styles.cardUnread,
        !item.isRead && isDark && styles.cardUnreadDark,
      ]}
      activeOpacity={0.75}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          {!item.isRead && <View style={styles.unreadDot} />}
          <Text style={[styles.title, isDark && styles.titleDark, !item.isRead && styles.titleUnread]}>
            {item.title}
          </Text>
        </View>
        <View style={styles.dateRow}>
          <Clock size={11} color="#64748b" />
          <Text style={styles.dateText}>
            {new Date(item.createdAt).toLocaleDateString("en-IN", {
              month: "short",
              day: "numeric",
            })}
          </Text>
        </View>
      </View>

      <Text style={[styles.message, isDark && styles.messageDark]}>{item.message}</Text>

      {item.link ? (
        <View style={styles.actionRow}>
          <Text style={styles.actionRowText}>Tap to view details</Text>
          <ChevronRight size={12} color="#033a7d" />
        </View>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView edges={["top", "bottom"]} style={[styles.safeArea, isDark && styles.safeAreaDark]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Top Header */}
      <View style={[styles.topBar, isDark && styles.topBarDark]}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={() => router.back()}
        >
          <ArrowLeft size={20} color={isDark ? "#f8fafc" : "#0f172a"} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, isDark && styles.headerTitleDark]}>
          Notifications
        </Text>

        <View style={{ width: 36 }} />
      </View>

      {/* Control Bar */}
      {unreadCount > 0 && (
        <View style={[styles.controlBar, isDark && styles.controlBarDark]}>
          <Text style={styles.unreadCountText}>{unreadCount} unread alert(s)</Text>
          <TouchableOpacity
            style={styles.markAllBtn}
            onPress={handleMarkAllRead}
          >
            <CheckCheck size={14} color="#033a7d" />
            <Text style={styles.markAllBtnText}>Mark all as read</Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#033a7d" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : (
        <FlatList
          data={localNotifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                refetch();
              }}
              tintColor="#033a7d"
              colors={["#033a7d"]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Bell size={36} color="#033a7d" />
              </View>
              <Text style={[styles.emptyTitle, isDark && styles.emptyTitleDark]}>
                No Notifications Yet
              </Text>
              <Text style={styles.emptySubtitle}>
                You will receive alerts here when your equipment listings are approved, or when buyers
                submit proposals.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  safeAreaDark: {
    backgroundColor: "#010f22",
  },
  topBar: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  topBarDark: {
    backgroundColor: "#011936",
    borderBottomColor: "#1e293b",
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#eff5fb",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
  },
  headerTitleDark: {
    color: "#f8fafc",
  },
  controlBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#eff5fb",
    borderBottomWidth: 1,
    borderBottomColor: "#dbeaf7",
  },
  controlBarDark: {
    backgroundColor: "#03142e",
    borderBottomColor: "#1e293b",
  },
  unreadCountText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#033a7d",
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#dbeaf7",
  },
  markAllBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#033a7d",
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 8,
  },
  cardDark: {
    backgroundColor: "#03142e",
    borderColor: "#1e293b",
  },
  cardUnread: {
    backgroundColor: "#eff5fb",
    borderColor: "#bfdbfe",
  },
  cardUnreadDark: {
    backgroundColor: "#051e44",
    borderColor: "#1e40af",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#033a7d",
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
    flex: 1,
  },
  titleUnread: {
    fontWeight: "800",
    color: "#002555",
  },
  titleDark: {
    color: "#f8fafc",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dateText: {
    fontSize: 11,
    color: "#64748b",
  },
  message: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
  },
  messageDark: {
    color: "#cbd5e1",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  actionRowText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#033a7d",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: "#64748b",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 56,
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#eff5fb",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
  },
  emptyTitleDark: {
    color: "#f8fafc",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 300,
  },
});
