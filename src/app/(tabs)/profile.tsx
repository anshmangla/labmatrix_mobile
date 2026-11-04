import React, { useState, useEffect, useMemo } from "react";
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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import UserIcon from "lucide-react-native/icons/user";
import Phone from "lucide-react-native/icons/phone";
import Building2 from "lucide-react-native/icons/building-complex";
import ShieldCheck from "lucide-react-native/icons/shield-check";
import LogOut from "lucide-react-native/icons/log-out";
import Trash2 from "lucide-react-native/icons/trash";
import LogIn from "lucide-react-native/icons/log-in";
import Package from "lucide-react-native/icons/package";
import CheckCircle2 from "lucide-react-native/icons/circle-check";
import Clock from "lucide-react-native/icons/clock";
import Pencil from "lucide-react-native/icons/pencil";
import Copy from "lucide-react-native/icons/copy";
import ExternalLink from "lucide-react-native/icons/external-link";
import ArrowRight from "lucide-react-native/icons/arrow-right";
import X from "lucide-react-native/icons/x";
import Settings from "lucide-react-native/icons/settings";
import Plus from "lucide-react-native/icons/plus";
import FileQuestion from "lucide-react-native/icons/file-question-mark";
import Heart from "lucide-react-native/icons/heart";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { LoadErrorState } from "@/components/LoadErrorState";
import { EscrowPolicyModal } from "@/components/EscrowPolicyModal";
import { getSavedListingIds, toggleSavedListingId } from "@/lib/storage";

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

