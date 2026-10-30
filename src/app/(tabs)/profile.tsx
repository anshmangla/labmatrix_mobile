import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  useColorScheme,
  Linking,
  Image,
  StatusBar,
  Modal,
  TextInput,
  ActivityIndicator,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User as UserIcon,
  Mail,
  Phone,
  Building2,
  ShieldCheck,
  LogOut,
  Trash2,
  LogIn,
  Package,
  ClipboardList,
  MessageSquare,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  Clock,
  Pencil,
  Copy,
  ChevronDown,
  ArrowRight,
  Bell,
  Sparkles,
  AlertTriangle,
  X,
  Share2,
  Bookmark,
  CheckCheck,
  Settings,
  Plus,
  Wrench,
  FileQuestion,
  ShieldAlert,
  Inbox,
  Send,
  AlertCircle,
  HelpCircle,
} from "lucide-react-native";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { LabMatrixTokens } from "@/constants/theme";
import { ProfileQuickMenuModal } from "@/components/ProfileQuickMenuModal";
import { EscrowPolicyModal } from "@/components/EscrowPolicyModal";

export default function ProfileScreen() {
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { colors } = LabMatrixTokens;
  const { user, isAuthenticated, logout } = useAuth();
  const queryClient = useQueryClient();

  // Active Tab: "listings" | "requests" | "inquiries" | "settings"
  const [activeTab, setActiveTab] = useState<
    "listings" | "requests" | "inquiries" | "settings"
  >("listings");

  // Synchronize incoming tab route param
  useEffect(() => {
    if (tab === "settings") setActiveTab("settings");
    else if (tab === "requests") setActiveTab("requests");
    else if (tab === "inquiries") setActiveTab("inquiries");
    else if (tab === "listings") setActiveTab("listings");
  }, [tab]);

  // Quick Profile Menu & Escrow modal states
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [escrowModalVisible, setEscrowModalVisible] = useState(false);

  // Status updating state
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Status picker modal for listings & requests
  const [statusPickerItem, setStatusPickerItem] = useState<{
    id: string;
    type: "listing" | "requirement";
    currentStatus: string;
  } | null>(null);

  // Self-deletion modal state
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch user's listings and requirements
  const {
    data: myItems,
    isLoading: isLoadingItems,
    refetch: refetchMyItems,
  } = useQuery({
    queryKey: ["myItems"],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await api.get("/api/user/my-items");
      return res.data as { listings: any[]; requirements: any[] };
    },
  });

  // Fetch account profile (hasPassword decides how account deletion is confirmed)
  const { data: accountProfile } = useQuery({
    queryKey: ["userProfile"],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await api.get("/api/user/profile");
      return res.data?.user as { hasPassword?: boolean } | undefined;
    },
  });
  const requiresPassword = accountProfile?.hasPassword === true;

  // Fetch inquiries (received & sent)
  const {
    data: inquiriesData,
    isLoading: isLoadingInquiries,
    refetch: refetchInquiries,
  } = useQuery({
    queryKey: ["inquiries"],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await api.get("/api/inquiries");
      return res.data as { received: any[]; sent: any[] };
    },
  });

  // Fetch notifications
  const {
    data: notificationsData,
    refetch: refetchNotifications,
  } = useQuery({
    queryKey: ["notifications"],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await api.get("/api/notifications");
      return res.data as { notifications: any[]; unreadCount: number };
    },
  });

  const handleShareApp = async () => {
    try {
      await Share.share({
        title: "LabMatrix Surplus Marketplace",
        message:
          "Explore verified pre-owned analytical & clinical laboratory instruments on LabMatrix: https://surplus.labmatrixindia.com",
      });
    } catch {}
  };

  const handleLogout = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out of your LabMatrix session?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation.trim().toUpperCase() !== "DELETE") {
      Alert.alert(
        "Confirmation Required",
        'Please type "DELETE" to permanently deactivate your account.'
      );
      return;
    }

    if (requiresPassword && !deletePassword) {
      Alert.alert("Password Required", "Please enter your account password to confirm deactivation.");
      return;
    }

    setIsDeleting(true);
    try {
      await api.post("/api/user/delete-account", {
        confirmation: "DELETE",
        ...(deletePassword ? { password: deletePassword } : {}),
      });
      setIsDeleteModalVisible(false);
      setDeletePassword("");
      Alert.alert(
        "Account Deactivated",
        "Your account and listed inventory have been deactivated."
      );
      await logout();
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.error || "Could not delete account. Please try again."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateListingStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    setStatusPickerItem(null);
    try {
      await api.patch(`/api/listings/${id}`, { status: newStatus });
      queryClient.setQueryData(["myItems"], (old: any) => {
        if (!old?.listings) return old;
        return {
          ...old,
          listings: old.listings.map((l: any) =>
            l.id === id ? { ...l, status: newStatus } : l
          ),
        };
      });
      Alert.alert(
        "Status Updated",
        `Machine status changed to ${newStatus}.`
      );
    } catch (err: any) {
      Alert.alert(
        "Update Failed",
        err.response?.data?.error || "Failed to update listing status."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdateRequirementStatus = async (
    id: string,
    newStatus: string
  ) => {
    setUpdatingId(id);
    setStatusPickerItem(null);
    try {
      await api.patch(`/api/requirements/${id}`, { status: newStatus });
      queryClient.setQueryData(["myItems"], (old: any) => {
        if (!old?.requirements) return old;
        return {
          ...old,
          requirements: old.requirements.map((r: any) =>
            r.id === id ? { ...r, status: newStatus } : r
          ),
        };
      });
      Alert.alert(
        "Status Updated",
        `Requirement status changed to ${newStatus}.`
      );
    } catch (err: any) {
      Alert.alert(
        "Update Failed",
        err.response?.data?.error || "Failed to update requirement status."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await api.patch("/api/notifications", { all: true });
      refetchNotifications();
    } catch {}
  };

  const handleCallSupport = () => {
    Linking.openURL("tel:+917303040804").catch(() => {
      Alert.alert(
        "Support Desk",
        "Helpline: +91 73030 40804\nAvailable Mon-Sat 9AM - 7PM IST"
      );
    });
  };

  // Helper to extract initials: "Manish Mangla" -> "MM"
  const getInitials = (name?: string | null, email?: string | null) => {
    if (name && name.trim().length > 0) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    if (email && email.trim().length > 0) {
      return email.slice(0, 2).toUpperCase();
    }
    return "LM";
  };

  // ==========================================
  // 1. LOGGED-OUT STATE
  // ==========================================
  if (!isAuthenticated || !user) {
    return (
      <SafeAreaView edges={["top"]} style={[styles.safeArea, isDark && styles.safeAreaDark]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

        {/* Top Header */}
        <View style={[styles.topBar, isDark && styles.topBarDark]}>
          <Image
            source={require("@/assets/images/logo.png")}
            style={styles.logoImg}
            resizeMode="contain"
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.loggedOutScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.loggedOutHero}>
            <View style={styles.loggedOutIconCircle}>
              <UserIcon size={38} color="#033a7d" />
            </View>
            <Text
              style={[
                styles.loggedOutTitle,
                isDark && styles.loggedOutTitleDark,
              ]}
            >
              Sign In to Your Laboratory Profile
            </Text>
            <Text style={styles.loggedOutSubtitle}>
              Access your listed equipment, track inquiries, manage buyer
              sourcing requests, and receive deal desk quotes.
            </Text>
          </View>

          {/* Value Props Card */}
          <View
            style={[styles.benefitsCard, isDark && styles.benefitsCardDark]}
          >
            <View style={styles.benefitRow}>
              <CheckCircle2
                size={18}
                color="#15803d"
                style={{ marginTop: 2 }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.benefitHeading,
                    isDark && styles.benefitHeadingDark,
                  ]}
                >
                  List Surplus Instruments & Spares
                </Text>
                <Text style={styles.benefitDesc}>
                  Post pre-owned HPLC, GC-MS, spectrophotometers, or spare parts
                  with zero listing fees.
                </Text>
              </View>
            </View>

            <View style={styles.benefitRow}>
              <CheckCircle2
                size={18}
                color="#15803d"
                style={{ marginTop: 2 }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.benefitHeading,
                    isDark && styles.benefitHeadingDark,
                  ]}
                >
                  Verified Sourcing Network
                </Text>
                <Text style={styles.benefitDesc}>
                  Post wanted instrument requirements and receive quotes from
                  audited laboratories.
                </Text>
              </View>
            </View>

            <View style={styles.benefitRow}>
              <CheckCircle2
                size={18}
                color="#15803d"
                style={{ marginTop: 2 }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.benefitHeading,
                    isDark && styles.benefitHeadingDark,
                  ]}
                >
                  Secure Escrow & Physical Audit
                </Text>
                <Text style={styles.benefitDesc}>
                  Every instrument undergoes diagnostic inspection prior to
                  handover and dispatch.
                </Text>
              </View>
            </View>
          </View>

          {/* Action CTAs */}
          <View style={styles.loggedOutActions}>
            <TouchableOpacity
              style={styles.primaryLoginBtn}
              activeOpacity={0.85}
              onPress={() => router.push("/(auth)/login" as any)}
            >
              <LogIn size={18} color="#ffffff" />
              <Text style={styles.primaryLoginBtnText}>Sign In to Account</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryRegisterBtn}
              activeOpacity={0.85}
              onPress={() => router.push("/(auth)/register" as any)}
            >
              <Text style={styles.secondaryRegisterBtnText}>
                Register Facility Account
              </Text>
              <ArrowRight size={16} color="#033a7d" />
            </TouchableOpacity>
          </View>

          {/* Helpline Footer */}
          <View style={styles.supportFooter}>
            <Text style={styles.supportFooterText}>
              Need assistance? Call Engineering Desk:{" "}
              <Text
                style={{ fontWeight: "700", color: "#033a7d" }}
                onPress={handleCallSupport}
              >
                +91 73030 40804
              </Text>
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ==========================================
  // 2. LOGGED-IN DASHBOARD (Exact Match to Mockup)
  // ==========================================
  const listings = myItems?.listings || [];
  const requirements = myItems?.requirements || [];
  const receivedInquiries = inquiriesData?.received || [];
  const sentInquiries = inquiriesData?.sent || [];
  const notifications = notificationsData?.notifications || [];
  const unreadCount = notificationsData?.unreadCount || 0;
  const totalInquiriesAndNotifications =
    receivedInquiries.length + sentInquiries.length + notifications.length;

  const userInitials = getInitials(user.name, user.email);

  return (
    <SafeAreaView edges={["top"]} style={[styles.safeArea, isDark && styles.safeAreaDark]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Top Header Bar matching Mockup */}
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
            style={styles.headerIconBtn}
            activeOpacity={0.7}
            onPress={handleShareApp}
            accessibilityLabel="Share App"
          >
            <Share2 size={19} color={isDark ? "#cbd5e1" : "#475569"} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerIconBtn}
            activeOpacity={0.7}
            onPress={() => router.push("/notifications" as any)}
            accessibilityLabel="Notifications"
          >
            <Bell size={19} color={isDark ? "#cbd5e1" : "#475569"} />
            {unreadCount > 0 && <View style={styles.headerNotificationDot} />}
          </TouchableOpacity>

          {/* User Avatar Mini Pill - Opens Quick Profile Menu */}
          <TouchableOpacity
            style={styles.headerAvatarPill}
            activeOpacity={0.7}
            onPress={() => setProfileMenuVisible(true)}
            accessibilityLabel="Open Profile Menu"
          >
            <Text style={styles.headerAvatarText}>{userInitials}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ==================================================== */}
        {/* USER PROFILE HERO CARD                               */}
        {/* ==================================================== */}
        <View style={[styles.profileHeroCard, isDark && styles.profileHeroCardDark]}>
          <View style={styles.profileTopRow}>
            {/* Dark Navy Squircle Initials Avatar */}
            <View style={styles.heroInitialsAvatar}>
              <Text style={styles.heroInitialsText}>{userInitials}</Text>
            </View>

            <View style={styles.heroTextCol}>
              <View style={styles.heroNameRow}>
                <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <Text
                    style={[styles.heroName, isDark && styles.heroNameDark]}
                    numberOfLines={1}
                  >
                    {user.name || "Laboratory Representative"}
                  </Text>
                  {/* Verified LabMatrix Badge */}
                  <View style={styles.labmatrixVerifiedBadge}>
                    <CheckCircle2 size={11} color="#033a7d" />
                    <Text style={styles.labmatrixVerifiedText}>Labmatrix</Text>
                  </View>
                </View>

                {/* Visible Sign Out Button */}
                <TouchableOpacity
                  style={styles.heroSignOutPill}
                  activeOpacity={0.75}
                  onPress={handleLogout}
                  accessibilityLabel="Sign Out"
                >
                  <LogOut size={12} color="#dc2626" />
                  <Text style={styles.heroSignOutText}>Sign Out</Text>
                </TouchableOpacity>
              </View>

              {/* Email */}
              <View style={styles.heroMetaLine}>
                <Mail size={12} color="#64748b" style={{ marginRight: 5 }} />
                <Text style={styles.heroMetaText} numberOfLines={1}>
                  {user.email}
                </Text>
              </View>

              {/* Phone */}
              <View style={styles.heroMetaLine}>
                <Phone size={12} color="#64748b" style={{ marginRight: 5 }} />
                <Text style={styles.heroMetaText} numberOfLines={1}>
                  {user.phoneNumber || (
                    <Text style={{ color: "#d97706" }}>No mobile on file yet</Text>
                  )}
                </Text>
              </View>

              {/* Company / Lab Name if present */}
              {user.companyName ? (
                <View style={styles.heroMetaLine}>
                  <Building2 size={12} color="#64748b" style={{ marginRight: 5 }} />
                  <Text style={styles.heroMetaText} numberOfLines={1}>
                    {user.companyName}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Quick Action Buttons Row */}
          <View style={styles.heroActionsRow}>
            {/* 1. + List Machine */}
            <TouchableOpacity
              style={styles.heroBtnGold}
              activeOpacity={0.85}
              onPress={() => router.push("/(tabs)/sell" as any)}
            >
              <Plus size={14} color="#011936" />
              <Text style={styles.heroBtnGoldText}>List Machine</Text>
            </TouchableOpacity>

            {/* 2. List Spare Part */}
            <TouchableOpacity
              style={styles.heroBtnWhite}
              activeOpacity={0.85}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/sell",
                  params: { type: "SPARE_PART" },
                } as any)
              }
            >
              <Wrench size={13} color="#033a7d" />
              <Text style={styles.heroBtnWhiteText}>List Spare Part</Text>
            </TouchableOpacity>

            {/* 3. Post Request */}
            <TouchableOpacity
              style={styles.heroBtnNavy}
              activeOpacity={0.85}
              onPress={() => router.push("/(tabs)/requests" as any)}
            >
              <FileQuestion size={13} color="#ffffff" />
              <Text style={styles.heroBtnNavyText}>Post Request</Text>
            </TouchableOpacity>
          </View>

          {/* Master Admin Console Shortcut (Only visible if user.role === "ADMIN") */}
          {user.role === "ADMIN" && (
            <TouchableOpacity
              style={styles.adminConsoleShortcut}
              activeOpacity={0.85}
              onPress={() => router.push("/admin" as any)}
            >
              <View style={styles.adminConsoleLeft}>
                <ShieldCheck size={18} color="#fbc634" />
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.adminConsoleTitle}>
                    Operations & Deal Console
                  </Text>
                  <Text style={styles.adminConsoleSub}>
                    Master Admin Access • Moderation & Pipeline
                  </Text>
                </View>
              </View>
              <ArrowRight size={16} color="#fbc634" />
            </TouchableOpacity>
          )}
        </View>

        {/* ==================================================== */}
        {/* FULL PRIVACY GUARANTEE BANNER                        */}
        {/* ==================================================== */}
        <View style={styles.privacyBanner}>
          <View style={styles.privacyIconCircle}>
            <ShieldCheck size={18} color="#fbc634" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.privacyHeader}>
              FULL PRIVACY GUARANTEE ACTIVE
            </Text>
            <Text style={styles.privacyDesc}>
              Your personal phone number and email remain private. Inquiries and
              deal notifications are managed securely through your dashboard.
            </Text>
          </View>
        </View>

        {/* ==================================================== */}
        {/* HORIZONTAL TABS CONTROLS                             */}
        {/* ==================================================== */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScrollRow}
        >
          <TouchableOpacity
            style={[
              styles.tabPill,
              activeTab === "listings" && styles.tabPillActive,
            ]}
            activeOpacity={0.75}
            onPress={() => setActiveTab("listings")}
          >
            <Text
              style={[
                styles.tabPillText,
                activeTab === "listings" && styles.tabPillTextActive,
              ]}
            >
              My Listed Equipment ({listings.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabPill,
              activeTab === "requests" && styles.tabPillActive,
            ]}
            activeOpacity={0.75}
            onPress={() => setActiveTab("requests")}
          >
            <Text
              style={[
                styles.tabPillText,
                activeTab === "requests" && styles.tabPillTextActive,
              ]}
            >
              My Machine Requests ({requirements.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabPill,
              activeTab === "inquiries" && styles.tabPillActive,
            ]}
            activeOpacity={0.75}
            onPress={() => setActiveTab("inquiries")}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text
                style={[
                  styles.tabPillText,
                  activeTab === "inquiries" && styles.tabPillTextActive,
                ]}
              >
                Inquiries & Messages ({totalInquiriesAndNotifications})
              </Text>
              {unreadCount > 0 && (
                <View style={styles.tabBadgeRed}>
                  <Text style={styles.tabBadgeRedText}>{unreadCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabPill,
              activeTab === "settings" && styles.tabPillActive,
            ]}
            activeOpacity={0.75}
            onPress={() => setActiveTab("settings")}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Settings
                size={13}
                color={activeTab === "settings" ? "#ffffff" : "#475569"}
                style={{ marginRight: 5 }}
              />
              <Text
                style={[
                  styles.tabPillText,
                  activeTab === "settings" && styles.tabPillTextActive,
                ]}
              >
                Account Settings
              </Text>
            </View>
          </TouchableOpacity>
        </ScrollView>

        {/* ==================================================== */}
        {/* TAB 1: MY LISTED EQUIPMENT                           */}
        {/* ==================================================== */}
        {activeTab === "listings" && (
          <View style={styles.tabContentContainer}>
            {isLoadingItems ? (
              <View style={styles.tabLoadingCard}>
                <ActivityIndicator size="small" color="#033a7d" />
                <Text style={styles.tabLoadingText}>Loading your equipment...</Text>
              </View>
            ) : listings.length === 0 ? (
              <View style={[styles.emptyCard, isDark && styles.emptyCardDark]}>
                <Package size={36} color="#94a3b8" />
                <Text style={[styles.emptyTitle, isDark && styles.emptyTitleDark]}>
                  You haven't listed any machines yet
                </Text>
                <Text style={styles.emptySubtitle}>
                  Have surplus HPLC, GC-MS, or testing instruments? List them on
                  LabMatrix and connect with verified buyers across India.
                </Text>
                <TouchableOpacity
                  style={styles.emptyActionBtn}
                  activeOpacity={0.85}
                  onPress={() => router.push("/(tabs)/sell" as any)}
                >
                  <Plus size={15} color="#011936" />
                  <Text style={styles.emptyActionBtnText}>
                    List Your First Machine
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.cardsList}>
                {listings.map((item: any) => {
                  const isAvailable = item.status === "AVAILABLE";
                  return (
                    <View
                      key={item.id}
                      style={[styles.itemCard, isDark && styles.itemCardDark]}
                    >
                      {/* Top Badges Row */}
                      <View style={styles.itemCardTopBadges}>
                        <View style={styles.itemBadgesLeft}>
                          {/* Category Badge */}
                          <View style={styles.categoryBadge}>
                            <Text style={styles.categoryBadgeText}>
                              {item.category}
                            </Text>
                          </View>

                          {/* Item Type Badge */}
                          {item.itemType === "NEW_INSTRUMENT" && (
                            <View style={styles.newInstrumentBadge}>
                              <Text style={styles.newInstrumentText}>
                                ✨ New Instrument
                              </Text>
                            </View>
                          )}
                          {item.itemType === "SPARE_PART" && (
                            <View style={styles.sparePartBadge}>
                              <Text style={styles.sparePartText}>
                                ⚙️ Spare Part
                              </Text>
                            </View>
                          )}

                          {/* Quantity Badge */}
                          {item.quantity && item.quantity > 1 ? (
                            <View style={styles.qtyBadge}>
                              <Text style={styles.qtyBadgeText}>
                                Qty: {item.quantity}
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        {/* Approval Status */}
                        {item.isApproved ? (
                          <View style={styles.approvedBadge}>
                            <CheckCircle2 size={11} color="#15803d" />
                            <Text style={styles.approvedText}>
                              Approved & Live
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.pendingBadge}>
                            <Clock size={11} color="#b45309" />
                            <Text style={styles.pendingText}>
                              Pending Admin Approval
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Title & Description */}
                      <Text
                        style={[styles.itemTitle, isDark && styles.itemTitleDark]}
                        numberOfLines={2}
                      >
                        {item.title}
                      </Text>
                      {item.description ? (
                        <Text style={styles.itemDescription} numberOfLines={2}>
                          {item.description}
                        </Text>
                      ) : null}

                      {/* Pending Review Notice */}
                      {!item.isApproved && (
                        <View style={styles.pendingReviewNotice}>
                          <Clock size={13} color="#b45309" style={{ marginTop: 1 }} />
                          <Text style={styles.pendingReviewNoticeText}>
                            Under admin review. Once approved, it will appear
                            publicly on the marketplace.
                          </Text>
                        </View>
                      )}

                      {/* Price & Action Buttons Divider */}
                      <View style={styles.itemCardDivider} />

                      {/* Price Expectation Row */}
                      <View style={styles.priceAndActionsRow}>
                        <View>
                          <Text style={styles.priceLabel}>Price Expectation:</Text>
                          <Text
                            style={[
                              styles.priceValue,
                              isDark && styles.priceValueDark,
                            ]}
                          >
                            ₹{Number(item.minPrice || 0).toLocaleString("en-IN")}{" "}
                            - ₹
                            {Number(item.maxPrice || 0).toLocaleString("en-IN")}
                          </Text>
                        </View>

                        {/* Duplicate, Edit, View Buttons */}
                        <View style={styles.actionsBtnGroup}>
                          <TouchableOpacity
                            style={styles.actionPillBtn}
                            activeOpacity={0.7}
                            onPress={() =>
                              router.push({
                                pathname: "/(tabs)/sell",
                                params: { duplicate: item.id },
                              } as any)
                            }
                          >
                            <Copy size={12} color="#475569" />
                            <Text style={styles.actionPillText}>Duplicate</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.actionPillBtn}
                            activeOpacity={0.7}
                            onPress={() =>
                              router.push({
                                pathname: "/(tabs)/sell",
                                params: { edit: item.id },
                              } as any)
                            }
                          >
                            <Pencil size={12} color="#475569" />
                            <Text style={styles.actionPillText}>Edit</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.actionPillBtnPrimary}
                            activeOpacity={0.7}
                            onPress={() =>
                              router.push(`/listing/${item.id}` as any)
                            }
                          >
                            <Text style={styles.actionPillPrimaryText}>View</Text>
                            <ExternalLink size={11} color="#033a7d" />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Inline Machine Status Toggle Row */}
                      <View style={styles.statusToggleRow}>
                        <Text style={styles.statusToggleLabel}>
                          Machine Status:
                        </Text>
                        <TouchableOpacity
                          style={[
                            styles.statusPickerTrigger,
                            isAvailable
                              ? styles.statusPickerTriggerAvailable
                              : styles.statusPickerTriggerSold,
                          ]}
                          activeOpacity={0.8}
                          onPress={() =>
                            setStatusPickerItem({
                              id: item.id,
                              type: "listing",
                              currentStatus: item.status,
                            })
                          }
                          disabled={updatingId === item.id}
                        >
                          {updatingId === item.id ? (
                            <ActivityIndicator size="small" color="#033a7d" />
                          ) : (
                            <>
                              <View
                                style={[
                                  styles.statusDot,
                                  {
                                    backgroundColor: isAvailable
                                      ? "#16a34a"
                                      : "#dc2626",
                                  },
                                ]}
                              />
                              <Text
                                style={[
                                  styles.statusPickerText,
                                  isAvailable
                                    ? styles.statusPickerTextAvailable
                                    : styles.statusPickerTextSold,
                                ]}
                              >
                                {item.status}
                              </Text>
                              <ChevronDown
                                size={12}
                                color={isAvailable ? "#166534" : "#475569"}
                              />
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* ==================================================== */}
        {/* TAB 2: MY MACHINE REQUESTS                           */}
        {/* ==================================================== */}
        {activeTab === "requests" && (
          <View style={styles.tabContentContainer}>
            {isLoadingItems ? (
              <View style={styles.tabLoadingCard}>
                <ActivityIndicator size="small" color="#033a7d" />
                <Text style={styles.tabLoadingText}>Loading your requests...</Text>
              </View>
            ) : requirements.length === 0 ? (
              <View style={[styles.emptyCard, isDark && styles.emptyCardDark]}>
                <FileQuestion size={36} color="#94a3b8" />
                <Text style={[styles.emptyTitle, isDark && styles.emptyTitleDark]}>
                  No equipment requests posted yet
                </Text>
                <Text style={styles.emptySubtitle}>
                  Looking for a specific testing machine? Post your requirement
                  and verified suppliers will respond with matching inventory.
                </Text>
                <TouchableOpacity
                  style={styles.emptyActionBtn}
                  activeOpacity={0.85}
                  onPress={() => router.push("/(tabs)/requests" as any)}
                >
                  <Plus size={15} color="#011936" />
                  <Text style={styles.emptyActionBtnText}>
                    Post First Requirement
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.cardsList}>
                {requirements.map((req: any) => {
                  const isOpen = req.status === "OPEN";
                  return (
                    <View
                      key={req.id}
                      style={[styles.itemCard, isDark && styles.itemCardDark]}
                    >
                      {/* Top Badges */}
                      <View style={styles.itemCardTopBadges}>
                        <View style={styles.itemBadgesLeft}>
                          <View style={styles.categoryBadge}>
                            <Text style={styles.categoryBadgeText}>
                              {req.category}
                            </Text>
                          </View>
                          {req.itemType === "SPARE_PART" && (
                            <View style={styles.sparePartBadge}>
                              <Text style={styles.sparePartText}>
                                ⚙️ Spare Part
                              </Text>
                            </View>
                          )}
                          <Text style={styles.postedDateText}>
                            • Posted{" "}
                            {new Date(req.createdAt).toLocaleDateString()}
                          </Text>
                        </View>

                        {/* Approval status */}
                        {req.isApproved ? (
                          <View style={styles.approvedBadge}>
                            <CheckCircle2 size={11} color="#15803d" />
                            <Text style={styles.approvedText}>
                              Approved & Live
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.pendingBadge}>
                            <Clock size={11} color="#b45309" />
                            <Text style={styles.pendingText}>
                              Pending Review
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Title & Desc */}
                      <Text
                        style={[styles.itemTitle, isDark && styles.itemTitleDark]}
                        numberOfLines={2}
                      >
                        {req.title}
                      </Text>
                      {req.description ? (
                        <Text style={styles.itemDescription} numberOfLines={2}>
                          {req.description}
                        </Text>
                      ) : null}

                      {!req.isApproved && (
                        <View style={styles.pendingReviewNotice}>
                          <Clock size={13} color="#b45309" style={{ marginTop: 1 }} />
                          <Text style={styles.pendingReviewNoticeText}>
                            Under review. Once approved, it will be visible for
                            matching suppliers.
                          </Text>
                        </View>
                      )}

                      <View style={styles.itemCardDivider} />

                      {/* Request Status & Actions */}
                      <View style={styles.priceAndActionsRow}>
                        <View style={styles.statusToggleRowInline}>
                          <Text style={styles.statusToggleLabel}>Status:</Text>
                          <TouchableOpacity
                            style={[
                              styles.statusPickerTrigger,
                              isOpen
                                ? styles.statusPickerTriggerAvailable
                                : styles.statusPickerTriggerSold,
                            ]}
                            activeOpacity={0.8}
                            onPress={() =>
                              setStatusPickerItem({
                                id: req.id,
                                type: "requirement",
                                currentStatus: req.status,
                              })
                            }
                            disabled={updatingId === req.id}
                          >
                            <View
                              style={[
                                styles.statusDot,
                                {
                                  backgroundColor: isOpen
                                    ? "#16a34a"
                                    : "#2563eb",
                                },
                              ]}
                            />
                            <Text
                              style={[
                                styles.statusPickerText,
                                isOpen
                                  ? styles.statusPickerTextAvailable
                                  : styles.statusPickerTextSold,
                              ]}
                            >
                              {req.status === "OPEN"
                                ? "OPEN (Looking)"
                                : "FULFILLED"}
                            </Text>
                            <ChevronDown size={12} color="#475569" />
                          </TouchableOpacity>
                        </View>

                        <View style={styles.actionsBtnGroup}>
                          <TouchableOpacity
                            style={styles.actionPillBtn}
                            activeOpacity={0.7}
                            onPress={() =>
                              router.push({
                                pathname: "/(tabs)/requests",
                                params: { edit: req.id },
                              } as any)
                            }
                          >
                            <Pencil size={12} color="#475569" />
                            <Text style={styles.actionPillText}>Edit</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.actionPillBtnPrimary}
                            activeOpacity={0.7}
                            onPress={() =>
                              router.push(`/requests/${req.id}` as any)
                            }
                          >
                            <Text style={styles.actionPillPrimaryText}>View</Text>
                            <ExternalLink size={11} color="#033a7d" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* ==================================================== */}
        {/* TAB 3: INQUIRIES & MESSAGES                          */}
        {/* ==================================================== */}
        {activeTab === "inquiries" && (
          <View style={styles.tabContentContainer}>
            {/* Header with Mark all read button */}
            <View
              style={[
                styles.inquiriesHeaderCard,
                isDark && styles.inquiriesHeaderCardDark,
              ]}
            >
              <View style={{ flex: 1 }}>
                <View style={styles.inquiriesHeaderTitleRow}>
                  <MessageSquare size={16} color="#033a7d" />
                  <Text
                    style={[
                      styles.inquiriesHeaderTitle,
                      isDark && styles.inquiriesHeaderTitleDark,
                    ]}
                  >
                    Inquiries & Activity
                  </Text>
                </View>
                <Text style={styles.inquiriesHeaderSub}>
                  Direct inquiries on your equipment and system deal alerts.
                </Text>
              </View>

              {unreadCount > 0 && (
                <TouchableOpacity
                  style={styles.markAllReadBtn}
                  activeOpacity={0.7}
                  onPress={handleMarkAllNotificationsRead}
                >
                  <CheckCheck size={14} color="#033a7d" />
                  <Text style={styles.markAllReadBtnText}>Mark read</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Quick Link to Dedicated Inquiries Tab */}
            <TouchableOpacity
              style={styles.openFullDealsBanner}
              activeOpacity={0.85}
              onPress={() => router.push("/(tabs)/inquiries" as any)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.openFullDealsTitle}>
                  Open Full Deal Desk Tab
                </Text>
                <Text style={styles.openFullDealsSubtitle}>
                  View all received & sent B2B inquiries with direct dials
                </Text>
              </View>
              <ArrowRight size={18} color="#033a7d" />
            </TouchableOpacity>

            {/* Inquiries Received */}
            {receivedInquiries.length > 0 && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeaderRow}>
                  <Inbox size={15} color="#033a7d" />
                  <Text
                    style={[
                      styles.sectionHeaderText,
                      isDark && styles.sectionHeaderTextDark,
                    ]}
                  >
                    Inquiries Received ({receivedInquiries.length})
                  </Text>
                </View>

                {receivedInquiries.map((inq: any) => (
                  <View
                    key={inq.id}
                    style={[styles.inquiryCard, isDark && styles.inquiryCardDark]}
                  >
                    <View style={styles.inquiryCardTop}>
                      <Text
                        style={[
                          styles.inquiryItemTitle,
                          isDark && styles.inquiryItemTitleDark,
                        ]}
                      >
                        {inq.listing?.title || "Equipment Inquiry"}
                      </Text>
                      <View style={styles.inquiryStatusPill}>
                        <Text style={styles.inquiryStatusPillText}>
                          {inq.status}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.inquiryInquirer}>
                      From: {inq.inquirer?.name || inq.inquirer?.email || "Buyer"}
                    </Text>
                    <View style={styles.inquiryMessageQuote}>
                      <Text style={styles.inquiryMessageQuoteText} numberOfLines={2}>
                        "{inq.message}"
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Notifications Feed */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeaderRow}>
                <Bell size={15} color="#033a7d" />
                <Text
                  style={[
                    styles.sectionHeaderText,
                    isDark && styles.sectionHeaderTextDark,
                  ]}
                >
                  Activity & Verification Alerts ({notifications.length})
                </Text>
              </View>

              {notifications.length === 0 ? (
                <View
                  style={[styles.emptyCardSmall, isDark && styles.emptyCardDark]}
                >
                  <Text style={styles.emptySubtitle}>
                    No platform alerts right now.
                  </Text>
                </View>
              ) : (
                notifications.slice(0, 5).map((item: any) => {
                  const isApproved = item.type === "ENTRY_APPROVED";
                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.notifCard,
                        !item.isRead && styles.notifCardUnread,
                        isDark && styles.notifCardDark,
                      ]}
                    >
                      <View style={styles.notifIconCircle}>
                        {isApproved ? (
                          <CheckCircle2 size={16} color="#15803d" />
                        ) : (
                          <Bell size={16} color="#033a7d" />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.notifTitle,
                            isDark && styles.notifTitleDark,
                          ]}
                        >
                          {item.title}
                        </Text>
                        <Text style={styles.notifMessage}>{item.message}</Text>
                        <Text style={styles.notifDate}>
                          {new Date(item.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        )}

        {/* ==================================================== */}
        {/* TAB 4: ACCOUNT SETTINGS                              */}
        {/* ==================================================== */}
        {activeTab === "settings" && (
          <View style={styles.tabContentContainer}>
            {/* Account Profile Card */}
            <View
              style={[
                styles.settingsCard,
                isDark && styles.settingsCardDark,
              ]}
            >
              <View style={styles.settingsCardHeader}>
                <View style={styles.settingsIconCircle}>
                  <UserIcon size={18} color="#033a7d" />
                </View>
                <View>
                  <Text
                    style={[
                      styles.settingsCardTitle,
                      isDark && styles.settingsCardTitleDark,
                    ]}
                  >
                    Account Profile
                  </Text>
                  <Text style={styles.settingsCardSub}>
                    Your verified marketplace credentials
                  </Text>
                </View>
              </View>

              {/* 2x2 Grid of Profile Info */}
              <View style={styles.profileGrid}>
                <View
                  style={[
                    styles.profileGridTile,
                    isDark && styles.profileGridTileDark,
                  ]}
                >
                  <Text style={styles.profileGridLabel}>Full Name</Text>
                  <Text
                    style={[
                      styles.profileGridValue,
                      isDark && styles.profileGridValueDark,
                    ]}
                  >
                    {user.name || "Not provided"}
                  </Text>
                </View>

                <View
                  style={[
                    styles.profileGridTile,
                    isDark && styles.profileGridTileDark,
                  ]}
                >
                  <Text style={styles.profileGridLabel}>Email Address</Text>
                  <Text
                    style={[
                      styles.profileGridValue,
                      isDark && styles.profileGridValueDark,
                    ]}
                    numberOfLines={1}
                  >
                    {user.email}
                  </Text>
                </View>

                <View
                  style={[
                    styles.profileGridTile,
                    isDark && styles.profileGridTileDark,
                  ]}
                >
                  <Text style={styles.profileGridLabel}>Phone / Mobile</Text>
                  <Text
                    style={[
                      styles.profileGridValue,
                      isDark && styles.profileGridValueDark,
                    ]}
                  >
                    {user.phoneNumber || "Not provided"}
                  </Text>
                </View>

                <View
                  style={[
                    styles.profileGridTile,
                    isDark && styles.profileGridTileDark,
                  ]}
                >
                  <Text style={styles.profileGridLabel}>Company / Lab</Text>
                  <Text
                    style={[
                      styles.profileGridValue,
                      isDark && styles.profileGridValueDark,
                    ]}
                  >
                    {user.companyName || "Not provided"}
                  </Text>
                </View>
              </View>

              {/* Seller Verification Tier 1 Badge Card */}
              <View style={styles.tierVerifiedCard}>
                <View style={styles.tierVerifiedHeader}>
                  <ShieldCheck size={18} color="#15803d" />
                  <Text style={styles.tierVerifiedTitle}>
                    Tier 1 Verified Seller
                  </Text>
                  <View style={styles.tierActivePill}>
                    <Text style={styles.tierActivePillText}>ACTIVE</Text>
                  </View>
                </View>
                <Text style={styles.tierVerifiedDesc}>
                  Identity and lab authorization verified. Authorized to list
                  clinical analyzers, chromatography systems, and spare parts.
                </Text>
              </View>
            </View>

            {/* Sign Out Action Button */}
            <TouchableOpacity
              style={styles.signOutBtn}
              activeOpacity={0.8}
              onPress={handleLogout}
            >
              <LogOut size={16} color="#ba1a1a" />
              <Text style={styles.signOutBtnText}>Sign Out from LabMatrix</Text>
            </TouchableOpacity>

            {/* Danger Zone: Account Deletion */}
            <View style={styles.dangerZoneCard}>
              <View style={styles.dangerZoneHeader}>
                <Trash2 size={18} color="#dc2626" />
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
                  <Text style={styles.dangerZoneSubtitle}>
                    Permanent account deactivation & data archival
                  </Text>
                </View>
              </View>

              <Text style={styles.dangerZoneDesc}>
                Deactivating your account will immediately remove all your
                listed equipment and machine requests from the public
                marketplace. Your phone number and profile info will be cleared.
              </Text>

              <TouchableOpacity
                style={styles.deactivateBtn}
                activeOpacity={0.8}
                onPress={() => setIsDeleteModalVisible(true)}
              >
                <Trash2 size={14} color="#ffffff" />
                <Text style={styles.deactivateBtnText}>
                  Deactivate & Delete My Account
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* App Version Stamp */}
        <Text style={styles.appVersionText}>
          LabMatrix Surplus Mobile v1.0.0 • Verified Clinical Network
        </Text>
      </ScrollView>

      {/* ==================================================== */}
      {/* STATUS PICKER MODAL (AVAILABLE / SOLD / FULFILLED)    */}
      {/* ==================================================== */}
      <Modal
        visible={!!statusPickerItem}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusPickerItem(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setStatusPickerItem(null)}
        >
          <View
            style={[styles.statusPickerCard, isDark && styles.statusPickerCardDark]}
          >
            <View style={styles.statusPickerHeader}>
              <Text
                style={[
                  styles.statusPickerHeaderTitle,
                  isDark && styles.statusPickerHeaderTitleDark,
                ]}
              >
                Update Item Status
              </Text>
              <TouchableOpacity
                onPress={() => setStatusPickerItem(null)}
                style={styles.closeModalBtn}
              >
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            {statusPickerItem?.type === "listing" ? (
              <View style={styles.statusOptionsList}>
                <TouchableOpacity
                  style={[
                    styles.statusOptionItem,
                    statusPickerItem.currentStatus === "AVAILABLE" &&
                      styles.statusOptionItemActive,
                  ]}
                  onPress={() =>
                    handleUpdateListingStatus(statusPickerItem.id, "AVAILABLE")
                  }
                >
                  <View
                    style={[
                      styles.statusDotLarge,
                      { backgroundColor: "#16a34a" },
                    ]}
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.statusOptionHeading}>AVAILABLE</Text>
                    <Text style={styles.statusOptionSub}>
                      Item is ready for inquiries and sale
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusOptionItem,
                    statusPickerItem.currentStatus === "SOLD" &&
                      styles.statusOptionItemActive,
                  ]}
                  onPress={() =>
                    handleUpdateListingStatus(statusPickerItem.id, "SOLD")
                  }
                >
                  <View
                    style={[
                      styles.statusDotLarge,
                      { backgroundColor: "#dc2626" },
                    ]}
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.statusOptionHeading}>SOLD</Text>
                    <Text style={styles.statusOptionSub}>
                      Machine has been purchased or handed over
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.statusOptionsList}>
                <TouchableOpacity
                  style={[
                    styles.statusOptionItem,
                    statusPickerItem?.currentStatus === "OPEN" &&
                      styles.statusOptionItemActive,
                  ]}
                  onPress={() =>
                    handleUpdateRequirementStatus(statusPickerItem!.id, "OPEN")
                  }
                >
                  <View
                    style={[
                      styles.statusDotLarge,
                      { backgroundColor: "#16a34a" },
                    ]}
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.statusOptionHeading}>OPEN (Looking)</Text>
                    <Text style={styles.statusOptionSub}>
                      Actively seeking quotes from suppliers
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusOptionItem,
                    statusPickerItem?.currentStatus === "FULFILLED" &&
                      styles.statusOptionItemActive,
                  ]}
                  onPress={() =>
                    handleUpdateRequirementStatus(
                      statusPickerItem!.id,
                      "FULFILLED"
                    )
                  }
                >
                  <View
                    style={[
                      styles.statusDotLarge,
                      { backgroundColor: "#2563eb" },
                    ]}
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.statusOptionHeading}>
                      FULFILLED (Purchased)
                    </Text>
                    <Text style={styles.statusOptionSub}>
                      Instrument requirement satisfied
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ==================================================== */}
      {/* ACCOUNT DELETION CONFIRMATION MODAL                  */}
      {/* ==================================================== */}
      <Modal
        visible={isDeleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setIsDeleteModalVisible(false);
          setDeletePassword("");
        }}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.deleteModalCard,
              isDark && styles.deleteModalCardDark,
            ]}
          >
            <View style={styles.deleteModalHeader}>
              <View style={styles.deleteWarningIcon}>
                <AlertTriangle size={24} color="#ba1a1a" />
              </View>
              <TouchableOpacity
                onPress={() => {
                  setIsDeleteModalVisible(false);
                  setDeletePassword("");
                }}
                style={styles.closeModalBtn}
              >
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text
              style={[
                styles.deleteModalTitle,
                isDark && styles.deleteModalTitleDark,
              ]}
            >
              Confirm Account Deactivation
            </Text>
            <Text style={styles.deleteModalDesc}>
              This action is permanent. All your listed equipment (
              {listings.length}) and sourcing requests ({requirements.length})
              will be deactivated and removed from public view.
            </Text>

            <View style={styles.deleteInputWrapper}>
              <Text style={styles.deleteInputLabel}>
                Type <Text style={{ fontWeight: "700", color: "#ba1a1a" }}>DELETE</Text> to confirm:
              </Text>
              <TextInput
                value={deleteConfirmation}
                onChangeText={setDeleteConfirmation}
                placeholder="DELETE"
                autoCapitalize="characters"
                autoCorrect={false}
                style={[
                  styles.deleteTextInput,
                  isDark && styles.deleteTextInputDark,
                ]}
              />
            </View>

            {requiresPassword && (
              <View style={styles.deleteInputWrapper}>
                <Text style={styles.deleteInputLabel}>Enter your account password:</Text>
                <TextInput
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                  placeholder="Password"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[
                    styles.deleteTextInput,
                    isDark && styles.deleteTextInputDark,
                  ]}
                />
              </View>
            )}

            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                style={styles.cancelDeleteBtn}
                onPress={() => {
                  setIsDeleteModalVisible(false);
                  setDeleteConfirmation("");
                  setDeletePassword("");
                }}
              >
                <Text style={styles.cancelDeleteBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmDeleteBtn,
                  (deleteConfirmation.trim().toUpperCase() !== "DELETE" ||
                    (requiresPassword && !deletePassword)) && {
                    opacity: 0.5,
                  },
                ]}
                disabled={
                  isDeleting ||
                  deleteConfirmation.trim().toUpperCase() !== "DELETE" ||
                  (requiresPassword && !deletePassword)
                }
                onPress={handleDeleteAccount}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Trash2 size={14} color="#ffffff" />
                    <Text style={styles.confirmDeleteBtnText}>
                      Permanently Deactivate
                    </Text>
                  </>
                )}
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
    backgroundColor: "#f8fafc",
  },
  safeAreaDark: {
    backgroundColor: "#0b1320",
  },

  // Top Bar matching mockup
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  topBarDark: {
    backgroundColor: "#0f172a",
    borderBottomColor: "#1e293b",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoImg: {
    width: 130,
    height: 32,
  },
  topRightIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  headerNotificationDot: {
    position: "absolute",
    top: 7,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#ef4444",
  },
  headerAvatarPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#011936",
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#ffffff",
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // 1. Profile Hero Card
  profileHeroCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  profileHeroCardDark: {
    backgroundColor: "#131d2e",
    borderColor: "#1e293b",
  },
  profileTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  heroInitialsAvatar: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: "#011936",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#011936",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  heroInitialsText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  heroTextCol: {
    flex: 1,
    marginLeft: 14,
  },
  heroNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  heroName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  heroNameDark: {
    color: "#f8fafc",
  },
  heroSignOutPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  heroSignOutText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#dc2626",
  },
  labmatrixVerifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff5fb",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 10,
    gap: 3,
  },
  labmatrixVerifiedText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#033a7d",
  },
  heroMetaLine: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  heroMetaText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },

  // 3 Quick Action Buttons
  heroActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  heroBtnGold: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fbc634",
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
    gap: 4,
    shadowColor: "#fbc634",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  heroBtnGoldText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#011936",
  },
  heroBtnWhite: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 4,
  },
  heroBtnWhiteText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0f172a",
  },
  heroBtnNavy: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#033a7d",
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 4,
  },
  heroBtnNavyText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#ffffff",
  },

  // Admin Shortcut Button
  adminConsoleShortcut: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#011936",
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#fbc634",
  },
  adminConsoleLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  adminConsoleTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff",
  },
  adminConsoleSub: {
    fontSize: 10.5,
    color: "#cbd5e1",
    marginTop: 1,
  },

  // Full Privacy Banner
  privacyBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#01142f",
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
    gap: 10,
  },
  privacyIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(251, 198, 52, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  privacyHeader: {
    fontSize: 11,
    fontWeight: "800",
    color: "#fbc634",
    letterSpacing: 0.5,
  },
  privacyDesc: {
    fontSize: 11,
    color: "#cbd5e1",
    lineHeight: 16,
    marginTop: 2,
  },

  // Tabs Horizontal Scroll
  tabsScrollRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 14,
  },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  tabPillActive: {
    backgroundColor: "#033a7d",
    borderColor: "#033a7d",
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  tabPillTextActive: {
    color: "#ffffff",
  },
  tabBadgeRed: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    marginLeft: 5,
  },
  tabBadgeRedText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#ffffff",
  },

  tabContentContainer: {
    marginTop: 2,
  },
  tabLoadingCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  tabLoadingText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },

  // Cards List
  cardsList: {
    gap: 12,
  },
  itemCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  itemCardDark: {
    backgroundColor: "#131d2e",
    borderColor: "#1e293b",
  },
  itemCardTopBadges: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  itemBadgesLeft: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  categoryBadge: {
    backgroundColor: "#eff5fb",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#033a7d",
  },
  newInstrumentBadge: {
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  newInstrumentText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#065f46",
  },
  sparePartBadge: {
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  sparePartText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#92400e",
  },
  qtyBadge: {
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#fde68a",
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  qtyBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#92400e",
  },
  approvedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    gap: 4,
  },
  approvedText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#15803d",
  },
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    gap: 4,
  },
  pendingText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#b45309",
  },
  postedDateText: {
    fontSize: 11,
    color: "#94a3b8",
  },

  itemTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
    lineHeight: 20,
    marginBottom: 4,
  },
  itemTitleDark: {
    color: "#f8fafc",
  },
  itemDescription: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 17,
  },
  pendingReviewNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fef3c7",
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
  pendingReviewNoticeText: {
    fontSize: 11,
    color: "#92400e",
    flex: 1,
    lineHeight: 15,
  },

  itemCardDivider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 12,
  },
  priceAndActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  priceLabel: {
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  priceValue: {
    fontSize: 13.5,
    fontWeight: "900",
    color: "#0f172a",
    marginTop: 1,
  },
  priceValueDark: {
    color: "#f8fafc",
  },
  actionsBtnGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  actionPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  actionPillBtnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff5fb",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  actionPillPrimaryText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#033a7d",
  },

  statusToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f8fafc",
  },
  statusToggleRowInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusToggleLabel: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#64748b",
  },
  statusPickerTrigger: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
  },
  statusPickerTriggerAvailable: {
    backgroundColor: "#ecfdf5",
    borderColor: "#a7f3d0",
  },
  statusPickerTriggerSold: {
    backgroundColor: "#f1f5f9",
    borderColor: "#e2e8f0",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPickerText: {
    fontSize: 11,
    fontWeight: "800",
  },
  statusPickerTextAvailable: {
    color: "#166534",
  },
  statusPickerTextSold: {
    color: "#475569",
  },

  // Empty State Card
  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 28,
    alignItems: "center",
    textAlign: "center",
  },
  emptyCardDark: {
    backgroundColor: "#131d2e",
    borderColor: "#1e293b",
  },
  emptyCardSmall: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 18,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 12,
    textAlign: "center",
  },
  emptyTitleDark: {
    color: "#f8fafc",
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 6,
    textAlign: "center",
    lineHeight: 18,
  },
  emptyActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fbc634",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 16,
    gap: 5,
  },
  emptyActionBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#011936",
  },

  // Inquiries Tab Styles
  inquiriesHeaderCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 10,
  },
  inquiriesHeaderCardDark: {
    backgroundColor: "#131d2e",
    borderColor: "#1e293b",
  },
  inquiriesHeaderTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  inquiriesHeaderTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  inquiriesHeaderTitleDark: {
    color: "#f8fafc",
  },
  inquiriesHeaderSub: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  markAllReadBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff5fb",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  markAllReadBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#033a7d",
  },

  openFullDealsBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#eff5fb",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  openFullDealsTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#033a7d",
  },
  openFullDealsSubtitle: {
    fontSize: 11,
    color: "#475569",
    marginTop: 2,
  },

  sectionBlock: {
    marginTop: 10,
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
  },
  sectionHeaderTextDark: {
    color: "#f8fafc",
  },

  inquiryCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  inquiryCardDark: {
    backgroundColor: "#131d2e",
    borderColor: "#1e293b",
  },
  inquiryCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inquiryItemTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
    flex: 1,
  },
  inquiryItemTitleDark: {
    color: "#f8fafc",
  },
  inquiryStatusPill: {
    backgroundColor: "#eff5fb",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  inquiryStatusPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#033a7d",
  },
  inquiryInquirer: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 3,
  },
  inquiryMessageQuote: {
    backgroundColor: "#f8fafc",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    marginTop: 6,
  },
  inquiryMessageQuoteText: {
    fontSize: 11.5,
    fontStyle: "italic",
    color: "#334155",
  },

  // Notification Cards
  notifCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 10,
  },
  notifCardDark: {
    backgroundColor: "#131d2e",
    borderColor: "#1e293b",
  },
  notifCardUnread: {
    backgroundColor: "#f0f7ff",
    borderColor: "#bfdbfe",
  },
  notifIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  notifTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0f172a",
  },
  notifTitleDark: {
    color: "#f8fafc",
  },
  notifMessage: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
    lineHeight: 15,
  },
  notifDate: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 4,
  },

  // Settings Tab Styles
  settingsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  settingsCardDark: {
    backgroundColor: "#131d2e",
    borderColor: "#1e293b",
  },
  settingsCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    marginBottom: 14,
  },
  settingsIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#eff5fb",
    alignItems: "center",
    justifyContent: "center",
  },
  settingsCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
  },
  settingsCardTitleDark: {
    color: "#f8fafc",
  },
  settingsCardSub: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 1,
  },
  profileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  profileGridTile: {
    width: "48%",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  profileGridTileDark: {
    backgroundColor: "#0b1320",
    borderColor: "#1e293b",
  },
  profileGridLabel: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  profileGridValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 4,
  },
  profileGridValueDark: {
    color: "#f8fafc",
  },

  tierVerifiedCard: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
  },
  tierVerifiedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tierVerifiedTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#166534",
    flex: 1,
  },
  tierActivePill: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tierActivePillText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#15803d",
  },
  tierVerifiedDesc: {
    fontSize: 11,
    color: "#166534",
    lineHeight: 16,
    marginTop: 4,
  },

  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 14,
    gap: 6,
  },
  signOutBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ba1a1a",
  },

  dangerZoneCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#fecaca",
    padding: 16,
    marginTop: 14,
  },
  dangerZoneHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  dangerZoneTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#991b1b",
  },
  dangerZoneSubtitle: {
    fontSize: 11,
    color: "#dc2626",
    marginTop: 1,
  },
  dangerZoneDesc: {
    fontSize: 11,
    color: "#64748b",
    lineHeight: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  deactivateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dc2626",
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
  },
  deactivateBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#ffffff",
  },

  appVersionText: {
    textAlign: "center",
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 24,
  },

  // Modal Overlays
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  statusPickerCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  statusPickerCardDark: {
    backgroundColor: "#1e293b",
  },
  statusPickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  statusPickerHeaderTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
  },
  statusPickerHeaderTitleDark: {
    color: "#f8fafc",
  },
  closeModalBtn: {
    padding: 4,
  },
  statusOptionsList: {
    gap: 10,
  },
  statusOptionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  statusOptionItemActive: {
    borderColor: "#033a7d",
    backgroundColor: "#eff5fb",
  },
  statusDotLarge: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusOptionHeading: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
  },
  statusOptionSub: {
    fontSize: 10.5,
    color: "#64748b",
    marginTop: 1,
  },

  // Delete Modal
  deleteModalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 22,
  },
  deleteModalCardDark: {
    backgroundColor: "#1e293b",
  },
  deleteModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  deleteWarningIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteModalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 6,
  },
  deleteModalTitleDark: {
    color: "#f8fafc",
  },
  deleteModalDesc: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 17,
    marginBottom: 14,
  },
  deleteInputWrapper: {
    marginBottom: 16,
  },
  deleteInputLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
  },
  deleteTextInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    fontFamily: "monospace",
    color: "#0f172a",
  },
  deleteTextInputDark: {
    backgroundColor: "#0b1320",
    borderColor: "#334155",
    color: "#f8fafc",
  },
  deleteModalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  cancelDeleteBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
  },
  cancelDeleteBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  confirmDeleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#dc2626",
    gap: 5,
  },
  confirmDeleteBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#ffffff",
  },

  // Logged-out Screen Styles
  loggedOutScroll: {
    padding: 20,
    paddingBottom: 40,
  },
  loggedOutHero: {
    alignItems: "center",
    marginVertical: 24,
  },
  loggedOutIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#eff5fb",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  loggedOutTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 8,
  },
  loggedOutTitleDark: {
    color: "#f8fafc",
  },
  loggedOutSubtitle: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 10,
  },
  benefitsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 16,
    marginBottom: 24,
  },
  benefitsCardDark: {
    backgroundColor: "#131d2e",
    borderColor: "#1e293b",
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  benefitHeading: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 2,
  },
  benefitHeadingDark: {
    color: "#f8fafc",
  },
  benefitDesc: {
    fontSize: 11.5,
    color: "#64748b",
    lineHeight: 16,
  },
  loggedOutActions: {
    gap: 10,
  },
  primaryLoginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#033a7d",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: "#033a7d",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryLoginBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#ffffff",
  },
  secondaryRegisterBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#033a7d",
    paddingVertical: 13,
    borderRadius: 14,
    gap: 6,
  },
  secondaryRegisterBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#033a7d",
  },
  supportFooter: {
    marginTop: 26,
    alignItems: "center",
  },
  supportFooterText: {
    fontSize: 11.5,
    color: "#64748b",
    textAlign: "center",
  },
});
