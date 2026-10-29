import React, { useState, useMemo, useRef } from "react";
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
  ScrollView,
  Modal,
  Platform,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  MapPin,
  Tag,
  AlertCircle,
  RefreshCw,
  SlidersHorizontal,
  X,
  Bell,
  User,
  Check,
  PlusCircle,
  ArrowRight,
  MessageSquare,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react-native";
import { api } from "@/lib/api";
import { Listing } from "@/types/api";
import { useAuth } from "@/context/auth-context";
import { LabMatrixTokens } from "@/constants/theme";
import { getOptimizedImageUrl, IMAGE_PRESETS } from "@/lib/images";

const ITEM_TYPES = [
  { label: "All Items", value: "ALL" },
  { label: "Pre-Owned", value: "MACHINE" },
  { label: "Brand New", value: "NEW_INSTRUMENT" },
  { label: "Spare Parts", value: "SPARE_PART" },
];

const CATEGORIES = [
  "ALL",
  "HPLC & UHPLC",
  "GC & GC-MS",
  "UV-Vis & FTIR",
  "AAS",
  "ICP-OES & ICP-MS",
  "DSC-TGA & DMA",
  "Dissolution Testers",
  "Stability Chambers",
  "Particle Analyzers",
  "Centrifuges & Shakers",
  "Karl Fischer & Titrators",
  "Other Lab Equipment",
];

const PRICE_TIERS = [
  { label: "All Prices", min: "", max: "" },
  { label: "Under ₹3 Lakh", min: "", max: "300000" },
  { label: "₹3L - ₹8 Lakh", min: "300000", max: "800000" },
  { label: "₹8L - ₹20 Lakh", min: "800000", max: "2000000" },
  { label: "₹20 Lakh+", min: "2000000", max: "" },
];

