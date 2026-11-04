import { useColorScheme } from "@/hooks/use-color-scheme";
import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Modal,
  Platform,
  StatusBar,
  Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import Search from "lucide-react-native/icons/search";
import X from "lucide-react-native/icons/x";
import Bell from "lucide-react-native/icons/bell";
import Check from "lucide-react-native/icons/check";
import FileQuestion from "lucide-react-native/icons/file-question-mark";
import PlusCircle from "lucide-react-native/icons/circle-plus";
import { api } from "@/lib/api";
import { LoadErrorState } from "@/components/LoadErrorState";
import { Requirement } from "@/types/api";
import { useAuth } from "@/context/auth-context";
import { LabMatrixTokens } from "@/constants/theme";
import { EscrowPolicyModal } from "@/components/EscrowPolicyModal";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";

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
  "Spare Parts & Consumables",
  "Other Lab Equipment",
];

const PAGE_SIZE = 30;

function formatRelativeTime(dateString: string): string {
  try {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 60) return "Just now";
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 30) return `${diffDays} days ago`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths === 1) return "1 month ago";
    return `${diffMonths} months ago`;
  } catch {
    return "Recently";
  }
}

function getTargetBudget(item: Requirement): string | null {
  const anyItem = item as any;
  if (typeof anyItem.targetBudget === "string" && anyItem.targetBudget.trim().length > 0) {
    return anyItem.targetBudget.trim();
  }
  if (typeof anyItem.budget === "string" && anyItem.budget.trim().length > 0) {
    return anyItem.budget.trim();
  }
  const desc = item.description || "";
  const match = desc.match(/(?:budget|target budget|expected price|price range)[\s:–-]+(?:₹|inr|rs\.?)\s*([0-9.,]+(?:\s*(?:lakh|lakhs|l|cr|k|crore))?(?:\s*(?:–|-|to)\s*[0-9.,]+(?:\s*(?:lakh|lakhs|l|cr|k|crore))?)?)/i);
  if (match && match[1]) {
    return `₹${match[1].trim()}`;
  }
  return null;
}

