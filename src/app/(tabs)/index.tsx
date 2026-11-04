import React, { useState, useMemo, useRef, useCallback, useEffect, memo } from "react";
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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import Search from "lucide-react-native/icons/search";
import MapPin from "lucide-react-native/icons/map-pin";
import Tag from "lucide-react-native/icons/tag";
import AlertCircle from "lucide-react-native/icons/circle-alert";
import RefreshCw from "lucide-react-native/icons/refresh-cw";
import SlidersHorizontal from "lucide-react-native/icons/sliders-horizontal";
import X from "lucide-react-native/icons/x";
import Bell from "lucide-react-native/icons/bell";
import User from "lucide-react-native/icons/user";
import Check from "lucide-react-native/icons/check";
import PlusCircle from "lucide-react-native/icons/circle-plus";
import ArrowRight from "lucide-react-native/icons/arrow-right";
import MessageSquare from "lucide-react-native/icons/message-square";
import LayoutGrid from "lucide-react-native/icons/layout-grid";
import Microscope from "lucide-react-native/icons/microscope";
import PackageCheck from "lucide-react-native/icons/package-check";
import Wrench from "lucide-react-native/icons/wrench";
import { api } from "@/lib/api";
import { Listing } from "@/types/api";
import { useAuth } from "@/context/auth-context";
import { LabMatrixTokens } from "@/constants/theme";
import { getOptimizedImageUrl, IMAGE_PRESETS } from "@/lib/images";
import { ProfileQuickMenuModal } from "@/components/ProfileQuickMenuModal";
import { EscrowPolicyModal } from "@/components/EscrowPolicyModal";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";

// Marketplace sections, shown as the tab bar and (for the three item types) as entry tiles
const ITEM_TYPES = [
  { label: "All", title: "All listings", value: "ALL", icon: LayoutGrid, description: "" },
  {
    label: "Pre-Owned",
    title: "Pre-Owned Instruments",
    value: "MACHINE",
    icon: Microscope,
    description: "Used & refurbished lab instruments",
  },
  {
    label: "Brand New",
    title: "Brand New Instruments",
    value: "NEW_INSTRUMENT",
    icon: PackageCheck,
    description: "Factory-sealed new instruments",
  },
  {
    label: "Spare Parts",
    title: "Spare Parts",
    value: "SPARE_PART",
    icon: Wrench,
    description: "Boards, lamps, modules & consumables",
  },
];
const SECTION_TILES = ITEM_TYPES.filter((t) => t.value !== "ALL");

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

const STATUS_OPTIONS: { label: string; value: "ALL" | "AVAILABLE" | "SOLD" }[] = [
  { label: "All Items", value: "ALL" },
  { label: "Available / In Stock", value: "AVAILABLE" },
  { label: "Sold Out", value: "SOLD" },
];

const PAGE_SIZE = 30;

/**
 * One marketplace card. Memoized so typing in search or opening a modal doesn't
 * re-render every card in the feed.
 */
