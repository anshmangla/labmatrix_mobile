import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  useColorScheme,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, MapPin, Tag } from "lucide-react-native";
import { api } from "@/lib/api";
import { Listing } from "@/types/api";

const ITEM_TYPES = [
  { label: "All Items", value: "ALL" },
  { label: "Equipment", value: "EQUIPMENT" },
  { label: "Spare Parts", value: "SPARE_PART" },
];

export default function MarketplaceScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["listings", selectedType, searchQuery],
    queryFn: async () => {
      const params: any = { status: "AVAILABLE" };
      if (selectedType !== "ALL") params.itemType = selectedType;
      if (searchQuery.trim()) params.query = searchQuery.trim();

      const res = await api.get("/api/listings", { params });
      return (res.data?.listings || []) as Listing[];
    },
  });

  const renderListingCard = ({ item }: { item: Listing }) => {
    const hasPhoto = item.photos && item.photos.length > 0;
    const priceText =
      item.minPrice && item.maxPrice
        ? item.minPrice === item.maxPrice
          ? `₹${item.minPrice.toLocaleString()}`
          : `₹${item.minPrice.toLocaleString()} - ₹${item.maxPrice.toLocaleString()}`
        : item.minPrice
        ? `₹${item.minPrice.toLocaleString()}`
        : "Contact for Price";

    return (
      <TouchableOpacity
        style={[styles.card, isDark && styles.cardDark]}
        activeOpacity={0.8}
        onPress={() => router.push(`/listing/${item.id}`)}
      >
        {hasPhoto ? (
          <Image source={{ uri: item.photos[0] }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={[styles.placeholderImage, isDark && styles.placeholderImageDark]}>
            <Tag size={28} color={isDark ? "#64748b" : "#94a3b8"} />
          </View>
        )}

        <View style={styles.cardBody}>
          <View style={styles.badgeRow}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>
                {item.itemType === "SPARE_PART" ? "Spare Part" : "Equipment"}
              </Text>
            </View>
            <View style={styles.conditionBadge}>
              <Text style={styles.conditionBadgeText}>{item.condition}</Text>
            </View>
          </View>

          <Text style={[styles.cardTitle, isDark && styles.cardTitleDark]} numberOfLines={2}>
            {item.title}
          </Text>

          <Text style={[styles.cardCategory, isDark && styles.cardCategoryDark]}>
            {item.category}
          </Text>

          <View style={styles.cardFooter}>
            <Text style={styles.cardPrice}>{priceText}</Text>
            {item.location && (
              <View style={styles.locationRow}>
                <MapPin size={12} color="#64748b" />
                <Text style={styles.locationText} numberOfLines={1}>
                  {item.location}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Search Header */}
      <View style={[styles.searchContainer, isDark && styles.searchContainerDark]}>
        <View style={[styles.searchInputWrapper, isDark && styles.searchInputWrapperDark]}>
          <Search size={18} color={isDark ? "#94a3b8" : "#64748b"} />
          <TextInput
            style={[styles.searchInput, isDark && styles.searchInputDark]}
            placeholder="Search instruments, parts, models..."
            placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {ITEM_TYPES.map((t) => {
          const isSelected = selectedType === t.value;
          return (
            <TouchableOpacity
              key={t.value}
              style={[
                styles.filterChip,
                isDark && styles.filterChipDark,
                isSelected && styles.filterChipSelected,
              ]}
              onPress={() => setSelectedType(t.value)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  isDark && styles.filterChipTextDark,
                  isSelected && styles.filterChipTextSelected,
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Listing Feed */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>
            Loading laboratory listings...
          </Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={renderListingCard}
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
              <Tag size={40} color="#94a3b8" />
              <Text style={[styles.emptyTitle, isDark && styles.emptyTitleDark]}>
                No listings found
              </Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your search query or filters.
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  searchContainerDark: {
    backgroundColor: "#0f172a",
    borderBottomColor: "#1e293b",
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInputWrapperDark: {
    backgroundColor: "#1e293b",
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: "#0f172a",
  },
  searchInputDark: {
    color: "#f8fafc",
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#e2e8f0",
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
    gap: 14,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardDark: {
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
  },
  cardImage: {
    width: "100%",
    height: 180,
  },
  placeholderImage: {
    width: "100%",
    height: 140,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderImageDark: {
    backgroundColor: "#1e293b",
  },
  cardBody: {
    padding: 14,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 6,
  },
  typeBadge: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    color: "#0369a1",
    fontSize: 11,
    fontWeight: "700",
  },
  conditionBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  conditionBadgeText: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "600",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },
  cardTitleDark: {
    color: "#f8fafc",
  },
  cardCategory: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 10,
  },
  cardCategoryDark: {
    color: "#94a3b8",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 10,
  },
  cardPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0284c7",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: 140,
  },
  locationText: {
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