export default function RequestsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { colors } = LabMatrixTokens;
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const searchInputRef = useRef<any>(null);

  // Escrow Policy Modal
  const [escrowModalVisible, setEscrowModalVisible] = useState(false);

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

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebouncedValue(searchQuery.trim());
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<"ALL" | "MACHINE" | "SPARE_PART">("ALL");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [categorySheetVisible, setCategorySheetVisible] = useState(false);

  // Post Wanted Modal State
  const [postModalVisible, setPostModalVisible] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postCategory, setPostCategory] = useState(CATEGORIES[1]);
  const [postItemType, setPostItemType] = useState<"MACHINE" | "SPARE_PART">("MACHINE");
  const [postPartNumber, setPostPartNumber] = useState("");
  const [postCompatibleWith, setPostCompatibleWith] = useState("");
  const [postDescription, setPostDescription] = useState("");
  const [postPhone, setPostPhone] = useState(user?.phoneNumber || "");
  const [postCompany, setPostCompany] = useState(user?.companyName || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { edit, openPost } = useLocalSearchParams<{ edit?: string; openPost?: string }>();

  // If redirected with ?openPost=true from Profile
  useEffect(() => {
    if (openPost === "true") {
      if (!isAuthenticated) {
        router.push("/(auth)/login" as any);
        return;
      }
      setPostModalVisible(true);
      router.setParams({ openPost: undefined } as any);
    }
  }, [openPost, isAuthenticated, router]);

  // Fetch Requirements from Backend
  const {
    data: pagedData,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["requirements", selectedCategory, debouncedSearch, selectedTypeFilter],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const params: any = { page: pageParam, limit: PAGE_SIZE };
      if (selectedCategory !== "ALL") params.category = selectedCategory;
      if (debouncedSearch) params.query = debouncedSearch;
      if (selectedTypeFilter === "SPARE_PART") params.itemType = "SPARE_PART";
      if (selectedTypeFilter === "MACHINE") params.itemType = "MACHINE";

      const res = await api.get("/api/requirements", { params });
      return {
        requirements: (res.data?.requirements || []) as Requirement[],
        page: (res.data?.pagination?.page as number) ?? pageParam,
        totalPages: (res.data?.pagination?.totalPages as number) ?? 1,
        total: res.data?.pagination?.total as number | undefined,
      };
    },
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  });

  const pullToRefresh = usePullToRefresh(refetch);

  const data = useMemo(() => {
    if (!pagedData) return undefined;
    const seen = new Set<string>();
    return pagedData.pages
      .flatMap((p) => p.requirements)
      .filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)));
  }, [pagedData]);
  const totalCount = pagedData?.pages[0]?.total ?? data?.length ?? 0;

  const filteredRequirements = useMemo(() => {
    if (!data) return [];
    let list = data;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          (r.partNumber && r.partNumber.toLowerCase().includes(q)) ||
          (r.compatibleWith && r.compatibleWith.toLowerCase().includes(q))
      );
    }

    if (selectedTypeFilter === "SPARE_PART") {
      list = list.filter((r) => r.itemType === "SPARE_PART");
    } else if (selectedTypeFilter === "MACHINE") {
      list = list.filter((r) => r.itemType !== "SPARE_PART");
    }

    if (selectedCategory !== "ALL") {
      list = list.filter((r) => r.category === selectedCategory);
    }

    return list;
  }, [data, searchQuery, selectedTypeFilter, selectedCategory]);

  useEffect(() => {
    if (!edit || !isAuthenticated) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await api.get(`/api/requirements/${encodeURIComponent(edit)}`);
        const req = res.data?.requirement;
        if (cancelled || !req) return;
        if (!res.data?.isOwner && !res.data?.isAdmin) {
          Alert.alert("Not Allowed", "You can only edit your own requests.");
          return;
        }
        setPostTitle(req.title || "");
        setPostCategory(req.category || CATEGORIES[1]);
        setPostItemType(req.itemType === "SPARE_PART" ? "SPARE_PART" : "MACHINE");
        setPostPartNumber(req.partNumber || "");
        setPostCompatibleWith(req.compatibleWith || "");
        setPostDescription(req.description || "");
        setEditingId(req.id);
        setPostModalVisible(true);
      } catch (err: any) {
        if (!cancelled) {
          Alert.alert("Unable to Load", err.response?.data?.error || "Could not load this request for editing.");
        }
      } finally {
        router.setParams({ edit: undefined } as any);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [edit, isAuthenticated, router]);

  const closePostModal = () => {
    setPostModalVisible(false);
    if (editingId) {
      setEditingId(null);
      setPostTitle("");
      setPostDescription("");
      setPostPartNumber("");
      setPostCompatibleWith("");
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const title = postTitle.trim();
    const description = postDescription.trim();
    if (title.length < 3) {
      Alert.alert("Validation Error", "Title must be at least 3 characters.");
      return;
    }
    if (description.length < 10) {
      Alert.alert("Validation Error", "Specifications description must be at least 10 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.patch(`/api/requirements/${encodeURIComponent(editingId)}`, {
        title,
        description,
        category: postCategory,
        itemType: postItemType,
        partNumber: postItemType === "SPARE_PART" ? postPartNumber.trim() || null : null,
        compatibleWith: postItemType === "SPARE_PART" ? postCompatibleWith.trim() || null : null,
      });

      const savedId = editingId;
      closePostModal();
      queryClient.invalidateQueries({ queryKey: ["requirements"] });
      queryClient.invalidateQueries({ queryKey: ["myItems"] });
      queryClient.invalidateQueries({ queryKey: ["requirement", savedId] });

      Alert.alert(
        "Request Updated",
        res.data?.requiresReapproval
          ? "Your changes were saved and are pending admin re-approval before appearing live."
          : "Your changes were saved."
      );
    } catch (err: any) {
      Alert.alert("Update Failed", err.response?.data?.error || "Could not save your changes.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostWanted = async () => {
    if (!postTitle.trim() || !postDescription.trim()) {
      Alert.alert("Validation Error", "Please provide a title and detailed specifications.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/api/requirements", {
        title: postTitle.trim(),
        category: postCategory,
        itemType: postItemType,
        partNumber: postItemType === "SPARE_PART" ? postPartNumber.trim() || null : null,
        compatibleWith: postItemType === "SPARE_PART" ? postCompatibleWith.trim() || null : null,
        description: postDescription.trim(),
        phoneNumber: postPhone.trim() || null,
        companyName: postCompany.trim() || null,
      });

      closePostModal();
      setPostTitle("");
      setPostDescription("");
      setPostPartNumber("");
      setPostCompatibleWith("");
      queryClient.invalidateQueries({ queryKey: ["requirements"] });
      queryClient.invalidateQueries({ queryKey: ["myItems"] });

      Alert.alert(
        "Requirement Broadcasted",
        "Your requirement has been submitted. Our engineering desk will match verified suppliers."
      );
    } catch (err: any) {
      Alert.alert(
        "Submission Failed",
        err.response?.data?.error || "Could not submit your request. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderRequirementCard = ({ item }: { item: Requirement }) => {
    const isFulfilled = item.status === "FULFILLED";
    const isSpare = item.itemType === "SPARE_PART";
    const targetBudget = getTargetBudget(item);
    const timeAgo = formatRelativeTime(item.createdAt);

    return (
      <TouchableOpacity
        style={[
          styles.compactCard,
          isDark && styles.compactCardDark,
          isFulfilled && (isDark ? styles.fulfilledCardDark : styles.fulfilledCard),
        ]}
        activeOpacity={0.85}
        onPress={() => router.push(`/requests/${item.id}`)}
      >
        {/* Row 1: Category on left, timestamp / FULFILLED on right */}
        <View style={styles.cardHeaderRow}>
          <Text
            style={[
              styles.cardCategoryText,
              isSpare && styles.cardSpareCategoryText,
              isFulfilled && styles.cardFulfilledText,
            ]}
            numberOfLines={1}
          >
            {isSpare ? "Spare part" : item.category}
          </Text>
          <Text
            style={[
              styles.cardTimeText,
              isFulfilled && styles.cardFulfilledBadgeText,
            ]}
          >
            {isFulfilled ? "FULFILLED" : timeAgo}
          </Text>
        </View>

        {/* Row 2: Title */}
        <Text
          style={[
            styles.cardTitleText,
            isDark && styles.cardTitleTextDark,
            isFulfilled && styles.cardFulfilledText,
          ]}
          numberOfLines={2}
        >
          {item.title}
        </Text>

        {/* Spare part part number / compatible model in clean monospace */}
        {isSpare && (item.partNumber || item.compatibleWith) ? (
          <Text style={styles.cardPartNumText} numberOfLines={1}>
            {[item.partNumber, item.compatibleWith ? `For ${item.compatibleWith}` : null]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        ) : null}

        {/* Row 3: Description (2 lines clamp) */}
        {!isFulfilled && item.description ? (
          <Text
            style={[styles.cardDescText, isDark && styles.cardDescTextDark]}
            numberOfLines={2}
          >
            {item.description}
          </Text>
        ) : null}

        {/* Row 4: Budget on left (only if provided!), Propose › on right */}
        {!isFulfilled ? (
          <View style={styles.cardFooterRow}>
            {targetBudget ? (
              <Text style={[styles.cardBudgetText, isDark && styles.cardBudgetTextDark]}>
                Budget {targetBudget}
              </Text>
            ) : (
              <View style={{ flex: 1 }} />
            )}

            <TouchableOpacity
              style={styles.proposeBtn}
              activeOpacity={0.7}
              onPress={() => router.push(`/requests/${item.id}`)}
            >
              <Text style={styles.proposeBtnText}>Propose ›</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView edges={["top"]} style={[styles.safeArea, isDark && styles.safeAreaDark]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Direction A Header: Single-line Title + + Post button */}
      <View style={[styles.topBar, isDark && styles.topBarDark]}>
        <Text style={[styles.screenHeaderTitle, isDark && styles.screenHeaderTitleDark]}>
          Buyer requests
        </Text>

        <View style={styles.topRightRow}>
          <TouchableOpacity
            style={styles.headerPostBtn}
            activeOpacity={0.85}
            onPress={() => {
              if (!isAuthenticated) {
                Alert.alert(
                  "Sign In Required",
                  "Please sign in to post your laboratory equipment requirement.",
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "Sign In", onPress: () => router.push("/(auth)/login" as any) },
                  ]
                );
                return;
              }
              setPostModalVisible(true);
            }}
          >
            <Text style={styles.headerPostBtnText}>+ Post</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            activeOpacity={0.7}
            onPress={() => router.push("/notifications" as any)}
            accessibilityLabel="Notifications"
          >
            <Bell size={20} color={isDark ? "#f8fafc" : "#0f172a"} />
            {unreadCount > 0 && <View style={styles.redDot} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Controls Bar: Search & Category Chips */}
      <View style={[styles.controlsBar, isDark && styles.controlsBarDark]}>
        {/* Search input: ⌕ What are labs looking for? */}
        <View style={[styles.searchBox, isDark && styles.searchBoxDark]}>
          <Search size={16} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, isDark && styles.searchInputDark]}
            placeholder="What are labs looking for?"
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearSearchBtn}>
              <X size={15} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Chips: All · Count, Machines, Spare parts, Category Picker */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsRow}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedTypeFilter === "ALL" && styles.filterChipActive,
            ]}
            onPress={() => setSelectedTypeFilter("ALL")}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedTypeFilter === "ALL" && styles.filterChipTextActive,
              ]}
            >
              All · {totalCount}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedTypeFilter === "MACHINE" && styles.filterChipActive,
            ]}
            onPress={() => setSelectedTypeFilter(selectedTypeFilter === "MACHINE" ? "ALL" : "MACHINE")}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedTypeFilter === "MACHINE" && styles.filterChipTextActive,
              ]}
            >
              Machines
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedTypeFilter === "SPARE_PART" && styles.filterChipActive,
            ]}
            onPress={() => setSelectedTypeFilter(selectedTypeFilter === "SPARE_PART" ? "ALL" : "SPARE_PART")}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedTypeFilter === "SPARE_PART" && styles.filterChipTextActive,
              ]}
            >
              Spare parts
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedCategory !== "ALL" && styles.filterChipActive,
            ]}
            onPress={() => setCategorySheetVisible(true)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedCategory !== "ALL" && styles.filterChipTextActive,
              ]}
            >
              {selectedCategory === "ALL" ? "Category ▾" : `${selectedCategory} ✕`}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <FlatList
        data={filteredRequirements}
        keyExtractor={(item) => item.id}
        renderItem={renderRequirementCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
          isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#002555" />
              <Text style={styles.loadingText}>Loading requests...</Text>
            </View>
          ) : isError ? (
            <LoadErrorState message="Couldn't load buyer requests. Please try again." onRetry={() => refetch()} />
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <FileQuestion size={34} color="#94a3b8" />
              </View>
              <Text style={[styles.emptyTitle, isDark && styles.emptyTitleDark]}>
                No buyer requests found
              </Text>
              <Text style={styles.emptySubtitle}>
                No active buyer requests match your filters. Be the first to broadcast an equipment need!
              </Text>
              <TouchableOpacity
                style={styles.emptyPostBtn}
                onPress={() => {
                  if (!isAuthenticated) {
                    Alert.alert("Sign In Required", "Please sign in to post a requirement.", [
                      { text: "Cancel", style: "cancel" },
                      { text: "Sign In", onPress: () => router.push("/(auth)/login" as any) },
                    ]);
                    return;
                  }
                  setPostModalVisible(true);
                }}
              >
                <PlusCircle size={15} color="#002555" />
                <Text style={styles.emptyPostBtnText}>Post First Requirement</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />

      {/* Category Filter Sheet */}
      <Modal
        visible={categorySheetVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCategorySheetVisible(false)}
      >
        <View style={[styles.modalOverlay, { paddingTop: insets.top }]}>
          <View style={[styles.modalSheet, isDark && styles.modalSheetDark, { paddingBottom: Math.max(insets.bottom + 8, 20) }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDark && styles.modalTitleDark]}>Filter by Category</Text>
              <TouchableOpacity onPress={() => setCategorySheetVisible(false)} style={styles.closeModalBtn}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.categorySheetList} contentContainerStyle={styles.categorySheetListContent}>
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categorySheetRow, isSelected && styles.categorySheetRowActive]}
                    activeOpacity={0.75}
                    onPress={() => {
                      setSelectedCategory(cat);
                      setCategorySheetVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.categorySheetText,
                        isDark && styles.modalTitleDark,
                        isSelected && styles.categorySheetTextActive,
                      ]}
                    >
                      {cat === "ALL" ? "All Categories" : cat}
                    </Text>
                    {isSelected ? <Check size={18} color="#033a7d" /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Post Wanted Equipment Modal Form */}
      <Modal
        visible={postModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closePostModal}
      >
        <View style={[styles.modalOverlay, { paddingTop: insets.top }]}>
          <View style={[styles.modalSheet, isDark && styles.modalSheetDark, { paddingBottom: Math.max(insets.bottom + 8, 20) }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalSubHeader}>
                  {editingId ? "Update requirement" : "Post requirement"}
                </Text>
                <Text style={[styles.modalTitle, isDark && styles.modalTitleDark]}>
                  {editingId ? "Edit Equipment Wanted" : "Post Equipment Wanted"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={closePostModal}
                style={styles.closeModalBtn}
              >
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalForm}
              contentContainerStyle={styles.modalFormContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Classification Selector */}
              <Text style={styles.inputLabel}>Requirement Type *</Text>
              <View style={styles.typeSelectorRow}>
                <TouchableOpacity
                  style={[
                    styles.typeSelectorBtn,
                    postItemType === "MACHINE" && styles.typeSelectorBtnActive,
                  ]}
                  onPress={() => setPostItemType("MACHINE")}
                >
                  <Text
                    style={[
                      styles.typeSelectorBtnText,
                      postItemType === "MACHINE" && styles.typeSelectorBtnTextActive,
                    ]}
                  >
                    Analytical Machine / System
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeSelectorBtn,
                    postItemType === "SPARE_PART" && styles.typeSelectorBtnActive,
                  ]}
                  onPress={() => setPostItemType("SPARE_PART")}
                >
                  <Text
                    style={[
                      styles.typeSelectorBtnText,
                      postItemType === "SPARE_PART" && styles.typeSelectorBtnTextActive,
                    ]}
                  >
                    Spare Part / Board
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Instrument Title */}
              <Text style={styles.inputLabel}>Desired Equipment / Model *</Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                placeholder="e.g. Waters 2695 HPLC or PerkinElmer Avio 500"
                placeholderTextColor="#94a3b8"
                value={postTitle}
                onChangeText={setPostTitle}
              />

              {/* Category Picker */}
              <Text style={styles.inputLabel}>Category *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {CATEGORIES.filter((c) => c !== "ALL").map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.catOptionPill,
                        postCategory === cat && styles.catOptionPillActive,
                      ]}
                      onPress={() => setPostCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.catOptionPillText,
                          postCategory === cat && styles.catOptionPillTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Spare Part Specific Fields */}
              {postItemType === "SPARE_PART" && (
                <>
                  <Text style={styles.inputLabel}>Part Number / Catalog #</Text>
                  <TextInput
                    style={[styles.input, isDark && styles.inputDark]}
                    placeholder="e.g. PE-CL-50402"
                    placeholderTextColor="#94a3b8"
                    value={postPartNumber}
                    onChangeText={setPostPartNumber}
                  />

                  <Text style={styles.inputLabel}>Target Machine Compatibility</Text>
                  <TextInput
                    style={[styles.input, isDark && styles.inputDark]}
                    placeholder="e.g. Clarus GC 500 / 580 series"
                    placeholderTextColor="#94a3b8"
                    value={postCompatibleWith}
                    onChangeText={setPostCompatibleWith}
                  />
                </>
              )}

              {/* Specifications Description */}
              <Text style={styles.inputLabel}>
                Required Specifications, Detectors, & Testing Scope *
              </Text>
              <TextInput
                style={[styles.textArea, isDark && styles.textAreaDark]}
                placeholder="Describe required configuration, acceptable working condition, target budget range, and delivery destination..."
                placeholderTextColor="#94a3b8"
                value={postDescription}
                onChangeText={setPostDescription}
                multiline
                numberOfLines={4}
              />

              {/* Contact Info */}
              {!editingId && (
                <>
                  <Text style={styles.inputLabel}>Mobile / WhatsApp (Admin Verification) *</Text>
                  <TextInput
                    style={[styles.input, isDark && styles.inputDark]}
                    placeholder="+91-XXXXXXXXXX"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                    value={postPhone}
                    onChangeText={setPostPhone}
                  />

                  <Text style={styles.inputLabel}>Company / Institution Name</Text>
                  <TextInput
                    style={[styles.input, isDark && styles.inputDark]}
                    placeholder="Laboratory or Research Organization"
                    placeholderTextColor="#94a3b8"
                    value={postCompany}
                    onChangeText={setPostCompany}
                  />
                </>
              )}

              {/* Submit CTA */}
              <TouchableOpacity
                style={[styles.modalSubmitBtn, isSubmitting && styles.modalSubmitBtnDisabled]}
                activeOpacity={0.85}
                onPress={editingId ? handleSaveEdit : handlePostWanted}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#002555" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>
                    {editingId ? "Save Changes" : "Broadcast Sourcing Request"}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Escrow Modal */}
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
    backgroundColor: "#0b1220",
  },
  topBar: {
    height: 52,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  topBarDark: {
    backgroundColor: "#0b1220",
  },
  screenHeaderTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.3,
  },
  screenHeaderTitleDark: {
    color: "#f8fafc",
  },
  topRightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerPostBtn: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#fbc634",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerPostBtnText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#002555",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  redDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#dc2626",
  },
  controlsBar: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 10,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
    gap: 8,
  },
  controlsBarDark: {
    backgroundColor: "#0b1220",
    borderColor: "#1e293b",
  },
  searchBox: {
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  searchBoxDark: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0f172a",
    paddingVertical: 0,
  },
  searchInputDark: {
    color: "#f8fafc",
  },
  clearSearchBtn: {
    padding: 4,
  },
  filterChipsRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  filterChipActive: {
    backgroundColor: "#002555",
    borderColor: "#002555",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  filterChipTextActive: {
    color: "#ffffff",
  },
  listContent: {
    paddingTop: 10,
    paddingBottom: 28,
  },
  compactCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 12,
    marginBottom: 8,
    gap: 6,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  compactCardDark: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
  },
  fulfilledCard: {
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
    opacity: 0.75,
  },
  fulfilledCardDark: {
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    opacity: 0.7,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardCategoryText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#033a7d",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  cardSpareCategoryText: {
    color: "#b45309",
  },
  cardFulfilledText: {
    color: "#64748b",
  },
  cardTimeText: {
    fontSize: 11.5,
    color: "#64748b",
  },
  cardFulfilledBadgeText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.5,
  },
  cardTitleText: {
    fontSize: 14.5,
    fontWeight: "800",
    lineHeight: 19,
    color: "#0f172a",
  },
  cardTitleTextDark: {
    color: "#f8fafc",
  },
  cardPartNumText: {
    fontSize: 11.5,
    fontWeight: "600",
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    color: "#64748b",
  },
  cardDescText: {
    fontSize: 12.5,
    color: "#475569",
    lineHeight: 17,
  },
  cardDescTextDark: {
    color: "#94a3b8",
  },
  cardFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
  },
  cardBudgetText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#002555",
  },
  cardBudgetTextDark: {
    color: "#fbc634",
  },
  proposeBtn: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  proposeBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#033a7d",
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: "#64748b",
  },
  emptyContainer: {
    paddingVertical: 60,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 6,
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
    marginBottom: 18,
  },
  emptyPostBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fbc634",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  emptyPostBtnText: {
    fontSize: 13,
    fontWeight: "800",
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
    maxHeight: "90%",
  },
  modalSheetDark: {
    backgroundColor: "#0f172a",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
  },
  modalSubHeader: {
    fontSize: 11,
    fontWeight: "700",
    color: "#033a7d",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
  },
  modalTitleDark: {
    color: "#f8fafc",
  },
  closeModalBtn: {
    padding: 6,
  },
  categorySheetList: {
    maxHeight: 400,
  },
  categorySheetListContent: {
    paddingVertical: 8,
  },
  categorySheetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderColor: "#f1f5f9",
  },
  categorySheetRowActive: {
    backgroundColor: "#eff6ff",
  },
  categorySheetText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },
  categorySheetTextActive: {
    color: "#033a7d",
    fontWeight: "800",
  },
  modalForm: {
    paddingHorizontal: 18,
  },
  modalFormContent: {
    paddingVertical: 16,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  typeSelectorRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  typeSelectorBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    alignItems: "center",
  },
  typeSelectorBtnActive: {
    backgroundColor: "#002555",
    borderColor: "#002555",
  },
  typeSelectorBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  typeSelectorBtnTextActive: {
    color: "#ffffff",
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#0f172a",
    backgroundColor: "#ffffff",
    marginBottom: 14,
  },
  inputDark: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    color: "#f8fafc",
  },
  textArea: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
    backgroundColor: "#ffffff",
    marginBottom: 14,
    textAlignVertical: "top",
  },
  textAreaDark: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    color: "#f8fafc",
  },
  catOptionPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
  },
  catOptionPillActive: {
    backgroundColor: "#002555",
    borderColor: "#002555",
  },
  catOptionPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  catOptionPillTextActive: {
    color: "#ffffff",
  },
  modalSubmitBtn: {
    backgroundColor: "#fbc634",
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  modalSubmitBtnDisabled: {
    opacity: 0.6,
  },
  modalSubmitBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#002555",
  },
});