export default function MarketplaceScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { colors } = LabMatrixTokens;
  const { isAuthenticated } = useAuth();
  const searchInputRef = useRef<any>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedPriceTier, setSelectedPriceTier] = useState(0);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Active filter count for badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== "ALL") count++;
    if (selectedPriceTier !== 0) count++;
    return count;
  }, [selectedCategory, selectedPriceTier]);

  // Query Backend Listings
  const {
    data,
    isLoading,
    isRefetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["listings", selectedType, selectedCategory, selectedPriceTier, searchQuery],
    queryFn: async () => {
      const params: any = { status: "AVAILABLE" };
      if (selectedType !== "ALL") params.itemType = selectedType;
      if (selectedCategory !== "ALL") params.category = selectedCategory;
      if (searchQuery.trim()) params.query = searchQuery.trim();

      const tier = PRICE_TIERS[selectedPriceTier];
      if (tier.min) params.minPrice = tier.min;
      if (tier.max) params.maxPrice = tier.max;

      const res = await api.get("/api/listings", { params });
      return (res.data?.listings || []) as Listing[];
    },
  });

  const resetAllFilters = () => {
    setSelectedType("ALL");
    setSelectedCategory("ALL");
    setSelectedPriceTier(0);
    setSearchQuery("");
  };

  const getLogisticsBadge = (item: Listing) => {
    if (item.status === "SOLD") {
      return { label: "Verified Transfer", bg: "#eff5fb", text: "#033a7d" };
    }
    if (item.itemType === "SPARE_PART") {
      return { label: "Tested 100% OK", bg: "#dcfce7", text: "#15803d" };
    }
    if (item.category.includes("HPLC") || item.category.includes("GC")) {
      return { label: "Inspection Open", bg: "#ffffff", text: "#475569", border: "#e2e8f0" };
    }
    return { label: "Self-Pickup Ready", bg: "#ffffff", text: "#475569", border: "#e2e8f0" };
  };

  const renderListingCard = ({ item }: { item: Listing }) => {
    const hasPhoto = item.photos && item.photos.length > 0;
    const isSold = item.status === "SOLD";
    const isSpare = item.itemType === "SPARE_PART";

    const formattedMinPrice = item.minPrice ? item.minPrice.toLocaleString("en-IN") : null;
    const formattedMaxPrice =
      item.maxPrice && item.minPrice && item.maxPrice > item.minPrice
        ? item.maxPrice.toLocaleString("en-IN")
        : null;

    const priceText = formattedMinPrice
      ? formattedMaxPrice
        ? `₹${formattedMinPrice} - ₹${formattedMaxPrice}`
        : `₹${formattedMinPrice}`
      : "Contact for Price";

    const logistics = getLogisticsBadge(item);
    const itemCode = item.partNumber
      ? `OEM Part: ${item.partNumber}`
      : `ID: ${item.id.replace(/-/g, "").slice(0, 10).toUpperCase()}`;

    return (
      <TouchableOpacity
        style={[styles.card, isDark && styles.cardDark]}
        activeOpacity={0.92}
        onPress={() => router.push(`/listing/${item.id}`)}
      >
        {/* 4:3 Image Container with Stitch Badges */}
        <View style={styles.imageContainer}>
          {hasPhoto ? (
            <Image
              source={{ uri: getOptimizedImageUrl(item.photos[0], IMAGE_PRESETS.CARD) }}
              style={[styles.cardImage, isSold && styles.cardImageSold]}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.placeholderImage, isDark && styles.placeholderImageDark]}>
              <Tag size={32} color={isDark ? "#64748b" : "#94a3b8"} />
              <Text style={styles.placeholderText}>Laboratory Equipment</Text>
            </View>
          )}

          {/* Top-Left Category Badge */}
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText} numberOfLines={1}>
              {isSpare ? "SPARE PARTS" : item.category.toUpperCase()}
            </Text>
          </View>

          {/* Top-Right Status Badge */}
          {isSold ? (
            <View style={styles.soldBadge}>
              <View style={styles.soldDot} />
              <Text style={styles.soldBadgeText}>SOLD OUT</Text>
            </View>
          ) : isSpare ? (
            <View style={styles.qtyBadge}>
              <View style={styles.qtyDot} />
              <Text style={styles.qtyBadgeText}>Qty: {item.quantity || 1} in Stock</Text>
            </View>
          ) : (
            <View style={styles.availableBadge}>
              <View style={styles.availableDot} />
              <Text style={styles.availableBadgeText}>AVAILABLE</Text>
            </View>
          )}
        </View>

        {/* Card Body */}
        <View style={styles.cardBody}>
          {/* Tag Row: Condition + Model/Part Code */}
          <View style={styles.tagRow}>
            <View style={styles.conditionPill}>
              <Text style={styles.conditionPillText} numberOfLines={1}>
                {item.condition || "Used - Good Working Condition"}
              </Text>
            </View>
            <Text style={styles.itemCodeText} numberOfLines={1}>
              {itemCode}
            </Text>
          </View>

          {/* Instrument Title */}
          <Text style={[styles.cardTitle, isDark && styles.cardTitleDark]} numberOfLines={2}>
            {item.title}
          </Text>

          {/* Spare Parts Compatibility Sub-row (if spare part) */}
          {isSpare && item.compatibleWith ? (
            <View style={styles.compatibleBox}>
              <Text style={styles.compatibleText} numberOfLines={1}>
                Compatible: {item.compatibleWith}
              </Text>
            </View>
          ) : null}

          {/* Price & Logistics Box (Gray Container) */}
          <View style={styles.priceLogisticsBox}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.priceSubtext}>
                {isSold ? "PRICE REALIZED (SOLD)" : isSpare ? "SURPLUS PRICE" : "EXPECTED PRICE"}
              </Text>
              <Text style={[styles.cardPrice, isSold && styles.cardPriceSold]} numberOfLines={1}>
                {priceText}
              </Text>
            </View>

            {/* Logistics Status Badge */}
            <View
              style={[
                styles.logisticsBadge,
                { backgroundColor: logistics.bg },
                logistics.border ? { borderWidth: 1, borderColor: logistics.border } : null,
              ]}
            >
              <Text style={[styles.logisticsBadgeText, { color: logistics.text }]}>
                {logistics.label}
              </Text>
            </View>
          </View>

          {/* Card Footer: Location & Action Button */}
          <View style={styles.cardFooter}>
            <View style={styles.locationRow}>
              <MapPin size={13} color="#64748b" />
              <Text style={styles.locationText} numberOfLines={1}>
                {item.location || "India Hub"}
              </Text>
            </View>

            {/* Inquire / Request Similar Action Button */}
            {isSold ? (
              <TouchableOpacity
                style={styles.requestSimilarBtn}
                activeOpacity={0.85}
                onPress={() => router.push(`/listing/${item.id}`)}
              >
                <Text style={styles.requestSimilarBtnText}>Request Similar</Text>
                <ArrowRight size={13} color="#0f172a" />
              </TouchableOpacity>
            ) : isSpare ? (
              <TouchableOpacity
                style={styles.inquireBtnLight}
                activeOpacity={0.85}
                onPress={() => router.push(`/listing/${item.id}`)}
              >
                <MessageSquare size={13} color={colors.primaryContainer} />
                <Text style={styles.inquireBtnLightText}>Inquire</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.inquireBtnNavy}
                activeOpacity={0.85}
                onPress={() => router.push(`/listing/${item.id}`)}
              >
                <MessageSquare size={13} color="#ffffff" />
                <Text style={styles.inquireBtnNavyText}>Inquire</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView edges={["top"]} style={[styles.safeArea, isDark && styles.safeAreaDark]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* 1. Top Branding Header Bar */}
      <View style={[styles.topBar, isDark && styles.topBarDark]}>
        <View style={styles.logoRow}>
          <Image
            source={require("@/assets/images/logo.png")}
            style={styles.logoImg}
            resizeMode="contain"
          />
        </View>

        <View style={styles.topRightIcons}>
          <TouchableOpacity
            style={styles.iconBtn}
            activeOpacity={0.7}
            onPress={() => searchInputRef.current?.focus()}
          >
            <Search size={20} color={isDark ? "#f8fafc" : "#0f172a"} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            activeOpacity={0.7}
            onPress={() => router.push("/notifications" as any)}
          >
            <Bell size={20} color={isDark ? "#f8fafc" : "#0f172a"} />
            <View style={styles.redDot} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.avatarCircle}
            activeOpacity={0.7}
            onPress={() =>
              router.push(isAuthenticated ? ("/profile" as any) : ("/(auth)/login" as any))
            }
          >
            <User size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Search Bar & Filter Drawer Trigger */}
      <View style={[styles.searchContainer, isDark && styles.searchContainerDark]}>
        <View style={[styles.searchInputWrapper, isDark && styles.searchInputWrapperDark]}>
          <Search size={16} color={isDark ? "#94a3b8" : colors.textMuted} />
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, isDark && styles.searchInputDark]}
            placeholder="Search HPLC, GC-MS, part numbers..."
            placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearSearchBtn}>
              <X size={15} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.filterTriggerBtn}
          activeOpacity={0.7}
          onPress={() => setFilterModalVisible(true)}
        >
          <SlidersHorizontal size={17} color={colors.primaryContainer} />
          <View style={styles.filterGoldDot} />
        </TouchableOpacity>
      </View>

      {/* 3. Row 1: Item Type Tabs (Pills) */}
      <View style={[styles.pillsRowWrapper, isDark && styles.pillsRowWrapperDark]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsScroll}
        >
          {ITEM_TYPES.map((t) => {
            const isSelected = selectedType === t.value;
            return (
              <TouchableOpacity
                key={t.value}
                style={[
                  styles.itemTypePill,
                  isDark && styles.itemTypePillDark,
                  isSelected && styles.itemTypePillSelected,
                ]}
                activeOpacity={0.75}
                onPress={() => setSelectedType(t.value)}
              >
                <Text
                  style={[
                    styles.itemTypePillText,
                    isDark && styles.itemTypePillTextDark,
                    isSelected && styles.itemTypePillTextSelected,
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 4. Row 2: Category Filter Sub-Pills */}
      <View style={[styles.categoryRowWrapper, isDark && styles.categoryRowWrapperDark]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map((cat) => {
            const isCatSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryPill,
                  isCatSelected && styles.categoryPillSelected,
                ]}
                activeOpacity={0.7}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    isCatSelected && styles.categoryPillTextSelected,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 5. Live Status / Available Instruments Bar */}
      <View style={[styles.statusBarRow, isDark && styles.statusBarRowDark]}>
        <View style={styles.statusLeft}>
          <View style={styles.statusLiveDot} />
          <Text style={styles.statusAvailableText}>
            {data ? `${data.length} INSTRUMENTS AVAILABLE` : "CATALOG AVAILABLE"}
          </Text>
        </View>

        <View style={styles.statusRight}>
          <ShieldCheck size={13} color="#64748b" />
          <Text style={styles.statusAuditedText}>100% Audited</Text>
        </View>
      </View>

      {/* Connection / Network Error Banner */}
      {isError && (
        <View style={styles.errorBanner}>
          <AlertCircle size={20} color="#dc2626" />
          <View style={{ flex: 1 }}>
            <Text style={styles.errorTitle}>Connection Error</Text>
            <Text style={styles.errorMessage}>
              Could not reach {(api.defaults.baseURL || "backend")}. Ensure internet connection.
            </Text>
          </View>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <RefreshCw size={13} color={colors.primaryContainer} />
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 6. Main Listing Feed */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primaryContainer} />
          <Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>
            Loading laboratory instruments...
          </Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={renderListingCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                refetch();
              }}
              tintColor={colors.primaryContainer}
            />
          }
          ListEmptyComponent={
            !isError ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Search size={32} color={colors.textMuted} />
                </View>
                <Text style={[styles.emptyTitle, isDark && styles.emptyTitleDark]}>
                  No laboratory equipment found
                </Text>
                <Text style={styles.emptySubtitle}>
                  No listings matched your criteria. Try adjusting your search query or reset your filters.
                </Text>
                <View style={styles.emptyActionRow}>
                  <TouchableOpacity style={styles.resetFiltersBtn} onPress={resetAllFilters}>
                    <Text style={styles.resetFiltersBtnText}>Reset All Filters</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.listMachineBtn}
                    onPress={() => router.push("/sell" as any)}
                  >
                    <PlusCircle size={15} color={colors.brandBlue900} />
                    <Text style={styles.listMachineBtnText}>List Equipment</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : undefined
          }
        />
      )}

      {/* 7. Multi-Attribute Filter Modal */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={[styles.modalSheet, isDark && styles.modalSheetDark]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <SlidersHorizontal size={18} color={colors.primaryContainer} />
                <Text style={[styles.modalTitle, isDark && styles.modalTitleDark]}>
                  Filter Marketplace
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setFilterModalVisible(false)}
                style={styles.closeModalBtn}
              >
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Category Filter */}
              <Text style={styles.modalSectionTitle}>Instrument Category</Text>
              <View style={styles.modalOptionsGrid}>
                {CATEGORIES.map((cat) => {
                  const isCatSelected = selectedCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.modalOptionPill,
                        isCatSelected && styles.modalOptionPillSelected,
                      ]}
                      onPress={() => setSelectedCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.modalOptionPillText,
                          isCatSelected && styles.modalOptionPillTextSelected,
                        ]}
                      >
                        {cat === "ALL" ? "All Categories" : cat}
                      </Text>
                      {isCatSelected && <Check size={14} color="#ffffff" />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Price Tier Filter */}
              <Text style={[styles.modalSectionTitle, { marginTop: 20 }]}>Price Range</Text>
              <View style={styles.modalOptionsGrid}>
                {PRICE_TIERS.map((tier, idx) => {
                  const isTierSelected = selectedPriceTier === idx;
                  return (
                    <TouchableOpacity
                      key={tier.label}
                      style={[
                        styles.modalOptionPill,
                        isTierSelected && styles.modalOptionPillSelected,
                      ]}
                      onPress={() => setSelectedPriceTier(idx)}
                    >
                      <Text
                        style={[
                          styles.modalOptionPillText,
                          isTierSelected && styles.modalOptionPillTextSelected,
                        ]}
                      >
                        {tier.label}
                      </Text>
                      {isTierSelected && <Check size={14} color="#ffffff" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalResetBtn}
                onPress={() => {
                  setSelectedCategory("ALL");
                  setSelectedPriceTier(0);
                }}
              >
                <Text style={styles.modalResetBtnText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalApplyBtn}
                onPress={() => setFilterModalVisible(false)}
              >
                <Text style={styles.modalApplyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  safeAreaDark: {
    backgroundColor: LabMatrixTokens.colors.brandBlue950,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 10 : 4,
    paddingBottom: 8,
    backgroundColor: "#ffffff",
  },
  topBarDark: {
    backgroundColor: "#0b1329",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoImg: {
    width: 140,
    height: 32,
  },
  topRightIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconBtn: {
    padding: 4,
    position: "relative",
  },
  redDot: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#f43f5e",
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#002555",
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    backgroundColor: "#ffffff",
    gap: 10,
  },
  searchContainerDark: {
    backgroundColor: "#0b1329",
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  searchInputWrapperDark: {
    backgroundColor: "#16203a",
    borderColor: "#1e293b",
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: "#0f172a",
  },
  searchInputDark: {
    color: "#f8fafc",
  },
  clearSearchBtn: {
    padding: 4,
  },
  filterTriggerBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#eff5fb",
    borderWidth: 1,
    borderColor: "#dbeaf7",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  filterGoldDot: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fbc634",
  },
  pillsRowWrapper: {
    backgroundColor: "#ffffff",
    paddingBottom: 6,
  },
  pillsRowWrapperDark: {
    backgroundColor: "#0b1329",
  },
  pillsScroll: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
  },
  itemTypePill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  itemTypePillDark: {
    backgroundColor: "#16203a",
    borderColor: "#1e293b",
  },
  itemTypePillSelected: {
    backgroundColor: "#002555",
    borderColor: "#002555",
  },
  itemTypePillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  itemTypePillTextDark: {
    color: "#94a3b8",
  },
  itemTypePillTextSelected: {
    color: "#ffffff",
    fontWeight: "700",
  },
  categoryRowWrapper: {
    backgroundColor: "#ffffff",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  categoryRowWrapperDark: {
    backgroundColor: "#0b1329",
    borderBottomColor: "#1e293b",
  },
  categoryScroll: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    alignItems: "center",
  },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryPillSelected: {
    backgroundColor: "#dbeaf7",
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
  },
  categoryPillTextSelected: {
    color: "#033a7d",
    fontWeight: "800",
  },
  statusBarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#f8fafc",
  },
  statusBarRowDark: {
    backgroundColor: "#090e1d",
  },
  statusLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16a34a",
  },
  statusAvailableText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    letterSpacing: 0.3,
  },
  statusRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusAuditedText: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "500",
  },
  listContent: {
    padding: 16,
    gap: 18,
    backgroundColor: "#f8fafc",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardDark: {
    backgroundColor: "#0b1329",
    borderColor: "#1e293b",
  },
  imageContainer: {
    width: "100%",
    aspectRatio: 4 / 3,
    backgroundColor: "#f1f5f9",
    position: "relative",
    overflow: "hidden",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  cardImageSold: {
    opacity: 0.9,
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  placeholderImageDark: {
    backgroundColor: "#16203a",
  },
  placeholderText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
  categoryBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(1, 25, 54, 0.92)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  availableBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#dcfce7",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
    gap: 5,
  },
  availableDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#15803d",
  },
  availableBadgeText: {
    color: "#15803d",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  soldBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(15, 23, 42, 0.92)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
    gap: 5,
  },
  soldDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#f43f5e",
  },
  soldBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  qtyBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#fef3c7",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
    gap: 5,
  },
  qtyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#b45309",
  },
  qtyBadgeText: {
    color: "#b45309",
    fontSize: 10,
    fontWeight: "800",
  },
  cardBody: {
    padding: 14,
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  conditionPill: {
    backgroundColor: "#eff5fb",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    maxWidth: "60%",
  },
  conditionPillText: {
    color: "#033a7d",
    fontSize: 11,
    fontWeight: "700",
  },
  itemCodeText: {
    fontSize: 10,
    color: "#64748b",
    fontFamily: Platform.select({ ios: "Courier", android: "monospace" }),
    fontWeight: "600",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    lineHeight: 22,
    marginBottom: 8,
  },
  cardTitleDark: {
    color: "#f8fafc",
  },
  compatibleBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  compatibleText: {
    fontSize: 11,
    color: "#475569",
    fontFamily: Platform.select({ ios: "Courier", android: "monospace" }),
  },
  priceLogisticsBox: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  priceSubtext: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  cardPrice: {
    fontSize: 17,
    fontWeight: "900",
    color: "#002555",
  },
  cardPriceSold: {
    color: "#475569",
  },
  logisticsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  logisticsBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 2,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: 160,
  },
  locationText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },
  inquireBtnNavy: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#033a7d",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  inquireBtnNavyText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  inquireBtnLight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#dbeaf7",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  inquireBtnLightText: {
    color: "#033a7d",
    fontSize: 12,
    fontWeight: "700",
  },
  requestSimilarBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f59e0b",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  requestSimilarBtnText: {
    color: "#0f172a",
    fontSize: 12,
    fontWeight: "800",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  loadingTextDark: {
    color: "#94a3b8",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fee2e2",
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    gap: 10,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#991b1b",
  },
  errorMessage: {
    fontSize: 12,
    color: "#b91c1c",
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#033a7d",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 50,
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
  },
  emptyTitleDark: {
    color: "#f8fafc",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 18,
  },
  emptyActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  resetFiltersBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  resetFiltersBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  listMachineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#fbc634",
  },
  listMachineBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#002555",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    maxHeight: "85%",
  },
  modalSheetDark: {
    backgroundColor: "#0b1329",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  modalHeaderTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
  },
  modalTitleDark: {
    color: "#f8fafc",
  },
  closeModalBtn: {
    padding: 4,
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  modalOptionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  modalOptionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  modalOptionPillSelected: {
    backgroundColor: "#002555",
    borderColor: "#002555",
  },
  modalOptionPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  modalOptionPillTextSelected: {
    color: "#ffffff",
    fontWeight: "700",
  },
  modalFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  modalResetBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  modalResetBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
  },
  modalApplyBtn: {
    flex: 2,
    backgroundColor: "#002555",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  modalApplyBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
});
