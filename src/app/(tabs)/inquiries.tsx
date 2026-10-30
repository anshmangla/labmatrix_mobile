import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  useColorScheme,
  Alert,
  Image,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  MessageSquare,
  Building2,
  Clock,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  User,
  Bell,
  Lock,
  Plus,
  Store,
  ClipboardList,
  Tag,
  Wrench,
  Microscope,
} from "lucide-react-native";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { Inquiry } from "@/types/api";
import { LabMatrixTokens } from "@/constants/theme";
import { ProfileQuickMenuModal } from "@/components/ProfileQuickMenuModal";
import { EscrowPolicyModal } from "@/components/EscrowPolicyModal";

export default function InquiriesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { colors } = LabMatrixTokens;
  const { isAuthenticated, user } = useAuth();

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

  const formatINR = (amount?: number | null) => {
    if (amount === undefined || amount === null) return "N/A";
    return amount.toLocaleString("en-IN");
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffHours < 1) return "Just now";
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  // Auth Guard
  if (!isAuthenticated) {
    return (
      <SafeAreaView edges={["top"]} style={[styles.safeArea, isDark && styles.safeAreaDark]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={styles.topBar}>
          <Image
            source={require("@/assets/images/logo.png")}
            style={styles.logoImg}
            resizeMode="contain"
          />
        </View>

        <View style={styles.authRequiredContainer}>
          <View style={styles.authLockCircle}>
            <Lock size={36} color="#033a7d" />
          </View>
          <Text style={[styles.authTitle, isDark && styles.authTitleDark]}>
            Sign In to View Inquiries
          </Text>
          <Text style={styles.authSubtitle}>
            Track incoming buyer requests, review price proposals, and coordinate equipment deals
            securely with verified laboratories.
          </Text>
          <TouchableOpacity
            style={styles.signInButton}
            activeOpacity={0.85}
            onPress={() => router.push("/(auth)/login" as any)}
          >
            <Text style={styles.signInButtonText}>Proceed to Sign In</Text>
            <ArrowRight size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const inquiriesList = activeTab === "received" ? data?.received || [] : data?.sent || [];
  const receivedCount = data?.received?.length || 0;
  const sentCount = data?.sent?.length || 0;

  const renderInquiryCard = ({ item }: { item: Inquiry }) => {
    const isListing = Boolean(item.listing);
    const targetTitle = item.listing?.title || item.requirement?.title || "Analytical Instrument";
    const itemType = item.listing?.itemType || item.requirement?.itemType;
    const hasPriceRange =
      item.listing?.minPrice !== undefined &&
      item.listing?.minPrice !== null &&
      item.listing?.maxPrice !== undefined &&
      item.listing?.maxPrice !== null;

    const statusStyle =
      item.status === "NEW"
        ? styles.statusNew
        : item.status === "IN_PROGRESS"
        ? styles.statusInProgress
        : styles.statusClosed;

    const statusTextStyle =
      item.status === "NEW"
        ? styles.statusNewText
        : item.status === "IN_PROGRESS"
        ? styles.statusInProgressText
        : styles.statusClosedText;

    const navigateToTarget = () => {
      if (item.listingId) {
        router.push(`/listing/${item.listingId}` as any);
      } else if (item.requirementId) {
        router.push(`/requests/${item.requirementId}` as any);
      }
    };

    return (
      <View style={[styles.card, isDark && styles.cardDark]}>
        {/* Card Header: Type Badge & Status */}
        <View style={styles.cardHeaderRow}>
          <View style={styles.typeBadgeRow}>
            {itemType === "SPARE_PART" ? (
              <View style={[styles.itemTypeBadge, { backgroundColor: "#fff7ed", borderColor: "#fed7aa" }]}>
                <Wrench size={10} color="#c2410c" />
                <Text style={[styles.itemTypeBadgeText, { color: "#c2410c" }]}>SPARE PART</Text>
              </View>
            ) : itemType === "NEW_INSTRUMENT" ? (
              <View style={[styles.itemTypeBadge, { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" }]}>
                <SparklesIcon />
                <Text style={[styles.itemTypeBadgeText, { color: "#1d4ed8" }]}>BRAND NEW</Text>
              </View>
            ) : item.requirement ? (
              <View style={[styles.itemTypeBadge, { backgroundColor: "#fdf4ff", borderColor: "#f5d0fe" }]}>
                <ClipboardList size={10} color="#a21caf" />
                <Text style={[styles.itemTypeBadgeText, { color: "#a21caf" }]}>WANTED REQUEST</Text>
              </View>
            ) : (
              <View style={[styles.itemTypeBadge, { backgroundColor: "#eff5fb", borderColor: "#dbeaf7" }]}>
                <Microscope size={10} color="#033a7d" />
                <Text style={[styles.itemTypeBadgeText, { color: "#033a7d" }]}>PRE-OWNED MACHINE</Text>
              </View>
            )}

            <View style={[styles.statusBadge, statusStyle]}>
              <Text style={[styles.statusBadgeText, statusTextStyle]}>
                {item.status.replace("_", " ")}
              </Text>
            </View>
          </View>

          <View style={styles.timeRow}>
            <Clock size={11} color="#64748b" />
            <Text style={styles.timeText}>{formatRelativeTime(item.createdAt)}</Text>
          </View>
        </View>

        {/* Target Item Title */}
        <TouchableOpacity activeOpacity={0.75} onPress={navigateToTarget} style={styles.titleWrapper}>
          <Text style={[styles.targetTitle, isDark && styles.targetTitleDark]} numberOfLines={2}>
            {targetTitle}
          </Text>
          <ExternalLink size={14} color="#033a7d" style={{ marginTop: 2 }} />
        </TouchableOpacity>

        {/* Target Price if Available */}
        {hasPriceRange && (
          <View style={styles.priceRow}>
            <Tag size={12} color="#033a7d" />
            <Text style={styles.priceLabel}>Listed Range: </Text>
            <Text style={styles.priceValue}>
              ₹{formatINR(item.listing?.minPrice)} - ₹{formatINR(item.listing?.maxPrice)}
            </Text>
          </View>
        )}

        {/* Message / Quotation Quote Box */}
        <View style={[styles.messageBox, isDark && styles.messageBoxDark]}>
          <View style={styles.quoteAccentBar} />
          <View style={styles.messageContent}>
            <Text style={styles.messageQuoteLabel}>
              {activeTab === "received" ? "INCOMING PROPOSAL / NOTE:" : "YOUR SUBMITTED INQUIRY:"}
            </Text>
            <Text style={[styles.messageText, isDark && styles.messageTextDark]}>
              "{item.message}"
            </Text>
          </View>
        </View>

        {/* Counterparty Contact Container */}
        <View style={[styles.counterpartyCard, isDark && styles.counterpartyCardDark]}>
          <View style={styles.counterpartyHeader}>
            <View style={styles.counterpartyAvatar}>
              <User size={13} color="#ffffff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.counterpartyName, isDark && styles.counterpartyNameDark]}>
                {item.name || "Laboratory Representative"}
              </Text>
              {item.company ? (
                <View style={styles.inlineCompany}>
                  <Building2 size={11} color="#64748b" />
                  <Text style={styles.counterpartyCompany} numberOfLines={1}>
                    {item.company}
                  </Text>
                </View>
              ) : (
                <Text style={styles.counterpartyCompany}>Verified Lab Facility</Text>
              )}
            </View>
          </View>

          {/* Quick Contact Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.viewItemActionBtn}
              activeOpacity={0.8}
              onPress={navigateToTarget}
            >
              <Text style={styles.viewItemActionText}>View Item</Text>
              <ArrowRight size={12} color="#475569" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={["top"]} style={[styles.safeArea, isDark && styles.safeAreaDark]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* 1. Branded Top Header Bar */}
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
            onPress={() => router.push("/notifications" as any)}
          >
            <Bell size={20} color={isDark ? "#f8fafc" : "#0f172a"} />
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

      {/* 2. Page Title & Dual Segment Selector */}
      <View style={[styles.headerSection, isDark && styles.headerSectionDark]}>
        <View style={styles.titleRow}>
          <Text style={[styles.pageTitle, isDark && styles.pageTitleDark]}>
            Inquiries & Deals
          </Text>
          <View style={styles.activeDealsBadge}>
            <Text style={styles.activeDealsBadgeText}>
              {receivedCount + sentCount} Total
            </Text>
          </View>
        </View>
        <Text style={styles.pageSubtitle}>
          Direct lab buyer communications, quotation notes, and supply offers.
        </Text>

        {/* Dual Tab Segment Switcher */}
        <View style={[styles.segmentContainer, isDark && styles.segmentContainerDark]}>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeTab === "received" && styles.segmentBtnActive,
            ]}
            activeOpacity={0.8}
            onPress={() => setActiveTab("received")}
          >
            <Text
              style={[
                styles.segmentBtnText,
                activeTab === "received" && styles.segmentBtnTextActive,
              ]}
            >
              Received Inquiries
            </Text>
            <View
              style={[
                styles.segmentCountBadge,
                activeTab === "received" && styles.segmentCountBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentCountText,
                  activeTab === "received" && styles.segmentCountTextActive,
                ]}
              >
                {receivedCount}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeTab === "sent" && styles.segmentBtnActive,
            ]}
            activeOpacity={0.8}
            onPress={() => setActiveTab("sent")}
          >
            <Text
              style={[
                styles.segmentBtnText,
                activeTab === "sent" && styles.segmentBtnTextActive,
              ]}
            >
              Sent Inquiries
            </Text>
            <View
              style={[
                styles.segmentCountBadge,
                activeTab === "sent" && styles.segmentCountBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentCountText,
                  activeTab === "sent" && styles.segmentCountTextActive,
                ]}
              >
                {sentCount}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. Inquiry Feed List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#033a7d" />
          <Text style={styles.loadingText}>Loading inquiries & proposals...</Text>
        </View>
      ) : (
        <FlatList
          data={inquiriesList}
          keyExtractor={(item) => item.id}
          renderItem={renderInquiryCard}
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
                <MessageSquare size={36} color="#033a7d" />
              </View>
              <Text style={[styles.emptyTitle, isDark && styles.emptyTitleDark]}>
                {activeTab === "received" ? "No Received Inquiries Yet" : "No Sent Inquiries Yet"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === "received"
                  ? "When laboratory buyers or researchers submit a quotation request for your listed equipment or spare parts, they will appear here."
                  : "You haven't inquired on any instruments or procurement requests yet. Explore verified listings or submit a sourcing proposal."}
              </Text>

              {activeTab === "received" ? (
                <TouchableOpacity
                  style={styles.emptyCtaBtn}
                  activeOpacity={0.85}
                  onPress={() => router.push("/sell" as any)}
                >
                  <Plus size={16} color="#0f172a" strokeWidth={2.5} />
                  <Text style={styles.emptyCtaBtnText}>List Equipment or Parts</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.emptyCtaBtn}
                  activeOpacity={0.85}
                  onPress={() => router.push("/(tabs)")}
                >
                  <Store size={16} color="#0f172a" strokeWidth={2.5} />
                  <Text style={styles.emptyCtaBtnText}>Browse Marketplace</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

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

function SparklesIcon() {
  return (
    <View style={{ width: 10, height: 10, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 9, color: "#1d4ed8" }}>✦</Text>
    </View>
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
    gap: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#eff5fb",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#033a7d",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  headerSection: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerSectionDark: {
    backgroundColor: "#011936",
    borderBottomColor: "#1e293b",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.3,
  },
  pageTitleDark: {
    color: "#f8fafc",
  },
  activeDealsBadge: {
    backgroundColor: "#eff5fb",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeDealsBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#033a7d",
  },
  pageSubtitle: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 3,
    marginBottom: 12,
  },
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: "#eaedff",
    borderRadius: 10,
    padding: 3,
  },
  segmentContainerDark: {
    backgroundColor: "#0a1f44",
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 8,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: "#033a7d",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  segmentBtnTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  segmentCountBadge: {
    backgroundColor: "rgba(0,0,0,0.06)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  segmentCountBadgeActive: {
    backgroundColor: "#fdc836",
  },
  segmentCountText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
  },
  segmentCountTextActive: {
    color: "#0f172a",
  },
  listContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    gap: 10,
  },
  cardDark: {
    backgroundColor: "#03142e",
    borderColor: "#1e293b",
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  typeBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  itemTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
  },
  itemTypeBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  statusNew: {
    backgroundColor: "#eff5fb",
  },
  statusNewText: {
    color: "#033a7d",
    fontSize: 10,
    fontWeight: "700",
  },
  statusInProgress: {
    backgroundColor: "#fef3c7",
  },
  statusInProgressText: {
    color: "#b45309",
    fontSize: 10,
    fontWeight: "700",
  },
  statusClosed: {
    backgroundColor: "#f1f5f9",
  },
  statusClosedText: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "700",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    color: "#64748b",
  },
  titleWrapper: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 6,
  },
  targetTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    lineHeight: 20,
  },
  targetTitleDark: {
    color: "#f8fafc",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  priceLabel: {
    fontSize: 11,
    color: "#64748b",
  },
  priceValue: {
    fontSize: 11,
    fontWeight: "700",
    color: "#033a7d",
  },
  messageBox: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  messageBoxDark: {
    backgroundColor: "#020d1c",
    borderColor: "#1e293b",
  },
  quoteAccentBar: {
    width: 4,
    backgroundColor: "#033a7d",
  },
  messageContent: {
    flex: 1,
    padding: 10,
  },
  messageQuoteLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 13,
    color: "#1e293b",
    lineHeight: 18,
    fontStyle: "italic",
  },
  messageTextDark: {
    color: "#cbd5e1",
  },
  counterpartyCard: {
    backgroundColor: "#eff5fb",
    borderRadius: 8,
    padding: 10,
    gap: 8,
  },
  counterpartyCardDark: {
    backgroundColor: "#04193a",
  },
  counterpartyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  counterpartyAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#033a7d",
    alignItems: "center",
    justifyContent: "center",
  },
  counterpartyName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  counterpartyNameDark: {
    color: "#f8fafc",
  },
  inlineCompany: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 1,
  },
  counterpartyCompany: {
    fontSize: 11,
    color: "#64748b",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  viewItemActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: "auto",
  },
  viewItemActionText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
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
    paddingVertical: 48,
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
  emptyCtaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fdc836",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  emptyCtaBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  authRequiredContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 14,
  },
  authLockCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#eff5fb",
    alignItems: "center",
    justifyContent: "center",
  },
  authTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
  },
  authTitleDark: {
    color: "#f8fafc",
  },
  authSubtitle: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 320,
  },
  signInButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#033a7d",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  signInButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
});