const ListingCard = memo(function ListingCard({
  item,
  isDark,
  onOpen,
}: {
  item: Listing;
  isDark: boolean;
  onOpen: (id: string) => void;
}) {
  const { colors } = LabMatrixTokens;
  const open = () => onOpen(item.id);
  // Start downloading the detail screen's large photo as soon as the card is pressed
  const prefetchDetailPhoto = () => {
    if (item.photos?.[0]) {
      ExpoImage.prefetch(getOptimizedImageUrl(item.photos[0], IMAGE_PRESETS.HERO), "memory-disk").catch(() => {});
    }
  };
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

  const itemCode = item.partNumber ? `OEM Part: ${item.partNumber}` : null;

  return (
    <TouchableOpacity
      style={[styles.card, isDark && styles.cardDark]}
      activeOpacity={0.92}
      onPressIn={prefetchDetailPhoto}
              onPress={open}
    >
      {/* 4:3 Image Container with Stitch Badges */}
      <View style={[styles.imageContainer, !hasPhoto && styles.imageContainerNoPhoto]}>
        {hasPhoto ? (
          <ExpoImage
            source={{ uri: getOptimizedImageUrl(item.photos[0], IMAGE_PRESETS.CARD) }}
            style={[styles.cardImage, isSold && styles.cardImageSold]}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={item.id}
          />
        ) : (
          <View style={[styles.placeholderImage, isDark && styles.placeholderImageDark]}>
            <Tag size={22} color={isDark ? "#64748b" : "#94a3b8"} />
            <Text style={styles.placeholderText}>No photo yet</Text>
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
        {(item.condition || itemCode) ? (
          <View style={styles.tagRow}>
            {item.condition ? (
              <View style={styles.conditionPill}>
                <Text style={styles.conditionPillText} numberOfLines={1}>
                  {item.condition}
                </Text>
              </View>
            ) : null}
            {itemCode ? (
              <Text style={styles.itemCodeText} numberOfLines={1}>
                {itemCode}
              </Text>
            ) : null}
          </View>
        ) : null}

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

        {/* Price Box (Gray Container) */}
        <View style={styles.priceLogisticsBox}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.priceSubtext}>
              {isSold ? "PRICE REALIZED (SOLD)" : isSpare ? "SURPLUS PRICE" : "EXPECTED PRICE"}
            </Text>
            <Text style={[styles.cardPrice, isSold && styles.cardPriceSold]} numberOfLines={1}>
              {priceText}
            </Text>
          </View>

        </View>

        {/* Card Footer: Location & Action Button */}
        <View style={styles.cardFooter}>
          {item.location ? (
            <View style={styles.locationRow}>
              <MapPin size={13} color="#64748b" />
              <Text style={styles.locationText} numberOfLines={1}>
                {item.location}
              </Text>
            </View>
          ) : (
            <View />
          )}

          {/* Inquire / Request Similar Action Button */}
          {isSold ? (
            <TouchableOpacity
              style={styles.requestSimilarBtn}
              activeOpacity={0.85}
              onPressIn={prefetchDetailPhoto}
              onPress={open}
            >
              <Text style={styles.requestSimilarBtnText}>Request Similar</Text>
              <ArrowRight size={13} color="#b45309" />
            </TouchableOpacity>
          ) : isSpare ? (
            <TouchableOpacity
              style={styles.inquireBtnLight}
              activeOpacity={0.85}
              onPressIn={prefetchDetailPhoto}
              onPress={open}
            >
              <MessageSquare size={13} color={colors.primaryContainer} />
              <Text style={styles.inquireBtnLightText}>Inquire</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.inquireBtnNavy}
              activeOpacity={0.85}
              onPressIn={prefetchDetailPhoto}
              onPress={open}
            >
              <MessageSquare size={13} color="#ffffff" />
              <Text style={styles.inquireBtnNavyText}>Inquire</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default function MarketplaceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { colors } = LabMatrixTokens;
  const { isAuthenticated, user } = useAuth();
  const searchInputRef = useRef<any>(null);

  // Profile Menu & Escrow Modals
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [escrowModalVisible, setEscrowModalVisible] = useState(false);

  const userInitials = useMemo(() => {
    if (!user) return "LM";
    if (user.name && user.name.trim().length > 0) {
      const parts = user.name.trim().split(/\s+/);
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return user.name.slice(0, 2).toUpperCase();
    }
    if (user.email && user.email.trim().length > 0) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return "LM";
  }, [user]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState<"ALL" | "AVAILABLE" | "SOLD">("ALL");
  const [selectedPriceTier, setSelectedPriceTier] = useState(0);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  // Search the server once typing pauses, not on every keystroke
  const debouncedSearch = useDebouncedValue(searchQuery.trim());

  // Active filter count for badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedStatus !== "ALL") count++;
    if (selectedCategory !== "ALL") count++;
    if (selectedPriceTier !== 0) count++;
    return count;
  }, [selectedStatus, selectedCategory, selectedPriceTier]);

  // Fetch unread notifications count
  const { data: notificationsData } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await api.get("/api/notifications");
      return res.data as { notifications: any[]; unreadCount: number };
    },
    enabled: isAuthenticated,
    staleTime: 30000,
  });
  const unreadCount = notificationsData?.unreadCount || 0;

  // Query Backend Listings
  const {
    data: pagedData,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["listings", selectedType, selectedCategory, selectedStatus, selectedPriceTier, debouncedSearch],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const params: any = { page: pageParam, limit: PAGE_SIZE };
      // When status is "ALL", do not restrict status so backend returns both AVAILABLE and SOLD
      if (selectedStatus !== "ALL") {
        params.status = selectedStatus;
      }
      if (selectedType !== "ALL") params.itemType = selectedType;
      if (selectedCategory !== "ALL") params.category = selectedCategory;
      if (debouncedSearch) params.query = debouncedSearch;

      const tier = PRICE_TIERS[selectedPriceTier];
      if (tier.min) params.minPrice = tier.min;
      if (tier.max) params.maxPrice = tier.max;

      const res = await api.get("/api/listings", { params });
      return {
        listings: (res.data?.listings || []) as Listing[],
        page: (res.data?.pagination?.page as number) ?? pageParam,
        totalPages: (res.data?.pagination?.totalPages as number) ?? 1,
        total: res.data?.pagination?.total as number | undefined,
      };
    },
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  });
  // Spinner only for refreshes the user pulled for; background refreshes stay silent
  const pullToRefresh = usePullToRefresh(refetch);

  // Flatten loaded pages; skip duplicates if new items shifted page boundaries
  const data = useMemo(() => {
    if (!pagedData) return undefined;
    const seen = new Set<string>();
    return pagedData.pages
      .flatMap((p) => p.listings)
      .filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)));
  }, [pagedData]);
  const totalCount = pagedData?.pages[0]?.total ?? data?.length ?? 0;

  const currentSection = ITEM_TYPES.find((t) => t.value === selectedType) ?? ITEM_TYPES[0];
  const showSectionTiles = selectedType === "ALL" && !searchQuery.trim();

  const resetAllFilters = () => {
    setSelectedType("ALL");
    setSelectedCategory("ALL");
    setSelectedStatus("ALL");
    setSelectedPriceTier(0);
    setSearchQuery("");
  };

  // Download this page's card photos to disk in the background, so cards further down the
  // list already have their photo when scrolled into view
  const prefetchedCardPhotos = useRef(new Set<string>());
  useEffect(() => {
    const urls = (data ?? [])
      .map((item) => (item.photos?.[0] ? getOptimizedImageUrl(item.photos[0], IMAGE_PRESETS.CARD) : null))
      .filter((url): url is string => !!url && !prefetchedCardPhotos.current.has(url));
    if (urls.length === 0) return;
    urls.forEach((url) => prefetchedCardPhotos.current.add(url));
    ExpoImage.prefetch(urls, "disk").catch(() => {});
  }, [data]);

  const openListing = useCallback((id: string) => router.push(`/listing/${id}`), [router]);
  const renderListingCard = useCallback(
    ({ item }: { item: Listing }) => <ListingCard item={item} isDark={isDark} onOpen={openListing} />,
    [isDark, openListing]
  );

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
            {unreadCount > 0 && <View style={styles.redDot} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.avatarCircle}
            activeOpacity={0.7}
            onPress={() => {
              if (isAuthenticated) {
                setProfileMenuVisible(true);
              } else {
                router.push("/(auth)/login" as any);
              }
            }}
            accessibilityLabel="Open Profile Menu"
          >
            {isAuthenticated ? (
              <Text style={styles.avatarText}>{userInitials}</Text>
            ) : (
              <User size={16} color="#ffffff" />
            )}
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
          {activeFilterCount > 0 && (
            <View style={styles.filterCountBadge}>
              <Text style={styles.filterCountText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* 3. Section Tab Bar (stays above the feed) */}
      <View style={[styles.sectionTabs, isDark && styles.sectionTabsDark]} accessibilityRole="tablist">
        {ITEM_TYPES.map((t) => {
          const isSelected = selectedType === t.value;
          const Icon = t.icon;
          return (
            <TouchableOpacity
              key={t.value}
              style={styles.sectionTab}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              onPress={() => setSelectedType(t.value)}
            >
              <Icon size={18} color={isSelected ? colors.primaryContainer : "#64748b"} />
              <Text
                style={[
                  styles.sectionTabText,
                  isDark && styles.sectionTabTextDark,
                  isSelected && styles.sectionTabTextActive,
                ]}
                numberOfLines={1}
              >
                {t.label}
              </Text>
              <View style={[styles.sectionTabIndicator, isSelected && styles.sectionTabIndicatorActive]} />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 6. Live Status / Available Instruments Bar */}
      <View style={[styles.statusBarRow, isDark && styles.statusBarRowDark]}>
        <View style={styles.statusLeft}>
          <View
            style={[
              styles.statusLiveDot,
              selectedStatus === "SOLD" && { backgroundColor: "#f43f5e" },
            ]}
          />
          <Text style={styles.statusAvailableText}>
            {`${currentSection.title.toUpperCase()}${
              data
                ? ` · ${totalCount} ${
                    selectedStatus === "SOLD" ? "SOLD" : selectedStatus === "AVAILABLE" ? "AVAILABLE" : "ITEMS"
                  }`
                : ""
            }`}
          </Text>
        </View>

      </View>

      {/* Connection / Network Error Banner */}
      {isError && (
        <View style={styles.errorBanner}>
          <AlertCircle size={20} color="#dc2626" />
          <View style={{ flex: 1 }}>
            <Text style={styles.errorTitle}>Connection Error</Text>
            <Text style={styles.errorMessage}>
              Unable to load listings right now. Please check your internet connection.
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
          // Cards are tall (photo + details): render only what fills the first screens
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={7}
          removeClippedSubviews={Platform.OS === "android"}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            showSectionTiles ? (
              <View style={styles.tilesSection}>
                <Text style={[styles.tilesTitle, isDark && styles.tilesTitleDark]}>What are you looking for?</Text>
                <View style={styles.tilesRow}>
                  {SECTION_TILES.map((t) => {
                    const Icon = t.icon;
                    return (
                      <TouchableOpacity
                        key={t.value}
                        style={[styles.tile, isDark && styles.tileDark]}
                        activeOpacity={0.8}
                        onPress={() => setSelectedType(t.value)}
                      >
                        <View style={styles.tileIconCircle}>
                          <Icon size={22} color={colors.primaryContainer} />
                        </View>
                        <Text style={[styles.tileTitle, isDark && styles.tileTitleDark]} numberOfLines={2}>
                          {t.label}
                        </Text>
                        <Text style={styles.tileDescription} numberOfLines={3}>
                          {t.description}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={[styles.latestTitle, isDark && styles.tilesTitleDark]}>Latest listings</Text>
              </View>
            ) : undefined
          }
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator style={{ marginVertical: 20 }} color={colors.primaryContainer} />
            ) : undefined
          }
          refreshControl={
            <RefreshControl
              refreshing={pullToRefresh.refreshing}
              onRefresh={pullToRefresh.onRefresh}
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
                  {selectedType !== "ALL" && activeFilterCount === 0 && !searchQuery.trim()
                    ? `No ${currentSection.title.toLowerCase()} listed yet`
                    : "No laboratory equipment found"}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {selectedType !== "ALL" && activeFilterCount === 0 && !searchQuery.trim()
                    ? "Check back soon, or browse everything on the marketplace."
                    : "No listings matched your criteria. Try adjusting your search query or reset your filters."}
                </Text>
                <View style={styles.emptyActionRow}>
                  {selectedType !== "ALL" && activeFilterCount === 0 && !searchQuery.trim() ? (
                    <TouchableOpacity style={styles.resetFiltersBtn} onPress={() => setSelectedType("ALL")}>
                      <Text style={styles.resetFiltersBtnText}>Browse All Listings</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.resetFiltersBtn} onPress={resetAllFilters}>
                      <Text style={styles.resetFiltersBtnText}>Reset All Filters</Text>
                    </TouchableOpacity>
                  )}
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
        <View style={[styles.modalOverlay, { paddingTop: insets.top }]}>
          <View style={[styles.modalSheet, isDark && styles.modalSheetDark, { paddingBottom: Math.max(insets.bottom + 8, 20) }]}>
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

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
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

              {/* Availability Status Filter */}
              <Text style={[styles.modalSectionTitle, { marginTop: 20 }]}>Availability Status</Text>
              <View style={styles.modalOptionsGrid}>
                {STATUS_OPTIONS.map((opt) => {
                  const isStatusSelected = selectedStatus === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.modalOptionPill,
                        isStatusSelected && styles.modalOptionPillSelected,
                      ]}
                      onPress={() => setSelectedStatus(opt.value)}
                    >
                      {opt.value === "AVAILABLE" && (
                        <View
                          style={[
                            styles.statusChipDot,
                            { backgroundColor: isStatusSelected ? "#ffffff" : "#16a34a", marginRight: 5 },
                          ]}
                        />
                      )}
                      {opt.value === "SOLD" && (
                        <View
                          style={[
                            styles.statusChipDot,
                            { backgroundColor: isStatusSelected ? "#ffffff" : "#f43f5e", marginRight: 5 },
                          ]}
                        />
                      )}
                      <Text
                        style={[
                          styles.modalOptionPillText,
                          isStatusSelected && styles.modalOptionPillTextSelected,
                        ]}
                      >
                        {opt.label}
                      </Text>
                      {isStatusSelected && <Check size={14} color="#ffffff" />}
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
                  setSelectedStatus("ALL");
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
        </View>
      </Modal>

      {/* Global Quick Profile Menu Sheet */}
      <ProfileQuickMenuModal
        visible={profileMenuVisible}
        onClose={() => setProfileMenuVisible(false)}
        onOpenEscrow={() => {
          setProfileMenuVisible(false);
          setEscrowModalVisible(true);
        }}
      />

      {/* Global Escrow & Verification Protocol Modal */}
      <EscrowPolicyModal
        visible={escrowModalVisible}
        onClose={() => setEscrowModalVisible(false)}
      />
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
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  redDot: {
    position: "absolute",
    top: 7,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#f43f5e",
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#002555",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 0.5,
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
  filterCountBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: "#fbc634",
    alignItems: "center",
    justifyContent: "center",
  },
  filterCountText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0f172a",
  },
  sectionTabs: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  sectionTabsDark: {
    backgroundColor: "#0b1329",
    borderBottomColor: "#1e293b",
  },
  sectionTab: {
    flex: 1,
    alignItems: "center",
    paddingTop: 10,
    gap: 4,
  },
  sectionTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  sectionTabTextDark: {
    color: "#94a3b8",
  },
  sectionTabTextActive: {
    color: "#033a7d",
    fontWeight: "800",
  },
  sectionTabIndicator: {
    alignSelf: "stretch",
    height: 3,
    marginTop: 6,
    marginHorizontal: 14,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    backgroundColor: "transparent",
  },
  sectionTabIndicatorActive: {
    backgroundColor: "#033a7d",
  },
  tilesSection: {
    gap: 10,
  },
  tilesTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  tilesTitleDark: {
    color: "#f8fafc",
  },
  tilesRow: {
    flexDirection: "row",
    gap: 10,
  },
  tile: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#dbeaf7",
    padding: 12,
    gap: 6,
  },
  tileDark: {
    backgroundColor: "#0b1329",
    borderColor: "#1e293b",
  },
  tileIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#eff5fb",
    alignItems: "center",
    justifyContent: "center",
  },
  tileTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  tileTitleDark: {
    color: "#f8fafc",
  },
  tileDescription: {
    fontSize: 11,
    lineHeight: 15,
    color: "#64748b",
  },
  latestTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 8,
  },
  statusChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
  imageContainerNoPhoto: {
    aspectRatio: undefined,
    height: 96,
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
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  requestSimilarBtnText: {
    color: "#b45309",
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
    flexShrink: 1,
  },
  modalScrollContent: {
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
