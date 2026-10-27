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
import { ClipboardList, Clock, Layers } from "lucide-react-native";
import { api } from "@/lib/api";
import { Requirement } from "@/types/api";

export default function RequestsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [selectedStatus, setSelectedStatus] = useState<string>("OPEN");

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["requirements", selectedStatus],
    queryFn: async () => {
      const params: any = {};
      if (selectedStatus !== "ALL") params.status = selectedStatus;
      const res = await api.get("/api/requirements", { params });
      return (res.data?.requirements || []) as Requirement[];
    },
  });

  const renderRequirementCard = ({ item }: { item: Requirement }) => {
    const isFulfilled = item.status === "FULFILLED";

    return (
      <TouchableOpacity
        style={[styles.card, isDark && styles.cardDark]}
        activeOpacity={0.8}
        onPress={() => router.push(`/requests/${item.id}`)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.badgeRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{item.category}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                isFulfilled ? styles.statusFulfilled : styles.statusOpen,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  isFulfilled ? styles.statusFulfilledText : styles.statusOpenText,
                ]}
              >
                {item.status}
              </Text>
            </View>
          </View>
          <View style={styles.dateRow}>
            <Clock size={12} color="#64748b" />
            <Text style={styles.dateText}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <Text style={[styles.cardTitle, isDark && styles.cardTitleDark]} numberOfLines={2}>
          {item.title}
        </Text>

        <Text
          style={[styles.cardDescription, isDark && styles.cardDescriptionDark]}
          numberOfLines={3}
        >
          {item.description}
        </Text>

        {(item.partNumber || item.compatibleWith) && (
          <View style={styles.specsRow}>
            <Layers size={13} color="#64748b" />
            <Text style={styles.specsText} numberOfLines={1}>
              {item.partNumber ? `PN: ${item.partNumber}` : ""}
              {item.partNumber && item.compatibleWith ? " • " : ""}
              {item.compatibleWith ? `For: ${item.compatibleWith}` : ""}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Filter Tabs */}
      <View style={[styles.filterBar, isDark && styles.filterBarDark]}>
        {["OPEN", "FULFILLED", "ALL"].map((s) => {
          const isSelected = selectedStatus === s;
          return (
            <TouchableOpacity
              key={s}
              style={[
                styles.filterChip,
                isDark && styles.filterChipDark,
                isSelected && styles.filterChipSelected,
              ]}
              onPress={() => setSelectedStatus(s)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  isDark && styles.filterChipTextDark,
                  isSelected && styles.filterChipTextSelected,
                ]}
              >
                {s === "ALL" ? "All Requirements" : `${s.charAt(0)}${s.slice(1).toLowerCase()} Needs`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Requirements List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>
            Loading open equipment requirements...
          </Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={renderRequirementCard}
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
              <ClipboardList size={40} color="#94a3b8" />
              <Text style={[styles.emptyTitle, isDark && styles.emptyTitleDark]}>
                No requirements found
              </Text>
              <Text style={styles.emptySubtitle}>
                There are currently no active requests matching this filter.
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
  filterBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  filterBarDark: {
    backgroundColor: "#0f172a",
    borderBottomColor: "#1e293b",
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
  },
  filterChipDark: {
    backgroundColor: "#1e293b",
  },
  filterChipSelected: {
    backgroundColor: "#0284c7",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  filterChipTextDark: {
    color: "#94a3b8",
  },
  filterChipTextSelected: {
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
  badgeRow: {
    flexDirection: "row",
    gap: 6,
  },
  categoryBadge: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    color: "#0369a1",
    fontSize: 11,
    fontWeight: "700",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  statusOpen: {
    backgroundColor: "#dcfce7",
  },
  statusOpenText: {
    color: "#15803d",
    fontSize: 11,
    fontWeight: "700",
  },
  statusFulfilled: {
    backgroundColor: "#f1f5f9",
  },
  statusFulfilledText: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "700",
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
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 6,
  },
  cardTitleDark: {
    color: "#f8fafc",
  },
  cardDescription: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
    marginBottom: 8,
  },
  cardDescriptionDark: {
    color: "#94a3b8",
  },
  specsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 8,
  },
  specsText: {
    fontSize: 12,
    color: "#64748b",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: "#64748b",
  },
  loadingTextDark: {
    color: "#94a3b8",
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
  },
});
