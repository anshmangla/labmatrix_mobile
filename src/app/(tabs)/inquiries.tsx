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
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Mail, Phone, Building, Clock, LogIn } from "lucide-react-native";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { Inquiry } from "@/types/api";

export default function InquiriesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState<"received" | "sent">("received");

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["inquiries"],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await api.get("/api/inquiries");
      return res.data as { received: Inquiry[]; sent: Inquiry[] };
    },
  });

  if (!isAuthenticated) {
    return (
      <View style={[styles.authContainer, isDark && styles.authContainerDark]}>
        <LogIn size={48} color="#0284c7" />
        <Text style={[styles.authTitle, isDark && styles.authTitleDark]}>
          Sign In to View Inquiries
        </Text>
        <Text style={styles.authSubtitle}>
          Track buyer requests and communicate regarding your equipment listings.
        </Text>
        <TouchableOpacity
          style={styles.signInBtn}
          onPress={() => router.push("/(auth)/login")}
        >
          <Text style={styles.signInBtnText}>Sign In / Register</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const inquiriesList = activeTab === "received" ? data?.received || [] : data?.sent || [];

  const renderInquiryCard = ({ item }: { item: Inquiry }) => {
    const targetTitle = item.listing?.title || item.requirement?.title || "Market Item";

    return (
      <View style={[styles.card, isDark && styles.cardDark]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.targetTitle, isDark && styles.targetTitleDark]} numberOfLines={1}>
            {targetTitle}
          </Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{item.status}</Text>
          </View>
        </View>

        <Text style={[styles.messageText, isDark && styles.messageTextDark]}>
          "{item.message}"
        </Text>

        <View style={styles.contactDetails}>
          <View style={styles.contactItem}>
            <Mail size={13} color="#64748b" />
            <Text style={styles.contactText}>{item.email}</Text>
          </View>
          {item.phone && (
            <View style={styles.contactItem}>
              <Phone size={13} color="#64748b" />
              <Text style={styles.contactText}>{item.phone}</Text>
            </View>
          )}
          {item.company && (
            <View style={styles.contactItem}>
              <Building size={13} color="#64748b" />
              <Text style={styles.contactText}>{item.company}</Text>
            </View>
          )}
        </View>

        <View style={styles.footerRow}>
          <View style={styles.dateRow}>
            <Clock size={11} color="#94a3b8" />
            <Text style={styles.dateText}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Segment Selector */}
      <View style={[styles.segmentBar, isDark && styles.segmentBarDark]}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === "received" && styles.segmentBtnActive]}
          onPress={() => setActiveTab("received")}
        >
          <Text
            style={[
              styles.segmentBtnText,
              activeTab === "received" && styles.segmentBtnTextActive,
            ]}
          >
            Received ({data?.received?.length || 0})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === "sent" && styles.segmentBtnActive]}
          onPress={() => setActiveTab("sent")}
        >
          <Text
            style={[
              styles.segmentBtnText,
              activeTab === "sent" && styles.segmentBtnTextActive,
            ]}
          >
            Sent ({data?.sent?.length || 0})
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={styles.loadingText}>Loading inquiries...</Text>
        </View>
      ) : (
        <FlatList
          data={inquiriesList}
          keyExtractor={(item) => item.id}
          renderItem={renderInquiryCard}
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
              <MessageSquare size={40} color="#94a3b8" />
              <Text style={[styles.emptyTitle, isDark && styles.emptyTitleDark]}>
                No inquiries {activeTab === "received" ? "received yet" : "sent yet"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === "received"
                  ? "When buyers inquire about your instruments, messages will appear here."
                  : "Inquiries you send for marketplace equipment will appear here."}
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
  authContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  authContainerDark: {
    backgroundColor: "#090d16",
  },
  authTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
  },
  authTitleDark: {
    color: "#f8fafc",
  },
  authSubtitle: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 10,
  },
  signInBtn: {
    backgroundColor: "#0284c7",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  signInBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },
  segmentBar: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    padding: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  segmentBarDark: {
    backgroundColor: "#0f172a",
    borderBottomColor: "#1e293b",
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  segmentBtnActive: {
    backgroundColor: "#0284c7",
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  segmentBtnTextActive: {
    color: "#ffffff",
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardDark: {
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  targetTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    flex: 1,
    marginRight: 8,
  },
  targetTitleDark: {
    color: "#f8fafc",
  },
  statusBadge: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    color: "#0369a1",
    fontWeight: "700",
  },
  messageText: {
    fontSize: 14,
    color: "#334155",
    fontStyle: "italic",
    marginBottom: 12,
  },
  messageTextDark: {
    color: "#cbd5e1",
  },
  contactDetails: {
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 8,
    gap: 6,
    marginBottom: 10,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  contactText: {
    fontSize: 13,
    color: "#475569",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
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
    paddingTop: 60,
    gap: 8,
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
    paddingHorizontal: 20,
  },
});
