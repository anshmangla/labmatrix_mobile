import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  useColorScheme,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Clock, Info } from "lucide-react-native";
import { api } from "@/lib/api";
import { useAuth } from "@/context/auth-context";

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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["notifications"],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await api.get("/api/notifications");
      return res.data as { notifications: NotificationItem[]; unreadCount: number };
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.patch("/api/notifications", { all: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <View
      style={[
        styles.card,
        isDark && styles.cardDark,
        !item.isRead && styles.cardUnread,
        !item.isRead && isDark && styles.cardUnreadDark,
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          {!item.isRead && <View style={styles.unreadDot} />}
          <Text style={[styles.title, isDark && styles.titleDark]}>{item.title}</Text>
        </View>
        <View style={styles.dateRow}>
          <Clock size={11} color="#94a3b8" />
          <Text style={styles.dateText}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
      <Text style={[styles.message, isDark && styles.messageDark]}>{item.message}</Text>
    </View>
  );

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Top Header Controls */}
      {data && data.unreadCount > 0 && (
        <View style={[styles.controlBar, isDark && styles.controlBarDark]}>
          <Text style={styles.unreadCountText}>{data.unreadCount} unread notification(s)</Text>
          <TouchableOpacity
            style={styles.markAllBtn}
            onPress={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
          >
            <CheckCheck size={16} color="#0284c7" />
            <Text style={styles.markAllBtnText}>Mark all as read</Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : (
        <FlatList
          data={data?.notifications || []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                refetch();
              }}
              tintColor="#0284c7"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Bell size={42} color="#94a3b8" />
              <Text style={[styles.emptyTitle, isDark && styles.emptyTitleDark]}>
                No notifications yet
              </Text>
              <Text style={styles.emptySubtitle}>
                You will receive updates here when listings are approved or inquiries arrive.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  containerDark: {
    backgroundColor: "#090d16",
  },
  controlBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  controlBarDark: {
    backgroundColor: "#0f172a",
    borderBottomColor: "#1e293b",
  },
  unreadCountText: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "600",
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  markAllBtnText: {
    fontSize: 13,
    color: "#0284c7",
    fontWeight: "700",
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardDark: {
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
  },
  cardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: "#0284c7",
    backgroundColor: "#f0f9ff",
  },
  cardUnreadDark: {
    backgroundColor: "#082f49",
    borderLeftColor: "#38bdf8",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#0284c7",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
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
    color: "#94a3b8",
  },
  message: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
  },
  messageDark: {
    color: "#cbd5e1",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  emptyTitleDark: {
    color: "#f8fafc",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
