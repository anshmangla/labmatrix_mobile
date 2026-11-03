import React, { useState, useMemo, useRef, useEffect } from "react";
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
  Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  MapPin,
  Clock,
  ShieldCheck,
  Shield,
  FileQuestion,
  PlusCircle,
  FileText,
  X,
  Bell,
  User,
  ArrowRight,
  Layers,
  Wrench,
  CheckCircle2,
  Building,
  Check,
  SlidersHorizontal,
} from "lucide-react-native";
import { api } from "@/lib/api";
import { LoadErrorState } from "@/components/LoadErrorState";
import { Requirement } from "@/types/api";
import { useAuth } from "@/context/auth-context";
import { LabMatrixTokens } from "@/constants/theme";
import { ProfileQuickMenuModal } from "@/components/ProfileQuickMenuModal";
import { EscrowPolicyModal } from "@/components/EscrowPolicyModal";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

// Same categories and order as the website's buyer requests page
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

export default function RequestsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { colors } = LabMatrixTokens;
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const searchInputRef = useRef<any>(null);

  // Quick Profile Menu & Escrow Modals
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

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  // Loaded rows are filtered locally as you type; the server is queried once typing pauses
  const debouncedSearch = useDebouncedValue(searchQuery.trim());
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<"ALL" | "URGENT" | "SPARE_PART">("ALL");
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
  // Set when the form is editing an existing request (opened via ?edit=<id>)
  const [editingId, setEditingId] = useState<string | null>(null);
  const { edit } = useLocalSearchParams<{ edit?: string }>();

  // Fetch Requirements from Backend
  const {
    data: pagedData,
    isLoading,
    isError,
    isRefetching,
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

  // Flatten loaded pages; skip duplicates if new items shifted page boundaries
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

    // Client-side search refinement for instantaneous matching
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

    if (selectedTypeFilter === "URGENT") {
      // Urgent sourcing: requests whose buyer marked them urgent
      return list.filter(
        (r) =>
          r.description.toLowerCase().includes("urgent") ||
          r.title.toLowerCase().includes("urgent")
      );
    }
    return list;
  }, [data, searchQuery, selectedTypeFilter]);

  const urgentCount = useMemo(() => {
    if (!data) return 0;
    return data.filter(
      (r) =>
        r.description.toLowerCase().includes("urgent") ||
        r.title.toLowerCase().includes("urgent")
    ).length;
  }, [data]);

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
        // Clear the param so the form doesn't reopen when returning to this tab
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

  // Save changes to an existing request (same fields as the website's edit page)
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

  // Handle Post Wanted Submission
  const handlePostWanted = async () => {
    if (!postTitle.trim() || !postDescription.trim()) {
      Alert.alert("Validation Error", "Please provide a title and detailed specifications.");
      return;
    }
    if (postDescription.trim().length < 10) {
      Alert.alert("Validation Error", "Specifications description must be at least 10 characters.");
      return;
    }
    if (!postPhone.trim()) {
      Alert.alert("Contact Required", "Please enter a valid mobile number for administrator verification.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/api/requirements", {
        title: postTitle.trim(),
        description: postDescription.trim(),
        category: postCategory,
        itemType: postItemType,
        partNumber: postItemType === "SPARE_PART" ? postPartNumber.trim() : undefined,
        compatibleWith: postItemType === "SPARE_PART" ? postCompatibleWith.trim() : undefined,
        phoneNumber: postPhone.trim(),
        companyName: postCompany.trim() || undefined,
      });

      setPostModalVisible(false);
      setPostTitle("");
      setPostDescription("");
      setPostPartNumber("");
      setPostCompatibleWith("");
      queryClient.invalidateQueries({ queryKey: ["requirements"] });

      Alert.alert(
        "Requirement Submitted",
        "Your procurement request has been submitted for administrator review. Once verified, it will be broadcasted to certified laboratories."
      );
    } catch (err: any) {
      Alert.alert("Submission Failed", err.response?.data?.error || "Could not submit requirement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Budget the buyer wrote in the description (e.g. "₹4,00,000 - ₹6,00,000"); never guessed
  const getTargetBudget = (item: Requirement) => {
    const desc = item.description;
    const match = desc.match(/₹[\d,]+(\s*-\s*₹[\d,]+)?/i) || desc.match(/budget:?\s*₹?[\d,]+/i);
    return match ? match[0] : "On quotation";
  };

  const getPreferredOEM = (item: Requirement) => {
    const desc = item.description.toLowerCase();
    const title = item.title.toLowerCase();
    const combined = `${title} ${desc}`;

    const brands: string[] = [];
    if (combined.includes("perkinelmer") || combined.includes("perkin elmer")) brands.push("PerkinElmer");
    if (combined.includes("agilent")) brands.push("Agilent");
    if (combined.includes("waters")) brands.push("Waters");
    if (combined.includes("shimadzu")) brands.push("Shimadzu");
    if (combined.includes("thermo")) brands.push("Thermo Fisher");
    if (combined.includes("metrohm")) brands.push("Metrohm");

    return brands.length > 0 ? brands.join(", ") : null;
  };

  const renderRequirementCard = ({ item }: { item: Requirement }) => {
    const isFulfilled = item.status === "FULFILLED";
    const shortCode = item.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 5).toUpperCase();
    const targetBudget = getTargetBudget(item);
    const preferredOEM = getPreferredOEM(item);

    return (
      <TouchableOpacity
        style={[styles.card, isDark && styles.cardDark]}
        activeOpacity={0.92}
        onPress={() => router.push(`/requests/${item.id}`)}
      >
        {/* Row 1: Badges */}
        <View style={styles.cardBadgeRow}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{item.category}</Text>
          </View>

        </View>

        {/* Row 2: Status Pill */}
        <View style={styles.statusPillRow}>
          {isFulfilled ? (
            <View style={styles.fulfilledPill}>
              <View style={styles.fulfilledDot} />
              <Text style={styles.fulfilledPillText}>FULFILLED</Text>
            </View>
          ) : (
            <View style={styles.openPill}>
              <View style={styles.openDot} />
              <Text style={styles.openPillText}>OPEN FOR PROPOSALS</Text>
            </View>
          )}
        </View>

        {/* Row 3: Timestamp & REQ Code */}
        <View style={styles.metaRow}>
          <Clock size={12} color="#64748b" />
          <Text style={styles.metaDate}>
            Posted on {new Date(item.createdAt).toLocaleDateString("en-GB")}
          </Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.reqCodeText}>REQ-2026-{shortCode}</Text>
        </View>

        {/* Row 4: Title */}
        <Text style={[styles.cardTitle, isDark && styles.cardTitleDark]} numberOfLines={2}>
          {item.title}
        </Text>

        {/* Row 5: Description */}
        <Text
          style={[styles.cardDescription, isDark && styles.cardDescriptionDark]}
          numberOfLines={3}
        >
          {item.description}
        </Text>

        {/* Row 6: Structured Specs Grid (Gray Box) */}
        <View style={[styles.specsBox, isDark && styles.specsBoxDark]}>
          <View style={styles.specsGrid}>
            {preferredOEM ? (
              <View style={styles.specsCol}>
                <Text style={styles.specsLabel}>PREFERRED OEM</Text>
                <Text style={[styles.specsValue, isDark && styles.specsValueDark]} numberOfLines={1}>
                  {preferredOEM}
                </Text>
              </View>
            ) : null}

            <View style={styles.specsCol}>
              <Text style={styles.specsLabel}>TARGET BUDGET</Text>
              <Text style={styles.specsBudgetValue} numberOfLines={1}>
                {targetBudget}
              </Text>
            </View>
          </View>

        </View>

        {/* Row 7: Action CTA */}
        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={styles.fulfillBtn}
            activeOpacity={0.85}
            onPress={() => router.push(`/requests/${item.id}`)}
          >
            <Text style={styles.fulfillBtnText}>Submit Quotation Proposal</Text>
            <ArrowRight size={14} color="#ffffff" />
          </TouchableOpacity>
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
            refreshing={isRefetching && !isFetchingNextPage}
            onRefresh={() => {
              refetch();
            }}
            tintColor={colors.primaryContainer}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            {/* Active Procurement Header Badge */}
            <View style={styles.procurementBadge}>
              <ShieldCheck size={13} color="#033a7d" />
              <Text style={styles.procurementBadgeText}>
                ACTIVE LABORATORY PROCUREMENT REQUESTS
              </Text>
            </View>

            {/* Title & Subtitle */}
            <Text style={[styles.headerTitle, isDark && styles.headerTitleDark]}>
              Buyer Equipment Requirements
            </Text>
            <Text style={[styles.headerSubtitle, isDark && styles.headerSubtitleDark]}>
              Laboratories actively looking for analytical instruments. Have a matching unit? Submit
              your quotation proposal directly.
            </Text>

            {/* "Need equipment or spares?" Callout Card */}
            <View style={[styles.postCalloutCard, isDark && styles.postCalloutCardDark]}>
              <View style={styles.postCalloutLeft}>
                <View style={styles.memoIconCircle}>
                  <FileText size={20} color="#b45309" />
                </View>
                <View style={styles.postCalloutTextCol}>
                  <Text style={[styles.postCalloutTitle, isDark && styles.postCalloutTitleDark]}>
                    Need equipment or spares?
                  </Text>
                  <Text style={styles.postCalloutSub}>
                    Broadcast requirements to verified labs
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.postWantedBtn}
                activeOpacity={0.85}
                onPress={() => {
                  if (!isAuthenticated) {
                    Alert.alert(
                      "Sign In Required",
                      "Please sign in to broadcast your laboratory equipment requirement.",
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
                <PlusCircle size={15} color="#0f172a" />
                <Text style={styles.postWantedBtnText}>+ Post Wanted</Text>
              </TouchableOpacity>
            </View>

            {/* Search Input + Category Filter */}
            <View style={styles.searchRow}>
            <View style={[styles.searchInputWrapper, isDark && styles.searchInputWrapperDark, { flex: 1, marginBottom: 0 }]}>
              <Search size={16} color={isDark ? "#94a3b8" : colors.textMuted} />
              <TextInput
                ref={searchInputRef}
                style={[styles.searchInput, isDark && styles.searchInputDark]}
                placeholder="Search desired instruments (HPLC, GC-M..."
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
              onPress={() => setCategorySheetVisible(true)}
            >
              <SlidersHorizontal size={17} color={colors.primaryContainer} />
              {selectedCategory !== "ALL" && (
                <View style={styles.filterCountBadge}>
                  <Text style={styles.filterCountText}>1</Text>
                </View>
              )}
            </TouchableOpacity>
            </View>

            {/* Filter Chips Row 1 (scrolls sideways when the chips don't fit) */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.typeChipsScroll}
              contentContainerStyle={styles.typeChipsRow}
            >
              <TouchableOpacity
                style={[
                  styles.typeChip,
                  selectedTypeFilter === "ALL" && styles.typeChipActive,
                ]}
                onPress={() => setSelectedTypeFilter("ALL")}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    selectedTypeFilter === "ALL" && styles.typeChipTextActive,
                  ]}
                >
                  All Requests ({totalCount})
                </Text>
              </TouchableOpacity>

              {(urgentCount > 0 || selectedTypeFilter === "URGENT") && (
                <TouchableOpacity
                  style={[
                    styles.typeChip,
                    selectedTypeFilter === "URGENT" && styles.typeChipActive,
                  ]}
                  onPress={() => setSelectedTypeFilter("URGENT")}
                >
                  <View style={styles.urgentDot} />
                  <Text
                    style={[
                      styles.typeChipText,
                      selectedTypeFilter === "URGENT" && styles.typeChipTextActive,
                    ]}
                  >
                    Urgent Sourcing ({urgentCount})
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.typeChip,
                  selectedTypeFilter === "SPARE_PART" && styles.typeChipActive,
                ]}
                onPress={() => setSelectedTypeFilter("SPARE_PART")}
              >
                <Wrench size={13} color={selectedTypeFilter === "SPARE_PART" ? "#ffffff" : "#64748b"} />
                <Text
                  style={[
                    styles.typeChipText,
                    selectedTypeFilter === "SPARE_PART" && styles.typeChipTextActive,
                  ]}
                >
                  Spare Parts
                </Text>
              </TouchableOpacity>
            </ScrollView>

          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#002555" />
              <Text style={styles.loadingText}>Loading procurement requirements...</Text>
            </View>
          ) : isError ? (
            <LoadErrorState message="Couldn't load buyer requests. Please try again." onRetry={() => refetch()} />
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <FileQuestion size={34} color="#94a3b8" />
              </View>
              <Text style={[styles.emptyTitle, isDark && styles.emptyTitleDark]}>
                No equipment requirements found
              </Text>
              <Text style={styles.emptySubtitle}>
                No active buyer requests matched your filters. Be the first to broadcast an equipment need!
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
                <PlusCircle size={15} color="#0f172a" />
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
                  {editingId ? "Update Sourcing Request" : "Broadcast Sourcing Request"}
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

              {/* Contact Info (collected when posting; not part of an edit) */}
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
                  <ActivityIndicator color="#0f172a" />
                ) : (
                  <>
                    <PlusCircle size={16} color="#0f172a" />
                    <Text style={styles.modalSubmitBtnText}>
                      {editingId ? "Save Changes" : "Broadcast Sourcing Request"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
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
  avatarText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    backgroundColor: "#ffffff",
  },
  procurementBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: "#eff5fb",
    borderWidth: 1,
    borderColor: "#dbeaf7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    marginBottom: 10,
  },
  procurementBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#033a7d",
    letterSpacing: 0.4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  headerTitleDark: {
    color: "#f8fafc",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 19,
    marginBottom: 16,
  },
  headerSubtitleDark: {
    color: "#94a3b8",
  },
  postCalloutCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    marginBottom: 16,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  postCalloutCardDark: {
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
  },
  postCalloutLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    paddingRight: 8,
  },
  memoIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#fef3c7",
    alignItems: "center",
    justifyContent: "center",
  },
  postCalloutTextCol: {
    flex: 1,
  },
  postCalloutTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 2,
  },
  postCalloutTitleDark: {
    color: "#f8fafc",
  },
  postCalloutSub: {
    fontSize: 11,
    color: "#64748b",
  },
  postWantedBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#fbc634",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
  },
  postWantedBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0f172a",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  filterTriggerBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#eff5fb",
    borderWidth: 1,
    borderColor: "#dbeaf7",
    alignItems: "center",
    justifyContent: "center",
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
  categorySheetList: {
    flexShrink: 1,
  },
  categorySheetListContent: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  categorySheetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  categorySheetRowActive: {
    backgroundColor: "#eff5fb",
  },
  categorySheetText: {
    fontSize: 15,
    color: "#0f172a",
  },
  categorySheetTextActive: {
    color: "#033a7d",
    fontWeight: "700",
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 14,
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
  typeChipsScroll: {
    marginBottom: 12,
    flexGrow: 0,
  },
  typeChipsRow: {
    flexDirection: "row",
    gap: 8,
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  typeChipActive: {
    backgroundColor: "#002555",
    borderColor: "#002555",
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  typeChipTextActive: {
    color: "#ffffff",
  },
  urgentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ef4444",
  },
  listContent: {
    paddingBottom: 24,
    backgroundColor: "#f8fafc",
  },
  card: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
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
  cardBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: "#eff5fb",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#033a7d",
    letterSpacing: 0.3,
  },
  statusPillRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  openPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  openDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#15803d",
  },
  openPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#15803d",
    letterSpacing: 0.4,
  },
  fulfilledPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  fulfilledDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#64748b",
  },
  fulfilledPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  metaDate: {
    fontSize: 11,
    color: "#64748b",
  },
  metaDot: {
    fontSize: 11,
    color: "#cbd5e1",
  },
  reqCodeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#b45309",
    fontFamily: Platform.select({ ios: "Courier", android: "monospace" }),
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
    lineHeight: 23,
    marginBottom: 8,
  },
  cardTitleDark: {
    color: "#f8fafc",
  },
  cardDescription: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 19,
    marginBottom: 14,
  },
  cardDescriptionDark: {
    color: "#94a3b8",
  },
  specsBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    marginBottom: 14,
  },
  specsBoxDark: {
    backgroundColor: "#16203a",
    borderColor: "#1e293b",
  },
  specsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 8,
    marginBottom: 8,
  },
  specsCol: {
    flex: 1,
  },
  specsLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  specsValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  specsValueDark: {
    color: "#f8fafc",
  },
  specsBudgetValue: {
    fontSize: 13,
    fontWeight: "900",
    color: "#002555",
  },
  cardFooter: {
    paddingTop: 2,
  },
  fulfillBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#033a7d",
    paddingVertical: 10,
    borderRadius: 10,
  },
  fulfillBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#64748b",
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
  emptyPostBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fbc634",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 8,
  },
  emptyPostBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    maxHeight: "90%",
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
  modalSubHeader: {
    fontSize: 11,
    fontWeight: "800",
    color: "#033a7d",
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
    padding: 4,
  },
  modalForm: {
    flexShrink: 1,
  },
  modalFormContent: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 5,
    marginTop: 10,
  },
  typeSelectorRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  typeSelectorBtn: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  typeSelectorBtnActive: {
    backgroundColor: "#002555",
    borderColor: "#002555",
  },
  typeSelectorBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    textAlign: "center",
  },
  typeSelectorBtnTextActive: {
    color: "#ffffff",
  },
  catOptionPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  catOptionPillActive: {
    backgroundColor: "#033a7d",
    borderColor: "#033a7d",
  },
  catOptionPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  catOptionPillTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  input: {
    height: 44,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#0f172a",
  },
  inputDark: {
    backgroundColor: "#16203a",
    borderColor: "#1e293b",
    color: "#f8fafc",
  },
  textArea: {
    height: 90,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
    textAlignVertical: "top",
  },
  textAreaDark: {
    backgroundColor: "#16203a",
    borderColor: "#1e293b",
    color: "#f8fafc",
  },
  modalSubmitBtn: {
    backgroundColor: "#fbc634",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    marginTop: 20,
    marginBottom: 24,
  },
  modalSubmitBtnDisabled: {
    opacity: 0.6,
  },
  modalSubmitBtnText: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "800",
  },
});
