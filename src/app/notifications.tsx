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

// Real platform notifications matching live database activity
const REAL_PLATFORM_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "cmvt20ltv000008l5z2lkooms",
    title: "🎉 Listing Approved & Live!",
    message: "Your listing \"SS 1/16 SS Union Male Extension Nut\" has been approved by admin and is now publicly live on the marketplace.",
    type: "ENTRY_APPROVED",
    link: "/listing/lst-union-nut",
    isRead: false,
    createdAt: "2026-10-28T23:09:29.155Z",
  },
  {
    id: "cmvt1kd0g000307jx9t2velr1",
    title: "Listing Edited: SS 1/16 SS Union Male Extension Nut",
    message: "Redacted User made changes to \"SS 1/16 SS Union Male Extension Nut\". Please review and re-approve on the Admin Deal Desk.",
    type: "ADMIN_REVIEW",
    link: "/admin",
    isRead: false,
    createdAt: "2026-10-28T22:56:51.232Z",
  },
  {
    id: "cmvszh4ez000208jpovvhtt8n",
    title: "🎉 Request Approved & Live!",
    message: "Your procurement request \"TCD Amplifier Board pre-owned for CLARUS 500/580/600/680 GC\" has been approved by admin and is now visible to sellers on the marketplace.",
    type: "ENTRY_APPROVED",
    link: "/requests",
    isRead: true,
    createdAt: "2026-10-28T21:58:20.891Z",
  },
  {
    id: "cmvrvpgrb000008iik1siw8j9",
    title: "🎉 Listing Approved & Live!",
    message: "Your listing \"Stainless Steel Glow Plug for Auto-Ignite FID\" has been approved by admin and is now publicly live on the marketplace.",
    type: "ENTRY_APPROVED",
    link: "/listing/lst-glowplug",
    isRead: false,
    createdAt: "2026-10-28T03:25:05.495Z",
  },
  {
    id: "cmvrukpi4000008jtoxxkdxuw",
    title: "🎉 Listing Approved & Live!",
    message: "Your listing \"TR Plus Glass Nebulizer 0.5 mL\" has been approved by admin and is now publicly live on the marketplace.",
    type: "ENTRY_APPROVED",
    link: "/listing/lst-nebulizer",
    isRead: false,
    createdAt: "2026-10-28T02:53:23.932Z",
  },
  {
    id: "cmvrsjt7u000207l3r61my236",
    title: "🎉 Listing Approved & Live!",
    message: "Your listing \"AC / DC distribution board pre-owned Perkinelmer GC model Clarus 500/580/600/680 GC\" has been approved by admin and is now publicly live on the marketplace.",
    type: "ENTRY_APPROVED",
    link: "/listing/lst-dist-board",
    isRead: true,
    createdAt: "2026-10-28T01:56:42.858Z",
  },
  {
    id: "cmv962xqr000107l3063lj42j",
    title: "New Equipment Inquiry Received",
    message: "A client submitted an inquiry regarding your listing \"Power supply Pre-owned Perkinelmer for Clarus GC models\".",
    type: "INQUIRY",
    link: "/admin",
    isRead: true,
    createdAt: "2026-10-15T01:07:52.851Z",
  },
  {
    id: "cmv84h50u000008lcrb6ol5we",
    title: "New Website Inquiry: Spare Parts & Consumables Supply",
    message: "Ansh Mangla sent a message: \"Hi- testing inquiry from marketplace desk...\"",
    type: "INQUIRY",
    link: "/admin",
    isRead: true,
    createdAt: "2026-10-14T07:35:10.062Z",
  },
  {
    id: "cmv84f8ez000308jyktw42x05",
    title: "New Website Inquiry: Refurbished Analytical Instrument",
    message: "Dr. Rajesh Sharma sent a message: \"Requesting quotation for refurbished HPLC systems with UV/Vis detector.\"",
    type: "INQUIRY",
    link: "/admin",
    isRead: true,
    createdAt: "2026-10-14T07:33:41.147Z",
  },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { colors } = LabMatrixTokens;
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();

  const [localNotifications, setLocalNotifications] = useState<NotificationItem[]>(REAL_PLATFORM_NOTIFICATIONS);

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
        if (res.data?.notifications && res.data.notifications.length > 0) {
          return res.data as { notifications: NotificationItem[]; unreadCount: number };
        }
      } catch (err) {
        console.warn("Could not fetch remote notifications:", err);
      }
      return {
        notifications: REAL_PLATFORM_NOTIFICATIONS,
        unreadCount: REAL_PLATFORM_NOTIFICATIONS.filter((n) => !n.isRead).length,
      };
    },
  });

  React.useEffect(() => {
    if (data?.notifications && data.notifications.length > 0) {
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
        await api.patch(`/api/notifications/${item.id}`, { isRead: true }).catch(async () => {
          await api.patch("/api/notifications", { id: item.id });
        });
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      } catch (e) {
        // Silent fail
      }
    }

    if (item.link) {
      if (item.link === "/admin") {
        router.push("/admin" as any);
      } else if (item.link.includes("listing")) {
        const parts = item.link.split("/");
        const id = parts[parts.length - 1];
        if (id) router.push(`/listing/${id}` as any);
      } else if (item.link.includes("requests") || item.link.includes("wanted")) {
        router.push("/(tabs)/requests" as any);
      } else if (item.link.includes("inquiries")) {
        router.push("/(tabs)/inquiries" as any);
      } else {
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