function getListingThumbnail(item: any): string | null {
  if (Array.isArray(item.images) && item.images.length > 0) {
    const primary = item.images.find(
      (img: any) => typeof img === "object" && img.isPrimary
    );
    if (primary?.url) return primary.url;
    const first = item.images[0];
    if (typeof first === "string") return first;
    if (first?.url) return first.url;
  }
  return null;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user, isAuthenticated, logout, refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  // Active Tab: "listings" | "requests" | "saved"
  const [activeTab, setActiveTab] = useState<"listings" | "requests" | "saved">(
    "listings"
  );
  const [listingFilter, setListingFilter] = useState<"ALL" | "LIVE" | "IN_REVIEW">("ALL");

  // Sync incoming route param
  useEffect(() => {
    if (tab === "requests") setActiveTab("requests");
    else if (tab === "saved") setActiveTab("saved");
    else if (tab === "listings") setActiveTab("listings");
    else if (tab === "settings") setSettingsModalVisible(true);
    else if (tab === "inquiries") router.push("/(tabs)/inquiries" as any);
  }, [tab, router]);

  // Modals
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [escrowModalVisible, setEscrowModalVisible] = useState(false);

  // Manage Bottom Sheets
  const [manageListing, setManageListing] = useState<any | null>(null);
  const [manageRequest, setManageRequest] = useState<any | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Account Settings / Editing Form State
  const [editName, setEditName] = useState(user?.name || "");
  const [editPhone, setEditPhone] = useState(user?.phoneNumber || "");
  const [editCompany, setEditCompany] = useState(user?.companyName || "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Self-deletion modal state
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Saved items state
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [savedListings, setSavedListings] = useState<any[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);

  // Fetch user's listings and requirements
  const {
    data: myItems,
    isLoading: isLoadingItems,
    isError: isItemsError,
    refetch: refetchMyItems,
  } = useQuery({
    queryKey: ["myItems"],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await api.get("/api/user/my-items");
      return res.data as { listings: any[]; requirements: any[] };
    },
  });

  // Account profile for password info
  const { data: accountProfile } = useQuery({
    queryKey: ["userProfile"],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await api.get("/api/user/profile");
      return res.data?.user as { hasPassword?: boolean } | undefined;
    },
  });
  const requiresPassword = accountProfile?.hasPassword === true;

  // Notifications
  const { data: notificationsData } = useQuery({
    queryKey: ["notifications"],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await api.get("/api/notifications");
      return res.data as { notifications: any[]; unreadCount: number };
    },
  });

  // Load saved listing IDs
  const loadSavedItems = async () => {
    try {
      setIsLoadingSaved(true);
      const ids = await getSavedListingIds();
      setSavedIds(ids);
      if (ids.length === 0) {
        setSavedListings([]);
        return;
      }
      const results = await Promise.allSettled(
        ids.map((id) => api.get(`/api/listings/${encodeURIComponent(id)}`))
      );
      const loaded: any[] = [];
      results.forEach((r) => {
        if (r.status === "fulfilled" && r.value.data?.listing) {
          loaded.push(r.value.data.listing);
        }
      });
      setSavedListings(loaded);
    } catch (err) {
      console.warn("Failed to load saved items", err);
    } finally {
      setIsLoadingSaved(false);
    }
  };

  useEffect(() => {
    // Load count on mount
    getSavedListingIds().then(setSavedIds).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === "saved") {
      loadSavedItems();
    }
  }, [activeTab]);

  useEffect(() => {
    if (user) {
      setEditName(user.name || "");
      setEditPhone(user.phoneNumber || "");
      setEditCompany(user.companyName || "");
    }
  }, [user]);

  const handleRemoveSaved = async (id: string) => {
    await toggleSavedListingId(id);
    setSavedIds((prev) => prev.filter((i) => i !== id));
    setSavedListings((prev) => prev.filter((l) => l.id !== id));
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
            setSettingsModalVisible(false);
            await logout();
          },
        },
      ]
    );
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      await api.patch("/api/user/profile", {
        name: editName,
        phoneNumber: editPhone,
        companyName: editCompany,
      });
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      Alert.alert("Profile Updated", "Your account details have been saved.");
    } catch (err: any) {
      Alert.alert(
        "Update Failed",
        err.response?.data?.error || "Could not update your profile. Please try again."
      );
    } finally {
      setIsSavingProfile(false);
    }
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
      setSettingsModalVisible(false);
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
      if (manageListing?.id === id) {
        setManageListing({ ...manageListing, status: newStatus });
      }
      Alert.alert("Status Updated", `Equipment status changed to ${newStatus}.`);
    } catch (err: any) {
      Alert.alert("Update Failed", err.response?.data?.error || "Failed to update listing status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteListing = (id: string) => {
    Alert.alert(
      "Delete Listing",
      "Are you sure you want to permanently delete this listing? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setUpdatingId(id);
            try {
              await api.delete(`/api/listings/${encodeURIComponent(id)}`);
              queryClient.setQueryData(["myItems"], (old: any) => {
                if (!old?.listings) return old;
                return {
                  ...old,
                  listings: old.listings.filter((l: any) => l.id !== id),
                };
              });
              setManageListing(null);
              Alert.alert("Listing Deleted", "Your listing has been removed from LabMatrix.");
            } catch (err: any) {
              Alert.alert("Delete Failed", err.response?.data?.error || "Could not delete listing.");
            } finally {
              setUpdatingId(null);
            }
          },
        },
      ]
    );
  };

  const handleUpdateRequirementStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
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
      if (manageRequest?.id === id) {
        setManageRequest({ ...manageRequest, status: newStatus });
      }
      Alert.alert("Status Updated", `Requirement status changed to ${newStatus}.`);
    } catch (err: any) {
      Alert.alert("Update Failed", err.response?.data?.error || "Failed to update requirement status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteRequirement = (id: string) => {
    Alert.alert(
      "Delete Request",
      "Are you sure you want to permanently delete this sourcing request?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setUpdatingId(id);
            try {
              await api.delete(`/api/requirements/${encodeURIComponent(id)}`);
              queryClient.setQueryData(["myItems"], (old: any) => {
                if (!old?.requirements) return old;
                return {
                  ...old,
                  requirements: old.requirements.filter((r: any) => r.id !== id),
                };
              });
              setManageRequest(null);
              Alert.alert("Request Deleted", "Your sourcing request has been removed.");
            } catch (err: any) {
              Alert.alert("Delete Failed", err.response?.data?.error || "Could not delete request.");
            } finally {
              setUpdatingId(null);
            }
          },
        },
      ]
    );
  };

  const handleCallSupport = () => {
    Linking.openURL("tel:+917303040804").catch(() => {
      Alert.alert("Support Desk", "Helpline: +91 73030 40804\nAvailable Mon-Sat 9AM - 7PM IST");
    });
  };

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name && name.trim().length > 0) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
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

        <View style={[styles.topBar, isDark && styles.topBarDark]}>
          <Image
            source={require("@/assets/images/logo.png")}
            style={styles.logoImg}
            resizeMode="contain"
          />
        </View>

        <ScrollView contentContainerStyle={styles.loggedOutScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.loggedOutHero}>
            <View style={styles.loggedOutIconCircle}>
              <UserIcon size={38} color="#033a7d" />
            </View>
            <Text style={[styles.loggedOutTitle, isDark && styles.loggedOutTitleDark]}>
              Sign In to Your Laboratory Profile
            </Text>
            <Text style={styles.loggedOutSubtitle}>
              Access your listed equipment, track inquiries, manage buyer sourcing requests, and receive deal desk quotes.
            </Text>
          </View>

          <View style={[styles.benefitsCard, isDark && styles.benefitsCardDark]}>
            <View style={styles.benefitRow}>
              <CheckCircle2 size={18} color="#15803d" style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.benefitHeading, isDark && styles.benefitHeadingDark]}>
                  List Surplus Instruments & Spares
                </Text>
                <Text style={styles.benefitDesc}>
                  Post pre-owned HPLC, GC-MS, spectrophotometers, or spare parts with zero listing fees.
                </Text>
              </View>
            </View>

            <View style={styles.benefitRow}>
              <CheckCircle2 size={18} color="#15803d" style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.benefitHeading, isDark && styles.benefitHeadingDark]}>
                  Verified Sourcing Network
                </Text>
                <Text style={styles.benefitDesc}>
                  Post wanted instrument requirements and receive quotes from audited laboratories.
                </Text>
              </View>
            </View>

            <View style={styles.benefitRow}>
              <CheckCircle2 size={18} color="#15803d" style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.benefitHeading, isDark && styles.benefitHeadingDark]}>
                  Secure Escrow & Physical Audit
                </Text>
                <Text style={styles.benefitDesc}>
                  Every instrument undergoes diagnostic inspection prior to handover and dispatch.
                </Text>
              </View>
            </View>
          </View>

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
              <Text style={styles.secondaryRegisterBtnText}>Register Facility Account</Text>
              <ArrowRight size={16} color="#033a7d" />
            </TouchableOpacity>
          </View>

          <View style={styles.supportFooter}>
            <Text style={styles.supportFooterText}>
              Need assistance? Call Engineering Desk:{" "}
              <Text style={{ fontWeight: "700", color: "#033a7d" }} onPress={handleCallSupport}>
                +91 73030 40804
              </Text>
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ==========================================
  // 2. LOGGED-IN DIRECTION A DASHBOARD
  // ==========================================
  const listings = myItems?.listings || [];
  const requirements = myItems?.requirements || [];

  const liveCount = listings.filter((l: any) => l.isApproved && l.status === "AVAILABLE").length;
  const inReviewCount = listings.filter((l: any) => !l.isApproved).length;
  const inquiriesCount = listings.reduce((sum: number, l: any) => sum + (l.inquiryCount || 0), 0);

  const userInitials = getInitials(user.name, user.email);

  // Filtered listings for display
  const displayedListings = useMemo(() => {
    if (listingFilter === "LIVE") {
      return listings.filter((l: any) => l.isApproved && l.status === "AVAILABLE");
    }
    if (listingFilter === "IN_REVIEW") {
      return listings.filter((l: any) => !l.isApproved);
    }
    return listings;
  }, [listings, listingFilter]);

  return (
    <SafeAreaView edges={["top"]} style={[styles.safeArea, isDark && styles.safeAreaDark]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header: Title "Profile" + Settings Gear ⚙ */}
      <View style={[styles.topBar, isDark && styles.topBarDark]}>
        <Text style={[styles.headerTitle, isDark && styles.headerTitleDark]}>Profile</Text>

        <TouchableOpacity
          style={styles.settingsIconBtn}
          activeOpacity={0.7}
          onPress={() => setSettingsModalVisible(true)}
          accessibilityLabel="Account Settings"
        >
          <Settings size={18} color="#475569" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Card: Initials Avatar, Name, Company */}
        <View style={[styles.heroCard, isDark && styles.heroCardDark]}>
          <View style={styles.heroRow}>
            <View style={styles.avatarSquircle}>
              <Text style={styles.avatarText}>{userInitials}</Text>
            </View>

            <View style={styles.heroTextCol}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <Text style={[styles.userName, isDark && styles.userNameDark]} numberOfLines={1}>
                  {user.name || "Laboratory Representative"}
                </Text>
                <View style={styles.verifiedBadge}>
                  <CheckCircle2 size={11} color="#033a7d" />
                  <Text style={styles.verifiedText}>Labmatrix</Text>
                </View>
              </View>

              <Text style={styles.userCompany} numberOfLines={1}>
                {user.companyName || user.email || "Analytical Facility"}
              </Text>
            </View>
          </View>

          {/* Tappable Stats Row (3 tiles) */}
          <View style={styles.statsRow}>
            {/* Live */}
            <TouchableOpacity
              style={[
                styles.statTile,
                activeTab === "listings" && listingFilter === "LIVE" && styles.statTileActive,
              ]}
              activeOpacity={0.75}
              onPress={() => {
                setActiveTab("listings");
                setListingFilter(listingFilter === "LIVE" ? "ALL" : "LIVE");
              }}
            >
              <Text style={[styles.statValue, { color: "#002555" }]}>{liveCount}</Text>
              <Text style={styles.statLabel}>Live</Text>
            </TouchableOpacity>

            {/* In Review */}
            <TouchableOpacity
              style={[
                styles.statTile,
                activeTab === "listings" && listingFilter === "IN_REVIEW" && styles.statTileActive,
              ]}
              activeOpacity={0.75}
              onPress={() => {
                setActiveTab("listings");
                setListingFilter(listingFilter === "IN_REVIEW" ? "ALL" : "IN_REVIEW");
              }}
            >
              <Text style={[styles.statValue, { color: "#b45309" }]}>{inReviewCount}</Text>
              <Text style={styles.statLabel}>In review</Text>
            </TouchableOpacity>

            {/* Inquiries */}
            <TouchableOpacity
              style={styles.statTile}
              activeOpacity={0.75}
              onPress={() => router.push("/(tabs)/inquiries" as any)}
            >
              <Text style={[styles.statValue, { color: "#002555" }]}>{inquiriesCount}</Text>
              <Text style={styles.statLabel}>Inquiries</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Action Buttons Row */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.listEquipBtn}
              activeOpacity={0.85}
              onPress={() => router.push("/(tabs)/sell" as any)}
            >
              <Text style={styles.listEquipBtnText}>+ List equipment</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.postReqBtn}
              activeOpacity={0.85}
              onPress={() => router.push("/(tabs)/requests?openPost=true" as any)}
            >
              <Text style={styles.postReqBtnText}>Post requirement</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Segmented Switcher: Listings · X | Requests · Y | Saved · Z */}
        <View style={styles.segmentBar}>
          <TouchableOpacity
            style={[styles.segmentTab, activeTab === "listings" && styles.segmentTabActive]}
            onPress={() => {
              setActiveTab("listings");
              setListingFilter("ALL");
            }}
          >
            <Text
              style={[
                styles.segmentTabText,
                activeTab === "listings" && styles.segmentTabTextActive,
              ]}
            >
              Listings · {listings.length}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentTab, activeTab === "requests" && styles.segmentTabActive]}
            onPress={() => setActiveTab("requests")}
          >
            <Text
              style={[
                styles.segmentTabText,
                activeTab === "requests" && styles.segmentTabTextActive,
              ]}
            >
              Requests · {requirements.length}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentTab, activeTab === "saved" && styles.segmentTabActive]}
            onPress={() => setActiveTab("saved")}
          >
            <Text
              style={[
                styles.segmentTabText,
                activeTab === "saved" && styles.segmentTabTextActive,
              ]}
            >
              Saved · {savedIds.length}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Active Filter Indicator for Listings */}
        {activeTab === "listings" && listingFilter !== "ALL" && (
          <View style={styles.activeFilterPillRow}>
            <Text style={styles.activeFilterPillText}>
              Showing {listingFilter === "LIVE" ? "Live" : "In Review"} ({displayedListings.length})
            </Text>
            <TouchableOpacity onPress={() => setListingFilter("ALL")}>
              <Text style={styles.resetFilterText}>Show All</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ==================================================== */}
        {/* TAB 1: LISTINGS                                      */}
        {/* ==================================================== */}
        {activeTab === "listings" && (
          <View style={styles.feedContainer}>
            {isLoadingItems ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#033a7d" />
                <Text style={styles.loadingText}>Loading equipment...</Text>
              </View>
            ) : isItemsError ? (
              <LoadErrorState message="Could not load your listings." onRetry={() => refetchMyItems()} />
            ) : displayedListings.length === 0 ? (
              <View style={[styles.emptyBox, isDark && styles.emptyBoxDark]}>
                <Package size={34} color="#94a3b8" />
                <Text style={[styles.emptyTitle, isDark && styles.emptyTitleDark]}>
                  {listingFilter === "ALL" ? "No equipment listed yet" : "No matching equipment"}
                </Text>
                <Text style={styles.emptyDesc}>
                  List surplus HPLC, GC-MS, or spare parts to connect with verified labs across India.
                </Text>
                <TouchableOpacity
                  style={styles.emptyAddBtn}
                  onPress={() => router.push("/(tabs)/sell" as any)}
                >
                  <Plus size={15} color="#002555" />
                  <Text style={styles.emptyAddBtnText}>List Equipment</Text>
                </TouchableOpacity>
              </View>
            ) : (
              displayedListings.map((item: any) => {
                const thumb = getListingThumbnail(item);
                const isLive = item.isApproved && item.status === "AVAILABLE";
                const isSold = item.status === "SOLD";

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.listingRow, isDark && styles.listingRowDark]}
                    activeOpacity={0.75}
                    onPress={() => setManageListing(item)}
                  >
                    {/* 48x48 Thumbnail */}
                    {thumb ? (
                      <Image source={{ uri: thumb }} style={styles.listingThumb} resizeMode="cover" />
                    ) : (
                      <View style={styles.listingThumbPlaceholder}>
                        <Package size={20} color="#94a3b8" />
                      </View>
                    )}

                    {/* Content Column */}
                    <View style={styles.listingContentCol}>
                      <Text
                        style={[styles.listingTitle, isDark && styles.listingTitleDark]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>

                      <View style={styles.listingMetaRow}>
                        {isSold ? (
                          <Text style={[styles.statusDotText, { color: "#64748b" }]}>● Sold</Text>
                        ) : isLive ? (
                          <Text style={[styles.statusDotText, { color: "#15803d" }]}>● Live</Text>
                        ) : (
                          <Text style={[styles.statusDotText, { color: "#b45309" }]}>● In review</Text>
                        )}

                        {item.inquiryCount > 0 ? (
                          <Text style={styles.inquiryBadgeText}>
                            · {item.inquiryCount} {item.inquiryCount === 1 ? "inquiry" : "inquiries"}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    {/* Chevron */}
                    <ChevronRight size={18} color="#94a3b8" />
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {/* ==================================================== */}
        {/* TAB 2: REQUESTS                                      */}
        {/* ==================================================== */}
        {activeTab === "requests" && (
          <View style={styles.feedContainer}>
            {isLoadingItems ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#033a7d" />
                <Text style={styles.loadingText}>Loading requests...</Text>
              </View>
            ) : isItemsError ? (
              <LoadErrorState message="Could not load your requests." onRetry={() => refetchMyItems()} />
            ) : requirements.length === 0 ? (
              <View style={[styles.emptyBox, isDark && styles.emptyBoxDark]}>
                <FileQuestion size={34} color="#94a3b8" />
                <Text style={[styles.emptyTitle, isDark && styles.emptyTitleDark]}>
                  No buyer requests posted
                </Text>
                <Text style={styles.emptyDesc}>
                  Looking for a specific instrument or spare part? Post your requirement to broadcast to suppliers.
                </Text>
                <TouchableOpacity
                  style={styles.emptyAddBtn}
                  onPress={() => router.push("/(tabs)/requests?openPost=true" as any)}
                >
                  <Plus size={15} color="#002555" />
                  <Text style={styles.emptyAddBtnText}>Post Requirement</Text>
                </TouchableOpacity>
              </View>
            ) : (
              requirements.map((req: any) => {
                const isFulfilled = req.status === "FULFILLED";
                const isSpare = req.itemType === "SPARE_PART";

                return (
                  <TouchableOpacity
                    key={req.id}
                    style={[styles.listingRow, isDark && styles.listingRowDark]}
                    activeOpacity={0.75}
                    onPress={() => setManageRequest(req)}
                  >
                    <View style={styles.requestIconBox}>
                      <FileQuestion size={20} color="#033a7d" />
                    </View>

                    <View style={styles.listingContentCol}>
                      <Text
                        style={[styles.listingTitle, isDark && styles.listingTitleDark]}
                        numberOfLines={1}
                      >
                        {req.title}
                      </Text>

                      <View style={styles.listingMetaRow}>
                        <Text
                          style={[
                            styles.statusDotText,
                            { color: isFulfilled ? "#64748b" : "#15803d" },
                          ]}
                        >
                          {isFulfilled ? "● Fulfilled" : "● Open"}
                        </Text>
                        <Text style={styles.inquiryBadgeText}>
                          · {isSpare ? "Spare part" : req.category} · {formatRelativeTime(req.createdAt)}
                        </Text>
                      </View>
                    </View>

                    <ChevronRight size={18} color="#94a3b8" />
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {/* ==================================================== */}
        {/* TAB 3: SAVED                                         */}
        {/* ==================================================== */}
        {activeTab === "saved" && (
          <View style={styles.feedContainer}>
            {isLoadingSaved ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#033a7d" />
                <Text style={styles.loadingText}>Loading saved instruments...</Text>
              </View>
            ) : savedListings.length === 0 ? (
              <View style={[styles.emptyBox, isDark && styles.emptyBoxDark]}>
                <Heart size={34} color="#94a3b8" />
                <Text style={[styles.emptyTitle, isDark && styles.emptyTitleDark]}>
                  No saved instruments yet
                </Text>
                <Text style={styles.emptyDesc}>
                  Tap the heart icon on any listing in the marketplace to shortlist equipment for review.
                </Text>
                <TouchableOpacity
                  style={styles.emptyAddBtn}
                  onPress={() => router.push("/(tabs)/" as any)}
                >
                  <Text style={styles.emptyAddBtnText}>Browse Marketplace</Text>
                </TouchableOpacity>
              </View>
            ) : (
              savedListings.map((item: any) => {
                const thumb = getListingThumbnail(item);
                const priceFormatted = item.minPrice
                  ? `₹${Number(item.minPrice).toLocaleString("en-IN")}`
                  : "Price on request";

                return (
                  <View
                    key={item.id}
                    style={[styles.listingRow, isDark && styles.listingRowDark]}
                  >
                    <TouchableOpacity
                      style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }}
                      activeOpacity={0.75}
                      onPress={() => router.push(`/listing/${item.id}` as any)}
                    >
                      {thumb ? (
                        <Image source={{ uri: thumb }} style={styles.listingThumb} resizeMode="cover" />
                      ) : (
                        <View style={styles.listingThumbPlaceholder}>
                          <Package size={20} color="#94a3b8" />
                        </View>
                      )}

                      <View style={styles.listingContentCol}>
                        <Text
                          style={[styles.listingTitle, isDark && styles.listingTitleDark]}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        <Text style={styles.savedPriceText}>{priceFormatted}</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.unsaveBtn}
                      activeOpacity={0.7}
                      onPress={() => handleRemoveSaved(item.id)}
                    >
                      <Heart size={18} color="#dc2626" fill="#dc2626" />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* ==================================================== */}
      {/* MANAGE LISTING SHEET                                 */}
      {/* ==================================================== */}
      <Modal
        visible={Boolean(manageListing)}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setManageListing(null)}
      >
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheetContent, isDark && styles.sheetContentDark, { paddingBottom: Math.max(insets.bottom + 8, 20) }]}>
            {manageListing && (
              <>
                <View style={styles.sheetHeader}>
                  <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }}>
                    {getListingThumbnail(manageListing) ? (
                      <Image
                        source={{ uri: getListingThumbnail(manageListing)! }}
                        style={styles.sheetThumb}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.sheetThumbPlaceholder}>
                        <Package size={18} color="#94a3b8" />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.sheetItemTitle, isDark && styles.sheetItemTitleDark]}
                        numberOfLines={1}
                      >
                        {manageListing.title}
                      </Text>
                      <Text style={styles.sheetItemCategory}>
                        {manageListing.category} · Status: {manageListing.status}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity onPress={() => setManageListing(null)} style={{ padding: 6 }}>
                    <X size={20} color="#64748b" />
                  </TouchableOpacity>
                </View>

                {/* Actions */}
                <View style={styles.sheetActionList}>
                  {/* Edit */}
                  <TouchableOpacity
                    style={styles.sheetActionRow}
                    activeOpacity={0.7}
                    onPress={() => {
                      const id = manageListing.id;
                      setManageListing(null);
                      router.push({
                        pathname: "/(tabs)/sell",
                        params: { edit: id },
                      } as any);
                    }}
                  >
                    <Pencil size={18} color="#033a7d" />
                    <Text style={styles.sheetActionText}>Edit Listing Details</Text>
                  </TouchableOpacity>

                  {/* Duplicate */}
                  <TouchableOpacity
                    style={styles.sheetActionRow}
                    activeOpacity={0.7}
                    onPress={() => {
                      const id = manageListing.id;
                      setManageListing(null);
                      router.push({
                        pathname: "/(tabs)/sell",
                        params: { duplicate: id },
                      } as any);
                    }}
                  >
                    <Copy size={18} color="#033a7d" />
                    <Text style={styles.sheetActionText}>Duplicate Listing</Text>
                  </TouchableOpacity>

                  {/* Mark as Sold / Available */}
                  <TouchableOpacity
                    style={styles.sheetActionRow}
                    activeOpacity={0.7}
                    disabled={updatingId === manageListing.id}
                    onPress={() =>
                      handleUpdateListingStatus(
                        manageListing.id,
                        manageListing.status === "AVAILABLE" ? "SOLD" : "AVAILABLE"
                      )
                    }
                  >
                    <CheckCircle2
                      size={18}
                      color={manageListing.status === "AVAILABLE" ? "#64748b" : "#15803d"}
                    />
                    <Text style={styles.sheetActionText}>
                      {manageListing.status === "AVAILABLE" ? "Mark as Sold Out" : "Mark as Available"}
                    </Text>
                  </TouchableOpacity>

                  {/* View in Marketplace */}
                  <TouchableOpacity
                    style={styles.sheetActionRow}
                    activeOpacity={0.7}
                    onPress={() => {
                      const id = manageListing.id;
                      setManageListing(null);
                      router.push(`/listing/${id}` as any);
                    }}
                  >
                    <ExternalLink size={18} color="#033a7d" />
                    <Text style={styles.sheetActionText}>View in Marketplace</Text>
                  </TouchableOpacity>

                  {/* Delete */}
                  <TouchableOpacity
                    style={[styles.sheetActionRow, { borderBottomWidth: 0 }]}
                    activeOpacity={0.7}
                    disabled={updatingId === manageListing.id}
                    onPress={() => handleDeleteListing(manageListing.id)}
                  >
                    <Trash2 size={18} color="#dc2626" />
                    <Text style={[styles.sheetActionText, { color: "#dc2626" }]}>Delete Listing</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ==================================================== */}
      {/* MANAGE REQUEST SHEET                                 */}
      {/* ==================================================== */}
      <Modal
        visible={Boolean(manageRequest)}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setManageRequest(null)}
      >
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheetContent, isDark && styles.sheetContentDark, { paddingBottom: Math.max(insets.bottom + 8, 20) }]}>
            {manageRequest && (
              <>
                <View style={styles.sheetHeader}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.sheetItemTitle, isDark && styles.sheetItemTitleDark]}
                      numberOfLines={1}
                    >
                      {manageRequest.title}
                    </Text>
                    <Text style={styles.sheetItemCategory}>
                      {manageRequest.category} · Status: {manageRequest.status}
                    </Text>
                  </View>

                  <TouchableOpacity onPress={() => setManageRequest(null)} style={{ padding: 6 }}>
                    <X size={20} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <View style={styles.sheetActionList}>
                  {/* Edit */}
                  <TouchableOpacity
                    style={styles.sheetActionRow}
                    activeOpacity={0.7}
                    onPress={() => {
                      const id = manageRequest.id;
                      setManageRequest(null);
                      router.push({
                        pathname: "/(tabs)/requests",
                        params: { edit: id },
                      } as any);
                    }}
                  >
                    <Pencil size={18} color="#033a7d" />
                    <Text style={styles.sheetActionText}>Edit Sourcing Request</Text>
                  </TouchableOpacity>

                  {/* Mark as Fulfilled / Open */}
                  <TouchableOpacity
                    style={styles.sheetActionRow}
                    activeOpacity={0.7}
                    disabled={updatingId === manageRequest.id}
                    onPress={() =>
                      handleUpdateRequirementStatus(
                        manageRequest.id,
                        manageRequest.status === "OPEN" ? "FULFILLED" : "OPEN"
                      )
                    }
                  >
                    <CheckCircle2
                      size={18}
                      color={manageRequest.status === "OPEN" ? "#64748b" : "#15803d"}
                    />
                    <Text style={styles.sheetActionText}>
                      {manageRequest.status === "OPEN" ? "Mark as Fulfilled" : "Reopen Request"}
                    </Text>
                  </TouchableOpacity>

                  {/* View Details */}
                  <TouchableOpacity
                    style={styles.sheetActionRow}
                    activeOpacity={0.7}
                    onPress={() => {
                      const id = manageRequest.id;
                      setManageRequest(null);
                      router.push(`/requests/${id}` as any);
                    }}
                  >
                    <ExternalLink size={18} color="#033a7d" />
                    <Text style={styles.sheetActionText}>View Public Sourcing Card</Text>
                  </TouchableOpacity>

                  {/* Delete */}
                  <TouchableOpacity
                    style={[styles.sheetActionRow, { borderBottomWidth: 0 }]}
                    activeOpacity={0.7}
                    disabled={updatingId === manageRequest.id}
                    onPress={() => handleDeleteRequirement(manageRequest.id)}
                  >
                    <Trash2 size={18} color="#dc2626" />
                    <Text style={[styles.sheetActionText, { color: "#dc2626" }]}>Delete Sourcing Request</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ==================================================== */}
      {/* SETTINGS MODAL (TRIGGERED BY ⚙ ICON)                 */}
      {/* ==================================================== */}
      <Modal
        visible={settingsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={[styles.sheetOverlay, { paddingTop: insets.top }]}>
          <View style={[styles.settingsSheet, isDark && styles.settingsSheetDark, { paddingBottom: Math.max(insets.bottom + 8, 20) }]}>
            <View style={styles.settingsHeader}>
              <Text style={[styles.settingsTitle, isDark && styles.settingsTitleDark]}>
                Account Settings
              </Text>
              <TouchableOpacity onPress={() => setSettingsModalVisible(false)} style={{ padding: 6 }}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ paddingHorizontal: 18 }} showsVerticalScrollIndicator={false}>
              {/* Personal & Company Details Section */}
              <Text style={styles.sectionHeading}>Personal & Facility Details</Text>

              <Text style={styles.inputLabel}>Representative Full Name</Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                placeholder="Full name"
                placeholderTextColor="#94a3b8"
                value={editName}
                onChangeText={setEditName}
              />

              <Text style={styles.inputLabel}>Direct Mobile / WhatsApp</Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                placeholder="+91-XXXXXXXXXX"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                value={editPhone}
                onChangeText={setEditPhone}
              />

              <Text style={styles.inputLabel}>Company / Institution Name</Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                placeholder="Laboratory Name"
                placeholderTextColor="#94a3b8"
                value={editCompany}
                onChangeText={setEditCompany}
              />

              <Text style={styles.inputLabel}>Account Email (Registered)</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled, isDark && styles.inputDark]}
                value={user.email}
                editable={false}
              />

              <TouchableOpacity
                style={[styles.saveProfileBtn, isSavingProfile && { opacity: 0.7 }]}
                activeOpacity={0.85}
                onPress={handleSaveProfile}
                disabled={isSavingProfile}
              >
                {isSavingProfile ? (
                  <ActivityIndicator size="small" color="#002555" />
                ) : (
                  <Text style={styles.saveProfileBtnText}>Save Account Changes</Text>
                )}
              </TouchableOpacity>

              {/* Help & Escrow */}
              <Text style={styles.sectionHeading}>Support & Verification</Text>

              <TouchableOpacity
                style={styles.settingsMenuRow}
                activeOpacity={0.7}
                onPress={handleCallSupport}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Phone size={18} color="#033a7d" />
                  <Text style={[styles.settingsMenuText, isDark && styles.settingsMenuTextDark]}>
                    Engineering Help Desk (+91 73030 40804)
                  </Text>
                </View>
                <ChevronRight size={18} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingsMenuRow}
                activeOpacity={0.7}
                onPress={() => setEscrowModalVisible(true)}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <ShieldCheck size={18} color="#033a7d" />
                  <Text style={[styles.settingsMenuText, isDark && styles.settingsMenuTextDark]}>
                    LabMatrix Escrow Guarantee Policy
                  </Text>
                </View>
                <ChevronRight size={18} color="#94a3b8" />
              </TouchableOpacity>

              {user.role === "ADMIN" && (
                <TouchableOpacity
                  style={styles.settingsMenuRow}
                  activeOpacity={0.7}
                  onPress={() => {
                    setSettingsModalVisible(false);
                    router.push("/admin" as any);
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <ShieldCheck size={18} color="#fbc634" />
                    <Text style={[styles.settingsMenuText, isDark && styles.settingsMenuTextDark]}>
                      Admin Moderation Console
                    </Text>
                  </View>
                  <ChevronRight size={18} color="#94a3b8" />
                </TouchableOpacity>
              )}

              {/* Sign Out & Deactivate Section */}
              <Text style={styles.sectionHeading}>Session & Account</Text>

              <TouchableOpacity
                style={styles.signOutBtn}
                activeOpacity={0.8}
                onPress={handleLogout}
              >
                <LogOut size={16} color="#dc2626" />
                <Text style={styles.signOutBtnText}>Sign Out of Session</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteAccountBtn}
                activeOpacity={0.8}
                onPress={() => setIsDeleteModalVisible(true)}
              >
                <Trash2 size={15} color="#64748b" />
                <Text style={styles.deleteAccountBtnText}>Permanently Deactivate Account</Text>
              </TouchableOpacity>

              <Text style={styles.versionNote}>LabMatrix Mobile v1.0.6 · OTA Production</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Account Deletion Confirmation Modal */}
      <Modal
        visible={isDeleteModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsDeleteModalVisible(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={[styles.confirmCard, isDark && styles.confirmCardDark]}>
            <Text style={[styles.confirmTitle, isDark && styles.confirmTitleDark]}>
              Deactivate Account
            </Text>
            <Text style={styles.confirmDesc}>
              This will unlist all your equipment and revoke your account access. Type "DELETE" to confirm.
            </Text>

            <TextInput
              style={[styles.input, isDark && styles.inputDark]}
              placeholder='Type "DELETE"'
              placeholderTextColor="#94a3b8"
              value={deleteConfirmation}
              onChangeText={setDeleteConfirmation}
              autoCapitalize="characters"
            />

            {requiresPassword && (
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                placeholder="Account password"
                placeholderTextColor="#94a3b8"
                secureTextEntry
                value={deletePassword}
                onChangeText={setDeletePassword}
              />
            )}

            <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: "#f1f5f9" }]}
                onPress={() => {
                  setIsDeleteModalVisible(false);
                  setDeleteConfirmation("");
                  setDeletePassword("");
                }}
              >
                <Text style={{ fontWeight: "700", color: "#475569" }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: "#dc2626" }]}
                onPress={handleDeleteAccount}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ fontWeight: "700", color: "#fff" }}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
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
    borderBottomWidth: 1,
    borderColor: "#f1f5f9",
  },
  topBarDark: {
    backgroundColor: "#0b1220",
    borderColor: "#1e293b",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.3,
  },
  headerTitleDark: {
    color: "#f8fafc",
  },
  settingsIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroCard: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
    gap: 14,
  },
  heroCardDark: {
    backgroundColor: "#0b1220",
    borderColor: "#1e293b",
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarSquircle: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#002555",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#ffffff",
  },
  heroTextCol: {
    flex: 1,
    gap: 3,
  },
  userName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  userNameDark: {
    color: "#f8fafc",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#eff6ff",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#033a7d",
  },
  userCompany: {
    fontSize: 12.5,
    color: "#64748b",
  },
  statsRow: {
    flexDirection: "row",
    gap: 6,
  },
  statTile: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  statTileActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#033a7d",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "900",
  },
  statLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  listEquipBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#fbc634",
    alignItems: "center",
    justifyContent: "center",
  },
  listEquipBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#002555",
  },
  postReqBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  postReqBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  segmentBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    gap: 20,
  },
  segmentTab: {
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  segmentTabActive: {
    borderBottomColor: "#033a7d",
  },
  segmentTabText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
  },
  segmentTabTextActive: {
    color: "#033a7d",
    fontWeight: "800",
  },
  activeFilterPillRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#eff6ff",
  },
  activeFilterPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#033a7d",
  },
  resetFilterText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
  },
  feedContainer: {
    paddingHorizontal: 14,
    paddingTop: 10,
    gap: 8,
  },
  listingRow: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  listingRowDark: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
  },
  listingThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  listingThumbPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  requestIconBox: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  listingContentCol: {
    flex: 1,
    gap: 3,
  },
  listingTitle: {
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 16,
    color: "#0f172a",
  },
  listingTitleDark: {
    color: "#f8fafc",
  },
  listingMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  statusDotText: {
    fontSize: 11,
    fontWeight: "700",
  },
  inquiryBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#033a7d",
  },
  savedPriceText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#002555",
  },
  unsaveBtn: {
    padding: 8,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12.5,
    color: "#64748b",
  },
  emptyBox: {
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginTop: 8,
  },
  emptyBoxDark: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 10,
    marginBottom: 4,
    textAlign: "center",
  },
  emptyTitleDark: {
    color: "#f8fafc",
  },
  emptyDesc: {
    fontSize: 12.5,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 17,
    marginBottom: 14,
  },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fbc634",
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  emptyAddBtnText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#002555",
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  sheetContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  sheetContentDark: {
    backgroundColor: "#0f172a",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
  },
  sheetThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  sheetThumbPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetItemTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  sheetItemTitleDark: {
    color: "#f8fafc",
  },
  sheetItemCategory: {
    fontSize: 11.5,
    color: "#64748b",
    marginTop: 2,
  },
  sheetActionList: {
    paddingVertical: 8,
  },
  sheetActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "#f1f5f9",
  },
  sheetActionText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },
  settingsSheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  settingsSheetDark: {
    backgroundColor: "#0f172a",
  },
  settingsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
  },
  settingsTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
  },
  settingsTitleDark: {
    color: "#f8fafc",
  },
  sectionHeading: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#033a7d",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 18,
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 4,
  },
  input: {
    height: 42,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13.5,
    color: "#0f172a",
    backgroundColor: "#ffffff",
    marginBottom: 10,
  },
  inputDark: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    color: "#f8fafc",
  },
  inputDisabled: {
    backgroundColor: "#f8fafc",
    color: "#64748b",
  },
  saveProfileBtn: {
    backgroundColor: "#fbc634",
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 10,
  },
  saveProfileBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#002555",
  },
  settingsMenuRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#f1f5f9",
  },
  settingsMenuText: {
    fontSize: 13.5,
    fontWeight: "600",
    color: "#334155",
  },
  settingsMenuTextDark: {
    color: "#f8fafc",
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
    marginTop: 6,
  },
  signOutBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#dc2626",
  },
  deleteAccountBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    marginTop: 6,
  },
  deleteAccountBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
  },
  versionNote: {
    fontSize: 11,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  confirmCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 20,
    width: "100%",
    maxWidth: 340,
  },
  confirmCardDark: {
    backgroundColor: "#0f172a",
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#dc2626",
    marginBottom: 6,
  },
  confirmTitleDark: {
    color: "#f87171",
  },
  confirmDesc: {
    fontSize: 12.5,
    color: "#64748b",
    marginBottom: 12,
    lineHeight: 17,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  logoImg: {
    width: 140,
    height: 34,
  },
  loggedOutScroll: {
    padding: 24,
  },
  loggedOutHero: {
    alignItems: "center",
    marginVertical: 20,
  },
  loggedOutIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  loggedOutTitle: {
    fontSize: 18,
    fontWeight: "800",
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
    lineHeight: 18,
  },
  benefitsCard: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 16,
    gap: 14,
    marginBottom: 24,
  },
  benefitsCardDark: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
  },
  benefitRow: {
    flexDirection: "row",
    gap: 10,
  },
  benefitHeading: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  benefitHeadingDark: {
    color: "#f8fafc",
  },
  benefitDesc: {
    fontSize: 11.5,
    color: "#64748b",
    lineHeight: 16,
    marginTop: 2,
  },
  loggedOutActions: {
    gap: 10,
  },
  primaryLoginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#033a7d",
    paddingVertical: 13,
    borderRadius: 10,
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
    gap: 8,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    paddingVertical: 13,
    borderRadius: 10,
  },
  secondaryRegisterBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#033a7d",
  },
  supportFooter: {
    marginTop: 28,
    alignItems: "center",
  },
  supportFooterText: {
    fontSize: 12,
    color: "#64748b",
  },
});
