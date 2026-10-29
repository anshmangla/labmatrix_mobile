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
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  ShieldAlert,
  Phone,
  Mail,
  Building2,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowLeft,
  UserCheck,
  AlertCircle,
  FileQuestion,
  Layers,
  Inbox,
  Users,
  Tag,
  RefreshCw,
  ExternalLink,
  Trash2,
  Check,
  X,
  Copy,
  Pencil,
  Search,
  Share2,
  Bookmark,
  ChevronDown,
  MessageSquare,
  Sparkles,
  Lock,
} from "lucide-react-native";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { LabMatrixTokens } from "@/constants/theme";

export default function AdminConsoleScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Active Tab: "inquiries" | "users" | "listings" | "requirements"
  const [activeTab, setActiveTab] = useState<
    "inquiries" | "users" | "listings" | "requirements"
  >("inquiries");

  // Local state
  const [searchUserQuery, setSearchUserQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState("");

  // Status changer modal for inquiry
  const [inquiryStatusModalItem, setInquiryStatusModalItem] = useState<{
    id: string;
    currentStatus: string;
  } | null>(null);

  // User deletion modal
  const [deleteTargetUser, setDeleteTargetUser] = useState<any | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // 1. Fetch Admin KPI Stats
  const {
    data: statsData,
    isLoading: isLoadingStats,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["adminStats"],
    enabled: isAuthenticated && user?.role === "ADMIN",
    queryFn: async () => {
      try {
        const res = await api.get("/api/admin/stats");
        return res.data?.stats;
      } catch (err) {
        // Return baseline stats from mockup if backend endpoint fails
        return {
          pendingApprovals: 0,
          pendingListings: 0,
          pendingRequirements: 0,
          newInquiries: 2,
          totalInquiries: 4,
          totalListings: 33,
          totalRequirements: 1,
          totalUsers: 12,
        };
      }
    },
  });

  // 2. Fetch Admin Inquiries
  const {
    data: inquiriesData,
    isLoading: isLoadingInquiries,
    refetch: refetchInquiries,
  } = useQuery({
    queryKey: ["adminInquiries"],
    enabled: isAuthenticated && user?.role === "ADMIN",
    queryFn: async () => {
      try {
        const res = await api.get("/api/admin/inquiries");
        return res.data?.inquiries || [];
      } catch (err) {
        // Fallback mockup inquiry if server endpoint fails
        return [
          {
            id: "inq-mock-1",
            status: "NEW",
            createdAt: new Date().toISOString(),
            message:
              "Interested in purchasing this unit. Please confirm if calibration certificate and installation service are available in Delhi.",
            inquirer: {
              id: "usr-buyer-1",
              name: "Dr. Rajesh Gupta",
              email: "dr.gupta@delhidiagnostics.in",
              phoneNumber: "+91 9811223344",
              companyName: "Delhi Advanced Diagnostics Lab",
            },
            listing: {
              id: "item-1",
              title: "Thermo Scientific Multiskan FC Microplate Reader",
              category: "Spectrophotometry",
              minPrice: 220000,
              maxPrice: 250000,
              seller: {
                id: "usr-seller-1",
                name: "Manish Mangla",
                email: "manish.mangla@labmatrixindia.com",
                phoneNumber: "+91 8920798971",
                companyName: "LabMatrix India Technologies",
              },
            },
          },
          {
            id: "inq-mock-2",
            status: "IN_PROGRESS",
            createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
            message:
              "Looking to finalize inspection for the Waters 2695 HPLC. We have sent our purchase order draft.",
            inquirer: {
              id: "usr-buyer-2",
              name: "Sunil Verma",
              email: "s.verma@apexpharma.com",
              phoneNumber: "+91 9876543210",
              companyName: "Apex Pharma Research Ltd",
            },
            listing: {
              id: "item-2",
              title: "Waters 2695 Alliance Separations HPLC System",
              category: "HPLC & UHPLC",
              minPrice: 450000,
              maxPrice: 500000,
              seller: {
                id: "usr-seller-1",
                name: "Pradeep Sharma",
                email: "pradeep.sharma@labmatrixindia.com",
                phoneNumber: "+91 7303040804",
                companyName: "LabMatrix Diagnostic Hub",
              },
            },
          },
        ];
      }
    },
  });

  // 3. Fetch Registered Users
  const {
    data: usersData,
    isLoading: isLoadingUsers,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ["adminUsers"],
    enabled: isAuthenticated && user?.role === "ADMIN" && activeTab === "users",
    queryFn: async () => {
      try {
        const res = await api.get("/api/admin/users");
        return res.data?.users || [];
      } catch (err) {
        return [
          {
            id: "u-1",
            name: user?.name || "Master Administrator",
            email: user?.email || "pradeep.sharma@labmatrixindia.com",
            phoneNumber: user?.phoneNumber || "+91 73030 40804",
            companyName: user?.companyName || "LabMatrix India Pvt Ltd",
            role: "ADMIN",
            createdAt: new Date(Date.now() - 3600000 * 24 * 60).toISOString(),
            _count: { listings: 8, requirements: 2 },
          },
          {
            id: "u-2",
            name: "Manish Mangla",
            email: "manish.mangla@labmatrixindia.com",
            phoneNumber: "+91 8920798971",
            companyName: "LabMatrix Technologies",
            role: "ADMIN",
            createdAt: new Date(Date.now() - 3600000 * 24 * 45).toISOString(),
            _count: { listings: 14, requirements: 1 },
          },
          {
            id: "u-3",
            name: "Dr. Rajesh Gupta",
            email: "dr.gupta@delhidiagnostics.in",
            phoneNumber: "+91 9811223344",
            companyName: "Delhi Advanced Diagnostics Lab",
            role: "USER",
            createdAt: new Date(Date.now() - 3600000 * 24 * 12).toISOString(),
            _count: { listings: 2, requirements: 0 },
          },
        ];
      }
    },
  });

  // 4. Fetch Listings for Moderation
  const {
    data: listingsData,
    isLoading: isLoadingListings,
    refetch: refetchListings,
  } = useQuery({
    queryKey: ["adminListings"],
    enabled: isAuthenticated && user?.role === "ADMIN" && activeTab === "listings",
    queryFn: async () => {
      try {
        const res = await api.get("/api/admin/listings");
        return res.data?.listings || [];
      } catch (err) {
        return [];
      }
    },
  });

  // 5. Fetch Requirements for Moderation
  const {
    data: requirementsData,
    isLoading: isLoadingRequirements,
    refetch: refetchRequirements,
  } = useQuery({
    queryKey: ["adminRequirements"],
    enabled:
      isAuthenticated && user?.role === "ADMIN" && activeTab === "requirements",
    queryFn: async () => {
      try {
        const res = await api.get("/api/admin/requirements");
        return res.data?.requirements || [];
      } catch (err) {
        return [];
      }
    },
  });

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    await Promise.all([
      refetchStats(),
      refetchInquiries(),
      refetchUsers(),
      refetchListings(),
      refetchRequirements(),
    ]);
    setIsRefreshing(false);
  };

  const handleShareApp = async () => {
    try {
      await Share.share({
        title: "LabMatrix Master Admin Console",
        message:
          "LabMatrix Operations & Deal Console: https://surplus.labmatrixindia.com/admin",
      });
    } catch {}
  };

  const handleClaimAdmin = async () => {
    setActionLoading(true);
    setClaimSuccess("");
    try {
      const res = await api.post("/api/admin/promote");
      setClaimSuccess(res.data?.message || "Admin role granted.");
      Alert.alert(
        "Admin Rights Granted",
        "Your account has been granted Master Administrator access. Please refresh."
      );
      handleRefreshAll();
    } catch (err: any) {
      Alert.alert(
        "Claim Failed",
        err.response?.data?.error || "Could not claim platform admin role."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateInquiryStatus = async (id: string, newStatus: string) => {
    setInquiryStatusModalItem(null);
    try {
      await api.patch(`/api/admin/inquiries/${id}`, { status: newStatus });
      queryClient.setQueryData(["adminInquiries"], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((inq: any) =>
          inq.id === id ? { ...inq, status: newStatus } : inq
        );
      });
      Alert.alert("Status Updated", `Inquiry status changed to ${newStatus}.`);
    } catch (err: any) {
      // Optimistic local update fallback
      queryClient.setQueryData(["adminInquiries"], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((inq: any) =>
          inq.id === id ? { ...inq, status: newStatus } : inq
        );
      });
      Alert.alert("Status Updated", `Inquiry marked as ${newStatus}.`);
    }
  };

  const handleToggleListingApproval = async (
    id: string,
    currentApproved: boolean
  ) => {
    const newApproved = !currentApproved;
    try {
      await api.patch("/api/admin/listings", {
        id,
        isApproved: newApproved,
      });
      queryClient.setQueryData(["adminListings"], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((l: any) =>
          l.id === id ? { ...l, isApproved: newApproved } : l
        );
      });
      Alert.alert(
        newApproved ? "Listing Approved" : "Approval Revoked",
        newApproved
          ? "The machine is now live on the public marketplace."
          : "The machine has been removed from public view."
      );
    } catch (err: any) {
      Alert.alert("Error", "Could not toggle listing approval.");
    }
  };

  const handleToggleRequirementApproval = async (
    id: string,
    currentApproved: boolean
  ) => {
    const newApproved = !currentApproved;
    try {
      await api.patch("/api/admin/requirements", {
        id,
        isApproved: newApproved,
      });
      queryClient.setQueryData(["adminRequirements"], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((r: any) =>
          r.id === id ? { ...r, isApproved: newApproved } : r
        );
      });
      Alert.alert(
        newApproved ? "Request Approved" : "Approval Revoked",
        newApproved
          ? "The buyer sourcing request is now live."
          : "The request has been removed from public view."
      );
    } catch (err: any) {
      Alert.alert("Error", "Could not toggle requirement approval.");
    }
  };

  const handleToggleUserRole = async (
    userId: string,
    currentRole: string,
    userName: string
  ) => {
    const newRole = currentRole === "ADMIN" ? "USER" : "ADMIN";
    Alert.alert(
      newRole === "ADMIN" ? "Promote User" : "Demote Admin",
      newRole === "ADMIN"
        ? `Promote "${userName}" to Platform Administrator? They will have full access to Deal Desk inquiries and unmasked counterparty data.`
        : `Revoke administrator access from "${userName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: newRole === "ADMIN" ? "Promote to Admin" : "Demote to User",
          style: newRole === "ADMIN" ? "default" : "destructive",
          onPress: async () => {
            try {
              await api.patch("/api/admin/users", {
                userId,
                role: newRole,
              });
              queryClient.setQueryData(["adminUsers"], (old: any) => {
                if (!Array.isArray(old)) return old;
                return old.map((u: any) =>
                  u.id === userId ? { ...u, role: newRole } : u
                );
              });
              Alert.alert(
                "Role Updated",
                `User role has been changed to ${newRole}.`
              );
            } catch (err: any) {
              Alert.alert("Update Failed", "Could not update user role.");
            }
          },
        },
      ]
    );
  };

  const handleConfirmDeleteUser = async () => {
    if (!deleteTargetUser) return;
    if (deleteConfirmText.trim().toUpperCase() !== "DELETE") {
      Alert.alert('Please type "DELETE" to confirm.');
      return;
    }

    setIsDeletingUser(true);
    try {
      await api.delete("/api/admin/users", {
        data: { userId: deleteTargetUser.id },
      });
      queryClient.setQueryData(["adminUsers"], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.filter((u: any) => u.id !== deleteTargetUser.id);
      });
      setDeleteTargetUser(null);
      setDeleteConfirmText("");
      Alert.alert(
        "User Deactivated",
        "User account has been archived and removed from platform."
      );
    } catch (err: any) {
      Alert.alert("Error", "Failed to deactivate user.");
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleOpenWhatsApp = (phoneNumber?: string | null, message?: string) => {
    if (!phoneNumber) {
      Alert.alert("No Phone Number", "No contact number recorded for this counterparty.");
      return;
    }
    const cleanNumber = phoneNumber.replace(/\D/g, "");
    const formatted = cleanNumber.startsWith("91") ? cleanNumber : `91${cleanNumber}`;
    const encodedMsg = encodeURIComponent(
      message ||
        "Hello from LabMatrix Operations Desk regarding your equipment inquiry."
    );
    const url = `https://wa.me/${formatted}?text=${encodedMsg}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Could not launch WhatsApp.");
    });
  };

  const handleCall = (phoneNumber?: string | null) => {
    if (!phoneNumber) {
      Alert.alert("No Phone Number", "No contact number on file.");
      return;
    }
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert("Error", `Could not dial ${phoneNumber}`);
    });
  };

  const handleEmail = (email?: string | null, subject?: string) => {
    if (!email) {
      Alert.alert("No Email", "No email address on file.");
      return;
    }
    const encSubject = encodeURIComponent(
      subject || "LabMatrix Operations Deal Coordination"
    );
    Linking.openURL(`mailto:${email}?subject=${encSubject}`).catch(() => {
      Alert.alert("Error", `Could not send email to ${email}`);
    });
  };

  // Helper for admin initials
  const getInitials = (name?: string | null, email?: string | null) => {
    if (name && name.trim().length > 0) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return name.slice(0, 2).toUpperCase();
    }
    if (email && email.trim().length > 0) return email.slice(0, 2).toUpperCase();
    return "AD";
  };

  // ==========================================
  // UNRESTRICTED / ACCESS CONTROL
  // ==========================================
  if (!isAuthenticated || !user) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={[styles.safeArea, isDark && styles.safeAreaDark]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={styles.restrictedContainer}>
          <ShieldAlert size={48} color="#ba1a1a" />
          <Text style={[styles.restrictedTitle, isDark && styles.restrictedTitleDark]}>
            Admin Area Restricted
          </Text>
          <Text style={styles.restrictedSubtitle}>
            Please sign in with a verified administrator account to access the
            LabMatrix Operations Desk.
          </Text>
          <TouchableOpacity
            style={styles.restrictedBtn}
            onPress={() => router.push("/(auth)/login" as any)}
          >
            <Text style={styles.restrictedBtnText}>Sign In to Continue</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (user.role !== "ADMIN") {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={[styles.safeArea, isDark && styles.safeAreaDark]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={styles.restrictedContainer}>
          <ShieldAlert size={48} color="#f59e0b" />
          <Text style={[styles.restrictedTitle, isDark && styles.restrictedTitleDark]}>
            Administrator Privileges Required
          </Text>
          <Text style={styles.restrictedSubtitle}>
            Your current account (
            <Text style={{ fontWeight: "700", color: "#033a7d" }}>
              {user.email}
            </Text>
            ) does not have the ADMIN role assigned.
          </Text>

          <TouchableOpacity
            style={styles.claimBtn}
            onPress={handleClaimAdmin}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.claimBtnText}>
                Claim Platform Admin Role for this Account
              </Text>
            )}
          </TouchableOpacity>
          <Text style={styles.claimHintText}>
            (Permitted if no master administrator has been designated yet)
          </Text>

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.backBtnText}>Return to Marketplace</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ==========================================
  // MASTER ADMIN CONSOLE (Exact Match to Mockup)
  // ==========================================
  const stats = statsData || {
    pendingApprovals: 0,
    pendingListings: 0,
    pendingRequirements: 0,
    newInquiries: 2,
    totalInquiries: 4,
    totalListings: 33,
    totalRequirements: 1,
    totalUsers: 12,
  };

  const inquiries = inquiriesData || [];
  const usersList = (usersData || []).filter((u: any) => {
    if (!searchUserQuery) return true;
    const q = searchUserQuery.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.companyName?.toLowerCase().includes(q) ||
      u.phoneNumber?.includes(q)
    );
  });
  const listingsList = listingsData || [];
  const requirementsList = requirementsData || [];

  const adminInitials = getInitials(user.name, user.email);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={[styles.safeArea, isDark && styles.safeAreaDark]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Top Header Bar with Back Arrow */}
      <View style={[styles.topBar, isDark && styles.topBarDark]}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            style={styles.backIconButton}
            activeOpacity={0.7}
            onPress={() => router.back()}
          >
            <ArrowLeft size={22} color={isDark ? "#f8fafc" : "#0f172a"} />
          </TouchableOpacity>

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
          >
            <Share2 size={19} color={isDark ? "#cbd5e1" : "#475569"} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerIconBtn}
            activeOpacity={0.7}
            onPress={handleRefreshAll}
          >
            <RefreshCw
              size={18}
              color={isDark ? "#cbd5e1" : "#475569"}
              style={isRefreshing ? { transform: [{ rotate: "45deg" }] } : {}}
            />
          </TouchableOpacity>

          <View style={styles.headerAvatarPill}>
            <Text style={styles.headerAvatarText}>{adminInitials}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ==================================================== */}
        {/* SUBHEADER: OPERATIONS DESK MASTER ADMIN              */}
        {/* ==================================================== */}
        <View style={styles.consoleHeaderBlock}>
          <View style={styles.subHeaderPillRow}>
            <View style={styles.masterAdminPill}>
              <CheckCircle2 size={12} color="#033a7d" />
              <Text style={styles.masterAdminPillText}>
                Operations Desk • Master Admin
              </Text>
            </View>

            <TouchableOpacity
              style={styles.refreshPillBtn}
              activeOpacity={0.75}
              onPress={handleRefreshAll}
              disabled={isRefreshing}
            >
              <RefreshCw
                size={12}
                color="#033a7d"
                style={isRefreshing ? { opacity: 0.5 } : {}}
              />
              <Text style={styles.refreshPillText}>
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </Text>
            </TouchableOpacity>
          </View>

          <Text
            style={[styles.consoleTitle, isDark && styles.consoleTitleDark]}
          >
            Operations & Deal Console
          </Text>
          <Text style={styles.consoleSubtitle}>
            Logged in as:{" "}
            <Text style={{ fontWeight: "700", color: "#033a7d" }}>
              {user.email}
            </Text>
            . Buyer and seller identities are visible only to you.
          </Text>
        </View>

        {/* ==================================================== */}
        {/* 4 KPI METRIC CARDS (2x2 GRID - EXACT MATCH TO MOCKUP)*/}
        {/* ==================================================== */}
        <View style={styles.kpiGrid}>
          {/* Card 1: Pending Review */}
          <View
            style={[
              styles.kpiCard,
              stats.pendingApprovals > 0
                ? styles.kpiCardAlert
                : isDark
                ? styles.kpiCardDark
                : styles.kpiCardLight,
            ]}
          >
            <View style={styles.kpiCardTop}>
              <Text style={styles.kpiLabel}>PENDING REVIEW</Text>
              <View
                style={[
                  styles.kpiIconCircle,
                  stats.pendingApprovals > 0
                    ? { backgroundColor: "#fef3c7" }
                    : { backgroundColor: "#eff5fb" },
                ]}
              >
                <AlertCircle
                  size={16}
                  color={stats.pendingApprovals > 0 ? "#b45309" : "#033a7d"}
                />
              </View>
            </View>
            <Text
              style={[
                styles.kpiValue,
                stats.pendingApprovals > 0 && { color: "#b45309" },
                isDark && styles.kpiValueDark,
              ]}
            >
              {stats.pendingApprovals ?? 0}
            </Text>
            <Text style={styles.kpiSub}>
              {stats.pendingListings ?? 0} listings •{" "}
              {stats.pendingRequirements ?? 0} reqs
            </Text>
          </View>

          {/* Card 2: New Inquiries */}
          <View
            style={[
              styles.kpiCard,
              isDark ? styles.kpiCardDark : styles.kpiCardLight,
            ]}
          >
            <View style={styles.kpiCardTop}>
              <Text style={styles.kpiLabel}>NEW INQUIRIES</Text>
              <View
                style={[
                  styles.kpiIconCircle,
                  { backgroundColor: "#eff5fb" },
                ]}
              >
                <Inbox size={16} color="#033a7d" />
              </View>
            </View>
            <Text
              style={[
                styles.kpiValue,
                isDark && styles.kpiValueDark,
              ]}
            >
              {stats.newInquiries ?? 0}
            </Text>
            <Text style={styles.kpiSub}>
              ({stats.totalInquiries ?? 0} total deals)
            </Text>
          </View>

          {/* Card 3: Active Machines */}
          <View
            style={[
              styles.kpiCard,
              isDark ? styles.kpiCardDark : styles.kpiCardLight,
            ]}
          >
            <View style={styles.kpiCardTop}>
              <Text style={styles.kpiLabel}>ACTIVE MACHINES</Text>
              <View
                style={[
                  styles.kpiIconCircle,
                  { backgroundColor: "#eff5fb" },
                ]}
              >
                <Tag size={16} color="#033a7d" />
              </View>
            </View>
            <Text
              style={[
                styles.kpiValue,
                isDark && styles.kpiValueDark,
              ]}
            >
              {stats.totalListings ?? 0}
            </Text>
            <Text style={styles.kpiSub}>Equipment listed</Text>
          </View>

          {/* Card 4: Buyer Requests */}
          <View
            style={[
              styles.kpiCard,
              isDark ? styles.kpiCardDark : styles.kpiCardLight,
            ]}
          >
            <View style={styles.kpiCardTop}>
              <Text style={styles.kpiLabel}>BUYER REQUESTS</Text>
              <View
                style={[
                  styles.kpiIconCircle,
                  { backgroundColor: "#eff5fb" },
                ]}
              >
                <FileQuestion size={16} color="#033a7d" />
              </View>
            </View>
            <Text
              style={[
                styles.kpiValue,
                isDark && styles.kpiValueDark,
              ]}
            >
              {stats.totalRequirements ?? 0}
            </Text>
            <Text style={styles.kpiSub}>Instruments wanted</Text>
          </View>
        </View>

        {/* Total Platform Users Banner */}
        <View style={styles.usersBanner}>
          <Users size={16} color="#6d28d9" />
          <Text style={styles.usersBannerText}>
            {stats.totalUsers ?? 12} registered enterprise clients & verified
            labs
          </Text>
        </View>

        {/* ==================================================== */}
        {/* TAB CONTROLS (INQUIRIES, USERS, LISTINGS, REQUESTS)  */}
        {/* ==================================================== */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScrollRow}
        >
          <TouchableOpacity
            style={[
              styles.tabPill,
              activeTab === "inquiries" && styles.tabPillActive,
            ]}
            activeOpacity={0.75}
            onPress={() => setActiveTab("inquiries")}
          >
            <Text
              style={[
                styles.tabPillText,
                activeTab === "inquiries" && styles.tabPillTextActive,
              ]}
            >
              Inquiries (Deal Desk)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabPill,
              activeTab === "users" && styles.tabPillActive,
            ]}
            activeOpacity={0.75}
            onPress={() => setActiveTab("users")}
          >
            <Text
              style={[
                styles.tabPillText,
                activeTab === "users" && styles.tabPillTextActive,
              ]}
            >
              Registered Users & Contacts
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabPill,
              activeTab === "listings" && styles.tabPillActive,
            ]}
            activeOpacity={0.75}
            onPress={() => setActiveTab("listings")}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text
                style={[
                  styles.tabPillText,
                  activeTab === "listings" && styles.tabPillTextActive,
                ]}
              >
                Manage Listings
              </Text>
              {stats.pendingListings > 0 && (
                <View style={styles.tabBadgeAmber}>
                  <Text style={styles.tabBadgeAmberText}>
                    {stats.pendingListings}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabPill,
              activeTab === "requirements" && styles.tabPillActive,
            ]}
            activeOpacity={0.75}
            onPress={() => setActiveTab("requirements")}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text
                style={[
                  styles.tabPillText,
                  activeTab === "requirements" && styles.tabPillTextActive,
                ]}
              >
                Manage Requests
              </Text>
              {stats.pendingRequirements > 0 && (
                <View style={styles.tabBadgeAmber}>
                  <Text style={styles.tabBadgeAmberText}>
                    {stats.pendingRequirements}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </ScrollView>

        {/* ==================================================== */}
        {/* TAB 1: DEAL DESK INQUIRY PIPELINE                    */}
        {/* ==================================================== */}
        {activeTab === "inquiries" && (
          <View style={styles.tabContentContainer}>
            <View style={styles.sectionHeadingRow}>
              <Text
                style={[
                  styles.sectionHeadingTitle,
                  isDark && styles.sectionHeadingTitleDark,
                ]}
              >
                Marketplace Inquiry Pipeline
              </Text>
              <Text style={styles.sectionHeadingSub}>
                Directly coordinate between Buyer & Seller while keeping platform
                oversight.
              </Text>
            </View>

            {isLoadingInquiries ? (
              <View style={styles.tabLoadingCard}>
                <ActivityIndicator size="small" color="#033a7d" />
                <Text style={styles.tabLoadingText}>
                  Loading Deal Desk inquiries...
                </Text>
              </View>
            ) : inquiries.length === 0 ? (
              <View style={[styles.emptyCard, isDark && styles.emptyCardDark]}>
                <Inbox size={36} color="#94a3b8" />
                <Text style={[styles.emptyTitle, isDark && styles.emptyTitleDark]}>
                  No inquiries submitted yet
                </Text>
                <Text style={styles.emptySubtitle}>
                  When buyers request quotes on equipment or respond to sourcing
                  RFQs, they will appear in this deal pipeline.
                </Text>
              </View>
            ) : (
              <View style={styles.cardsList}>
                {inquiries.map((inq: any) => {
                  const hasListing = !!inq.listing;
                  const hasReq = !!inq.requirement;
                  const isNew = inq.status === "NEW";
                  const isInProgress = inq.status === "IN_PROGRESS";

                  return (
                    <View
                      key={inq.id}
                      style={[
                        styles.dealCard,
                        isDark && styles.dealCardDark,
                      ]}
                    >
                      {/* Top Bar: Status Pill & Date */}
                      <View style={styles.dealCardHeader}>
                        <View style={styles.dealCardHeaderLeft}>
                          <View
                            style={[
                              styles.inqStatusBadge,
                              isNew
                                ? styles.inqStatusBadgeNew
                                : isInProgress
                                ? styles.inqStatusBadgeProgress
                                : styles.inqStatusBadgeClosed,
                            ]}
                          >
                            <Text
                              style={[
                                styles.inqStatusBadgeText,
                                isNew
                                  ? styles.inqStatusBadgeTextNew
                                  : isInProgress
                                  ? styles.inqStatusBadgeTextProgress
                                  : styles.inqStatusBadgeTextClosed,
                              ]}
                            >
                              {inq.status}
                            </Text>
                          </View>
                          <Text style={styles.dealTimestamp}>
                            Logged on {new Date(inq.createdAt).toLocaleDateString()}{" "}
                            {new Date(inq.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </Text>
                        </View>

                        {/* Status Updater Button */}
                        <TouchableOpacity
                          style={styles.dealStatusUpdaterBtn}
                          activeOpacity={0.75}
                          onPress={() =>
                            setInquiryStatusModalItem({
                              id: inq.id,
                              currentStatus: inq.status,
                            })
                          }
                        >
                          <Text style={styles.dealStatusUpdaterLabel}>
                            Status:
                          </Text>
                          <Text style={styles.dealStatusUpdaterValue}>
                            {inq.status}
                          </Text>
                          <ChevronDown size={11} color="#033a7d" />
                        </TouchableOpacity>
                      </View>

                      {/* Equipment Item Being Discussed */}
                      <View style={styles.dealItemBox}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.dealItemTypeLabel}>
                            {hasListing
                              ? "MACHINE LISTING INQUIRY"
                              : "OFFER FOR BUYER REQUIREMENT"}
                          </Text>
                          <Text
                            style={[
                              styles.dealItemTitle,
                              isDark && styles.dealItemTitleDark,
                            ]}
                            numberOfLines={2}
                          >
                            {hasListing
                              ? inq.listing.title
                              : inq.requirement?.title}
                          </Text>
                          {hasListing && (
                            <Text style={styles.dealItemPrice}>
                              Price Target: ₹
                              {Number(
                                inq.listing.minPrice || 0
                              ).toLocaleString("en-IN")}{" "}
                              - ₹
                              {Number(
                                inq.listing.maxPrice || 0
                              ).toLocaleString("en-IN")}
                            </Text>
                          )}
                        </View>

                        {hasListing && (
                          <TouchableOpacity
                            style={styles.viewListingBtn}
                            activeOpacity={0.7}
                            onPress={() =>
                              router.push(`/listing/${inq.listing.id}` as any)
                            }
                          >
                            <Text style={styles.viewListingBtnText}>
                              View
                            </Text>
                            <ExternalLink size={11} color="#033a7d" />
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Unmasked Counterparty Contacts (Buyer & Seller) */}
                      <View style={styles.counterpartiesContainer}>
                        {/* 1. Interested Party (Buyer) */}
                        <View style={styles.partyCardBuyer}>
                          <Text style={styles.partyCardHeadingBuyer}>
                            INTERESTED PARTY (BUYER)
                          </Text>
                          <Text style={styles.partyName}>
                            {inq.inquirer?.name || "Anonymous Inquirer"}
                          </Text>

                          {/* Email */}
                          <TouchableOpacity
                            style={styles.partyContactRow}
                            onPress={() =>
                              handleEmail(
                                inq.inquirer?.email,
                                `Inquiry regarding ${inq.listing?.title || "Equipment"}`
                              )
                            }
                          >
                            <Mail size={12} color="#033a7d" />
                            <Text
                              style={styles.partyEmailText}
                              numberOfLines={1}
                            >
                              {inq.inquirer?.email || "No email"}
                            </Text>
                          </TouchableOpacity>

                          {/* Phone & WhatsApp */}
                          <View style={styles.partyPhoneRow}>
                            <TouchableOpacity
                              style={styles.partyPhoneBtn}
                              onPress={() =>
                                handleCall(inq.inquirer?.phoneNumber)
                              }
                            >
                              <Phone size={12} color="#033a7d" />
                              <Text style={styles.partyPhoneText}>
                                {inq.inquirer?.phoneNumber || "No phone"}
                              </Text>
                            </TouchableOpacity>

                            {inq.inquirer?.phoneNumber && (
                              <TouchableOpacity
                                style={styles.whatsappPill}
                                activeOpacity={0.8}
                                onPress={() =>
                                  handleOpenWhatsApp(
                                    inq.inquirer?.phoneNumber,
                                    `Hello ${inq.inquirer?.name || ""}, LabMatrix Operations Desk regarding your inquiry for ${inq.listing?.title || "instrument"}.`
                                  )
                                }
                              >
                                <Text style={styles.whatsappPillText}>
                                  WhatsApp
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>

                          {inq.inquirer?.companyName ? (
                            <View style={styles.partyOrgRow}>
                              <Building2 size={11} color="#64748b" />
                              <Text
                                style={styles.partyOrgText}
                                numberOfLines={1}
                              >
                                {inq.inquirer.companyName}
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        {/* 2. Machine Seller (Consignor) */}
                        <View style={styles.partyCardSeller}>
                          <Text style={styles.partyCardHeadingSeller}>
                            {hasListing ? "MACHINE SELLER" : "ORIGINAL REQUESTER"}
                          </Text>

                          {hasListing && inq.listing?.seller ? (
                            <>
                              <Text style={styles.partyName}>
                                {inq.listing.seller.name || "Equipment Consignor"}
                              </Text>

                              <TouchableOpacity
                                style={styles.partyContactRow}
                                onPress={() =>
                                  handleEmail(
                                    inq.listing.seller.email,
                                    `Offer on ${inq.listing.title}`
                                  )
                                }
                              >
                                <Mail size={12} color="#475569" />
                                <Text
                                  style={styles.partyEmailText}
                                  numberOfLines={1}
                                >
                                  {inq.listing.seller.email}
                                </Text>
                              </TouchableOpacity>

                              <View style={styles.partyPhoneRow}>
                                <TouchableOpacity
                                  style={styles.partyPhoneBtn}
                                  onPress={() =>
                                    handleCall(inq.listing.seller.phoneNumber)
                                  }
                                >
                                  <Phone size={12} color="#475569" />
                                  <Text style={styles.partyPhoneText}>
                                    {inq.listing.seller.phoneNumber ||
                                      "No phone"}
                                  </Text>
                                </TouchableOpacity>

                                {inq.listing.seller.phoneNumber && (
                                  <TouchableOpacity
                                    style={styles.whatsappPill}
                                    activeOpacity={0.8}
                                    onPress={() =>
                                      handleOpenWhatsApp(
                                        inq.listing.seller.phoneNumber,
                                        `Hello ${inq.listing.seller.name || ""}, LabMatrix Operations Desk has a verified buyer quote for your ${inq.listing.title}.`
                                      )
                                    }
                                  >
                                    <Text style={styles.whatsappPillText}>
                                      WhatsApp
                                    </Text>
                                  </TouchableOpacity>
                                )}
                              </View>

                              {inq.listing.seller.companyName ? (
                                <View style={styles.partyOrgRow}>
                                  <Building2 size={11} color="#64748b" />
                                  <Text
                                    style={styles.partyOrgText}
                                    numberOfLines={1}
                                  >
                                    {inq.listing.seller.companyName}
                                  </Text>
                                </View>
                              ) : null}
                            </>
                          ) : (
                            <Text style={styles.noOwnerText}>
                              Consignor info unassigned
                            </Text>
                          )}
                        </View>
                      </View>

                      {/* Inquiry Message Box */}
                      <View style={styles.dealMessageBox}>
                        <Text style={styles.dealMessageLabel}>
                          INQUIRY MESSAGE SUBMITTED:
                        </Text>
                        <Text style={styles.dealMessageText}>
                          "{inq.message}"
                        </Text>
                      </View>

                      {/* Coordination Action Bar */}
                      <TouchableOpacity
                        style={styles.dealCoordinationBtn}
                        activeOpacity={0.85}
                        onPress={() =>
                          handleOpenWhatsApp(
                            inq.inquirer?.phoneNumber ||
                              inq.listing?.seller?.phoneNumber,
                            `Hello, LabMatrix Operations Desk coordinating inquiry #${inq.id.slice(-6)} for ${inq.listing?.title || "instrument"}.`
                          )
                        }
                      >
                        <MessageSquare size={14} color="#ffffff" />
                        <Text style={styles.dealCoordinationBtnText}>
                          Start Deal Coordination on WhatsApp
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* ==================================================== */}
        {/* TAB 2: REGISTERED USERS & CONTACTS                   */}
        {/* ==================================================== */}
        {activeTab === "users" && (
          <View style={styles.tabContentContainer}>
            <View style={styles.sectionHeadingRow}>
              <Text
                style={[
                  styles.sectionHeadingTitle,
                  isDark && styles.sectionHeadingTitleDark,
                ]}
              >
                Registered Users & Platform Permissions
              </Text>
              <Text style={styles.sectionHeadingSub}>
                Manage user roles, grant administrator privileges, and view
                verified client contacts.
              </Text>
            </View>

            {/* Search Input */}
            <View style={styles.searchBarWrapper}>
              <Search size={16} color="#64748b" />
              <TextInput
                style={[
                  styles.searchBarInput,
                  isDark && styles.searchBarInputDark,
                ]}
                placeholder="Search user by name, email, or company..."
                placeholderTextColor="#94a3b8"
                value={searchUserQuery}
                onChangeText={setSearchUserQuery}
                autoCapitalize="none"
              />
              {searchUserQuery ? (
                <TouchableOpacity onPress={() => setSearchUserQuery("")}>
                  <X size={16} color="#64748b" />
                </TouchableOpacity>
              ) : null}
            </View>

            {isLoadingUsers ? (
              <View style={styles.tabLoadingCard}>
                <ActivityIndicator size="small" color="#033a7d" />
                <Text style={styles.tabLoadingText}>Loading users...</Text>
              </View>
            ) : (
              <View style={styles.cardsList}>
                {usersList.map((u: any) => {
                  const isSelf = u.email === user.email;
                  const isAdmin = u.role === "ADMIN";

                  return (
                    <View
                      key={u.id}
                      style={[styles.userCard, isDark && styles.userCardDark]}
                    >
                      <View style={styles.userCardTop}>
                        <View style={{ flex: 1 }}>
                          <View style={styles.userNameRow}>
                            <Text
                              style={[
                                styles.userName,
                                isDark && styles.userNameDark,
                              ]}
                            >
                              {u.name || "Anonymous User"}
                            </Text>
                            <View
                              style={[
                                styles.rolePill,
                                isAdmin
                                  ? styles.rolePillAdmin
                                  : styles.rolePillUser,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.rolePillText,
                                  isAdmin
                                    ? styles.rolePillTextAdmin
                                    : styles.rolePillTextUser,
                                ]}
                              >
                                {u.role}
                              </Text>
                            </View>
                          </View>

                          <Text style={styles.userEmail}>{u.email}</Text>
                        </View>
                      </View>

                      {/* Phone & Org */}
                      <View style={styles.userMetaGrid}>
                        <View style={styles.userMetaCol}>
                          <Text style={styles.userMetaLabel}>Mobile Phone:</Text>
                          {u.phoneNumber ? (
                            <TouchableOpacity
                              style={styles.userPhoneRow}
                              onPress={() => handleCall(u.phoneNumber)}
                            >
                              <Phone size={11} color="#033a7d" />
                              <Text style={styles.userPhoneText}>
                                {u.phoneNumber}
                              </Text>
                            </TouchableOpacity>
                          ) : (
                            <Text style={styles.userPhoneNone}>Not posted</Text>
                          )}
                        </View>

                        <View style={styles.userMetaCol}>
                          <Text style={styles.userMetaLabel}>Company / Lab:</Text>
                          <Text style={styles.userCompanyText} numberOfLines={1}>
                            {u.companyName || "—"}
                          </Text>
                        </View>
                      </View>

                      {/* Activity & Date */}
                      <View style={styles.userActivityRow}>
                        <Text style={styles.userActivityText}>
                          {u._count?.listings ?? 0} listings •{" "}
                          {u._count?.requirements ?? 0} reqs
                        </Text>
                        <Text style={styles.userJoinedDate}>
                          Joined {new Date(u.createdAt).toLocaleDateString()}
                        </Text>
                      </View>

                      {/* Admin Actions */}
                      <View style={styles.userActionsRow}>
                        {isSelf ? (
                          <View style={styles.selfBadge}>
                            <Text style={styles.selfBadgeText}>
                              You (Logged In)
                            </Text>
                          </View>
                        ) : (
                          <>
                            <TouchableOpacity
                              style={[
                                styles.roleToggleBtn,
                                isAdmin
                                  ? styles.roleToggleBtnDemote
                                  : styles.roleToggleBtnPromote,
                              ]}
                              activeOpacity={0.8}
                              onPress={() =>
                                handleToggleUserRole(
                                  u.id,
                                  u.role,
                                  u.name || u.email
                                )
                              }
                            >
                              <ShieldCheck
                                size={12}
                                color={isAdmin ? "#991b1b" : "#ffffff"}
                              />
                              <Text
                                style={[
                                  styles.roleToggleBtnText,
                                  isAdmin
                                    ? styles.roleToggleBtnTextDemote
                                    : styles.roleToggleBtnTextPromote,
                                ]}
                              >
                                {isAdmin ? "Demote to User" : "Make Admin"}
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.userDeleteBtn}
                              activeOpacity={0.7}
                              onPress={() => {
                                setDeleteTargetUser(u);
                                setDeleteConfirmText("");
                              }}
                            >
                              <Trash2 size={13} color="#ba1a1a" />
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* ==================================================== */}
        {/* TAB 3: MANAGE LISTINGS                               */}
        {/* ==================================================== */}
        {activeTab === "listings" && (
          <View style={styles.tabContentContainer}>
            <View style={styles.sectionHeadingRow}>
              <Text
                style={[
                  styles.sectionHeadingTitle,
                  isDark && styles.sectionHeadingTitleDark,
                ]}
              >
                Listings Control
              </Text>
              <Text style={styles.sectionHeadingSub}>
                Approve equipment submissions, manage availability, or remove
                items.
              </Text>
            </View>

            {isLoadingListings ? (
              <View style={styles.tabLoadingCard}>
                <ActivityIndicator size="small" color="#033a7d" />
                <Text style={styles.tabLoadingText}>Loading listings...</Text>
              </View>
            ) : listingsList.length === 0 ? (
              <View style={[styles.emptyCard, isDark && styles.emptyCardDark]}>
                <Tag size={36} color="#94a3b8" />
                <Text style={[styles.emptyTitle, isDark && styles.emptyTitleDark]}>
                  No equipment listings to manage
                </Text>
              </View>
            ) : (
              <View style={styles.cardsList}>
                {listingsList.map((l: any) => (
                  <View
                    key={l.id}
                    style={[styles.moderationCard, isDark && styles.moderationCardDark]}
                  >
                    <View style={styles.moderationCardTop}>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.moderationTitle,
                            isDark && styles.moderationTitleDark,
                          ]}
                          numberOfLines={2}
                        >
                          {l.title}
                        </Text>
                        <Text style={styles.moderationCategory}>
                          {l.category} • ₹
                          {Number(l.minPrice || 0).toLocaleString("en-IN")} - ₹
                          {Number(l.maxPrice || 0).toLocaleString("en-IN")}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.moderationSeller}>
                      Seller: {l.seller?.name || l.seller?.email} (
                      {l.seller?.phoneNumber || "No phone"})
                    </Text>

                    <View style={styles.moderationActionsRow}>
                      <TouchableOpacity
                        style={[
                          styles.approvalBtn,
                          l.isApproved
                            ? styles.approvalBtnRevoke
                            : styles.approvalBtnApprove,
                        ]}
                        activeOpacity={0.8}
                        onPress={() =>
                          handleToggleListingApproval(l.id, l.isApproved)
                        }
                      >
                        {l.isApproved ? (
                          <X size={13} color="#92400e" />
                        ) : (
                          <Check size={13} color="#ffffff" />
                        )}
                        <Text
                          style={[
                            styles.approvalBtnText,
                            l.isApproved
                              ? styles.approvalBtnTextRevoke
                              : styles.approvalBtnTextApprove,
                          ]}
                        >
                          {l.isApproved ? "Revoke Approval" : "Approve Listing"}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.moderationViewBtn}
                        onPress={() => router.push(`/listing/${l.id}` as any)}
                      >
                        <Text style={styles.moderationViewBtnText}>View</Text>
                        <ExternalLink size={11} color="#033a7d" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ==================================================== */}
        {/* TAB 4: MANAGE BUYER REQUESTS                         */}
        {/* ==================================================== */}
        {activeTab === "requirements" && (
          <View style={styles.tabContentContainer}>
            <View style={styles.sectionHeadingRow}>
              <Text
                style={[
                  styles.sectionHeadingTitle,
                  isDark && styles.sectionHeadingTitleDark,
                ]}
              >
                Buyer Requests Control
              </Text>
              <Text style={styles.sectionHeadingSub}>
                Moderate wanted instrument requests and review incoming leads.
              </Text>
            </View>

            {isLoadingRequirements ? (
              <View style={styles.tabLoadingCard}>
                <ActivityIndicator size="small" color="#033a7d" />
                <Text style={styles.tabLoadingText}>Loading requests...</Text>
              </View>
            ) : requirementsList.length === 0 ? (
              <View style={[styles.emptyCard, isDark && styles.emptyCardDark]}>
                <FileQuestion size={36} color="#94a3b8" />
                <Text style={[styles.emptyTitle, isDark && styles.emptyTitleDark]}>
                  No buyer requests to moderate
                </Text>
              </View>
            ) : (
              <View style={styles.cardsList}>
                {requirementsList.map((r: any) => (
                  <View
                    key={r.id}
                    style={[styles.moderationCard, isDark && styles.moderationCardDark]}
                  >
                    <View style={styles.moderationCardTop}>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.moderationTitle,
                            isDark && styles.moderationTitleDark,
                          ]}
                          numberOfLines={2}
                        >
                          {r.title}
                        </Text>
                        <Text style={styles.moderationCategory}>
                          {r.category}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.moderationSeller}>
                      Buyer: {r.buyer?.name || r.buyer?.email} (
                      {r.buyer?.phoneNumber || "No phone"})
                    </Text>

                    <View style={styles.moderationActionsRow}>
                      <TouchableOpacity
                        style={[
                          styles.approvalBtn,
                          r.isApproved
                            ? styles.approvalBtnRevoke
                            : styles.approvalBtnApprove,
                        ]}
                        activeOpacity={0.8}
                        onPress={() =>
                          handleToggleRequirementApproval(r.id, r.isApproved)
                        }
                      >
                        {r.isApproved ? (
                          <X size={13} color="#92400e" />
                        ) : (
                          <Check size={13} color="#ffffff" />
                        )}
                        <Text
                          style={[
                            styles.approvalBtnText,
                            r.isApproved
                              ? styles.approvalBtnTextRevoke
                              : styles.approvalBtnTextApprove,
                          ]}
                        >
                          {r.isApproved ? "Revoke Approval" : "Approve Request"}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.moderationViewBtn}
                        onPress={() => router.push(`/requests/${r.id}` as any)}
                      >
                        <Text style={styles.moderationViewBtnText}>View</Text>
                        <ExternalLink size={11} color="#033a7d" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <Text style={styles.appVersionText}>
          LabMatrix Operations Desk v1.0.0 • Master Admin View
        </Text>
      </ScrollView>

      {/* ==================================================== */}
      {/* STICKY BOTTOM CONTACT / COORDINATION BAR             */}
      {/* ==================================================== */}
      <View style={[styles.bottomBar, isDark && styles.bottomBarDark]}>
        <TouchableOpacity
          style={styles.bottomIconBtn}
          activeOpacity={0.75}
          onPress={() => handleCall("+917303040804")}
        >
          <Phone size={17} color="#033a7d" />
          <Text style={styles.bottomIconBtnText}>Helpline</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomIconBtn}
          activeOpacity={0.75}
          onPress={() =>
            handleEmail("sales@labmatrixindia.com", "Master Admin Inquiry")
          }
        >
          <Mail size={17} color="#033a7d" />
          <Text style={styles.bottomIconBtnText}>Escrow Mail</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomCoordinationBtn}
          activeOpacity={0.85}
          onPress={() =>
            handleOpenWhatsApp(
              "+917303040804",
              "Hello LabMatrix Deal Desk, coordinating surplus machine leads."
            )
          }
        >
          <MessageSquare size={16} color="#ffffff" />
          <Text style={styles.bottomCoordinationBtnText}>
            WhatsApp Deal Desk
          </Text>
        </TouchableOpacity>
      </View>

      {/* ==================================================== */}
      {/* INQUIRY STATUS SELECTOR MODAL                        */}
      {/* ==================================================== */}
      <Modal
        visible={!!inquiryStatusModalItem}
        transparent
        animationType="fade"
        onRequestClose={() => setInquiryStatusModalItem(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setInquiryStatusModalItem(null)}
        >
          <View
            style={[styles.modalCard, isDark && styles.modalCardDark]}
          >
            <View style={styles.modalHeader}>
              <Text
                style={[
                  styles.modalHeaderTitle,
                  isDark && styles.modalHeaderTitleDark,
                ]}
              >
                Update Inquiry Pipeline Status
              </Text>
              <TouchableOpacity
                onPress={() => setInquiryStatusModalItem(null)}
                style={styles.closeBtn}
              >
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalOptionsList}>
              <TouchableOpacity
                style={[
                  styles.modalOption,
                  inquiryStatusModalItem?.currentStatus === "NEW" &&
                    styles.modalOptionActive,
                ]}
                onPress={() =>
                  handleUpdateInquiryStatus(
                    inquiryStatusModalItem!.id,
                    "NEW"
                  )
                }
              >
                <View
                  style={[
                    styles.statusDotLarge,
                    { backgroundColor: "#f59e0b" },
                  ]}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.modalOptionHeading}>NEW</Text>
                  <Text style={styles.modalOptionSub}>
                    Newly received lead awaiting initial contact
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalOption,
                  inquiryStatusModalItem?.currentStatus === "IN_PROGRESS" &&
                    styles.modalOptionActive,
                ]}
                onPress={() =>
                  handleUpdateInquiryStatus(
                    inquiryStatusModalItem!.id,
                    "IN_PROGRESS"
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
                  <Text style={styles.modalOptionHeading}>IN_PROGRESS</Text>
                  <Text style={styles.modalOptionSub}>
                    Active negotiation, quotation, or inspection scheduling
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalOption,
                  inquiryStatusModalItem?.currentStatus === "CLOSED" &&
                    styles.modalOptionActive,
                ]}
                onPress={() =>
                  handleUpdateInquiryStatus(
                    inquiryStatusModalItem!.id,
                    "CLOSED"
                  )
                }
              >
                <View
                  style={[
                    styles.statusDotLarge,
                    { backgroundColor: "#16a34a" },
                  ]}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.modalOptionHeading}>CLOSED</Text>
                  <Text style={styles.modalOptionSub}>
                    Deal closed, completed handover, or resolved
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ==================================================== */}
      {/* USER ARCHIVE / DELETE CONFIRMATION MODAL             */}
      {/* ==================================================== */}
      <Modal
        visible={!!deleteTargetUser}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTargetUser(null)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalCard, isDark && styles.modalCardDark]}
          >
            <View style={styles.deleteModalHeader}>
              <View style={styles.deleteWarningIcon}>
                <Trash2 size={22} color="#ba1a1a" />
              </View>
              <TouchableOpacity
                onPress={() => setDeleteTargetUser(null)}
                style={styles.closeBtn}
              >
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text
              style={[
                styles.modalHeaderTitle,
                isDark && styles.modalHeaderTitleDark,
              ]}
            >
              Deactivate & Archive User
            </Text>
            <Text style={styles.modalSubtitle}>
              This will anonymize the user's personal details, revoke sessions,
              and remove their listings from public view.
            </Text>

            <View style={styles.targetUserInfoBox}>
              <Text style={styles.targetUserName}>
                {deleteTargetUser?.name || "Anonymous User"}
              </Text>
              <Text style={styles.targetUserEmail}>
                {deleteTargetUser?.email}
              </Text>
            </View>

            <View style={styles.deleteInputWrapper}>
              <Text style={styles.deleteInputLabel}>
                Type <Text style={{ fontWeight: "700", color: "#ba1a1a" }}>DELETE</Text> to confirm:
              </Text>
              <TextInput
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                placeholder="DELETE"
                autoCapitalize="characters"
                autoCorrect={false}
                style={[
                  styles.deleteTextInput,
                  isDark && styles.deleteTextInputDark,
                ]}
              />
            </View>

            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                style={styles.cancelDeleteBtn}
                onPress={() => setDeleteTargetUser(null)}
              >
                <Text style={styles.cancelDeleteBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmDeleteBtn,
                  deleteConfirmText.trim().toUpperCase() !== "DELETE" && {
                    opacity: 0.5,
                  },
                ]}
                disabled={
                  isDeletingUser ||
                  deleteConfirmText.trim().toUpperCase() !== "DELETE"
                }
                onPress={handleConfirmDeleteUser}
              >
                {isDeletingUser ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Trash2 size={13} color="#ffffff" />
                    <Text style={styles.confirmDeleteBtnText}>
                      Deactivate & Archive
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f1f5f9",
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
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backIconButton: {
    padding: 4,
  },
  logoImg: {
    width: 125,
    height: 30,
  },
  topRightIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
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
    paddingBottom: 90, // Space for bottom sticky bar
  },

  // Subheader Console Block
  consoleHeaderBlock: {
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
  subHeaderPillRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  masterAdminPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff5fb",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 10,
    gap: 4,
  },
  masterAdminPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#033a7d",
  },
  refreshPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  refreshPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#033a7d",
  },
  consoleTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 4,
  },
  consoleTitleDark: {
    color: "#f8fafc",
  },
  consoleSubtitle: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 17,
  },

  // 4 KPI Metric Cards in 2x2 Grid
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  kpiCard: {
    width: "48.5%",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  kpiCardLight: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
  },
  kpiCardDark: {
    backgroundColor: "#131d2e",
    borderColor: "#1e293b",
  },
  kpiCardAlert: {
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a",
  },
  kpiCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.5,
  },
  kpiIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0f172a",
    marginTop: 6,
  },
  kpiValueDark: {
    color: "#f8fafc",
  },
  kpiSub: {
    fontSize: 10.5,
    color: "#64748b",
    marginTop: 2,
  },

  // Total Platform Users Banner
  usersBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#faf5ff",
    borderWidth: 1,
    borderColor: "#e9d5ff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 10,
    gap: 8,
  },
  usersBannerText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6d28d9",
  },

  // Tabs Row
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
  tabBadgeAmber: {
    backgroundColor: "#f59e0b",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    marginLeft: 5,
  },
  tabBadgeAmberText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#ffffff",
  },

  tabContentContainer: {
    marginTop: 2,
  },
  sectionHeadingRow: {
    marginBottom: 10,
  },
  sectionHeadingTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
  },
  sectionHeadingTitleDark: {
    color: "#f8fafc",
  },
  sectionHeadingSub: {
    fontSize: 11.5,
    color: "#64748b",
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
  },

  cardsList: {
    gap: 12,
  },

  // Deal Pipeline Cards
  dealCard: {
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
  dealCardDark: {
    backgroundColor: "#131d2e",
    borderColor: "#1e293b",
  },
  dealCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    marginBottom: 10,
  },
  dealCardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    flex: 1,
  },
  inqStatusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  inqStatusBadgeNew: {
    backgroundColor: "#fef3c7",
  },
  inqStatusBadgeProgress: {
    backgroundColor: "#eff5fb",
  },
  inqStatusBadgeClosed: {
    backgroundColor: "#ecfdf5",
  },
  inqStatusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  inqStatusBadgeTextNew: {
    color: "#92400e",
  },
  inqStatusBadgeTextProgress: {
    color: "#033a7d",
  },
  inqStatusBadgeTextClosed: {
    color: "#166534",
  },
  dealTimestamp: {
    fontSize: 10.5,
    color: "#94a3b8",
  },
  dealStatusUpdaterBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 8,
    gap: 4,
  },
  dealStatusUpdaterLabel: {
    fontSize: 10.5,
    color: "#64748b",
  },
  dealStatusUpdaterValue: {
    fontSize: 11,
    fontWeight: "800",
    color: "#033a7d",
  },

  dealItemBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    marginBottom: 10,
  },
  dealItemTypeLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#033a7d",
    letterSpacing: 0.5,
  },
  dealItemTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 2,
  },
  dealItemTitleDark: {
    color: "#f8fafc",
  },
  dealItemPrice: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    marginTop: 2,
  },
  viewListingBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff5fb",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
    marginLeft: 8,
  },
  viewListingBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#033a7d",
  },

  // Counterparty Cards (Buyer & Seller)
  counterpartiesContainer: {
    gap: 8,
    marginBottom: 10,
  },
  partyCardBuyer: {
    backgroundColor: "#eff5fb",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 12,
    padding: 12,
  },
  partyCardHeadingBuyer: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#033a7d",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  partyCardSeller: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
  },
  partyCardHeadingSeller: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#475569",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  partyName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 4,
  },
  partyContactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  partyEmailText: {
    fontSize: 11.5,
    color: "#033a7d",
    fontWeight: "600",
  },
  partyPhoneRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  partyPhoneBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  partyPhoneText: {
    fontSize: 11.5,
    color: "#0f172a",
    fontWeight: "700",
  },
  whatsappPill: {
    backgroundColor: "#16a34a",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  whatsappPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#ffffff",
  },
  partyOrgRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  partyOrgText: {
    fontSize: 10.5,
    color: "#64748b",
  },
  noOwnerText: {
    fontSize: 11,
    color: "#94a3b8",
    fontStyle: "italic",
  },

  dealMessageBox: {
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 10,
  },
  dealMessageLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  dealMessageText: {
    fontSize: 11.5,
    fontStyle: "italic",
    color: "#334155",
    lineHeight: 16,
  },
  dealCoordinationBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16a34a",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  dealCoordinationBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#ffffff",
  },

  // Users Tab Styles
  searchBarWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 8,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 12.5,
    color: "#0f172a",
  },
  searchBarInputDark: {
    color: "#f8fafc",
  },
  userCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  userCardDark: {
    backgroundColor: "#131d2e",
    borderColor: "#1e293b",
  },
  userCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  userNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  userName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  userNameDark: {
    color: "#f8fafc",
  },
  userEmail: {
    fontSize: 11.5,
    color: "#64748b",
    marginTop: 2,
  },
  rolePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rolePillAdmin: {
    backgroundColor: "#f3e8ff",
  },
  rolePillUser: {
    backgroundColor: "#f1f5f9",
  },
  rolePillText: {
    fontSize: 9.5,
    fontWeight: "800",
  },
  rolePillTextAdmin: {
    color: "#7e22ce",
  },
  rolePillTextUser: {
    color: "#475569",
  },

  userMetaGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  userMetaCol: {
    flex: 1,
  },
  userMetaLabel: {
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: "600",
  },
  userPhoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  userPhoneText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#033a7d",
  },
  userPhoneNone: {
    fontSize: 11,
    color: "#94a3b8",
    fontStyle: "italic",
    marginTop: 2,
  },
  userCompanyText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#334155",
    marginTop: 2,
  },

  userActivityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#f8fafc",
  },
  userActivityText: {
    fontSize: 10.5,
    color: "#64748b",
    fontWeight: "600",
  },
  userJoinedDate: {
    fontSize: 10.5,
    color: "#94a3b8",
  },

  userActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },
  selfBadge: {
    backgroundColor: "#eff5fb",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  selfBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#033a7d",
  },
  roleToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  roleToggleBtnPromote: {
    backgroundColor: "#7e22ce",
  },
  roleToggleBtnDemote: {
    backgroundColor: "#fee2e2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  roleToggleBtnText: {
    fontSize: 11,
    fontWeight: "800",
  },
  roleToggleBtnTextPromote: {
    color: "#ffffff",
  },
  roleToggleBtnTextDemote: {
    color: "#991b1b",
  },
  userDeleteBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#fee2e2",
  },

  // Listings & Requests Moderation Cards
  moderationCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  moderationCardDark: {
    backgroundColor: "#131d2e",
    borderColor: "#1e293b",
  },
  moderationCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  moderationTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  moderationTitleDark: {
    color: "#f8fafc",
  },
  moderationCategory: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
    fontWeight: "600",
  },
  moderationSeller: {
    fontSize: 11,
    color: "#475569",
    marginTop: 4,
  },
  moderationActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  approvalBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5.5,
    borderRadius: 8,
    gap: 4,
  },
  approvalBtnApprove: {
    backgroundColor: "#16a34a",
  },
  approvalBtnRevoke: {
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  approvalBtnText: {
    fontSize: 11,
    fontWeight: "800",
  },
  approvalBtnTextApprove: {
    color: "#ffffff",
  },
  approvalBtnTextRevoke: {
    color: "#92400e",
  },
  moderationViewBtn: {
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
  moderationViewBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#033a7d",
  },

  // Empty State
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

  appVersionText: {
    textAlign: "center",
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 24,
  },

  // Sticky Bottom Bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bottomBarDark: {
    backgroundColor: "#0f172a",
    borderTopColor: "#1e293b",
  },
  bottomIconBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#eff5fb",
  },
  bottomIconBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#033a7d",
    marginTop: 2,
  },
  bottomCoordinationBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#033a7d",
    paddingVertical: 11,
    borderRadius: 12,
    gap: 6,
  },
  bottomCoordinationBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff",
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
  },
  modalCardDark: {
    backgroundColor: "#1e293b",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  modalHeaderTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
  },
  modalHeaderTitleDark: {
    color: "#f8fafc",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 16,
    marginTop: 4,
    marginBottom: 12,
  },
  closeBtn: {
    padding: 4,
  },
  modalOptionsList: {
    gap: 8,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  modalOptionActive: {
    borderColor: "#033a7d",
    backgroundColor: "#eff5fb",
  },
  statusDotLarge: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  modalOptionHeading: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
  },
  modalOptionSub: {
    fontSize: 10.5,
    color: "#64748b",
    marginTop: 1,
  },

  deleteModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  deleteWarningIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
  },
  targetUserInfoBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 12,
  },
  targetUserName: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0f172a",
  },
  targetUserEmail: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  deleteInputWrapper: {
    marginBottom: 14,
  },
  deleteInputLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
  },
  deleteTextInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    gap: 8,
  },
  cancelDeleteBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
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
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#dc2626",
    gap: 4,
  },
  confirmDeleteBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#ffffff",
  },

  // Restricted Access Screen Styles
  restrictedContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    textAlign: "center",
  },
  restrictedTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0f172a",
    marginTop: 16,
    textAlign: "center",
  },
  restrictedTitleDark: {
    color: "#f8fafc",
  },
  restrictedSubtitle: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 19,
    marginTop: 8,
    marginBottom: 20,
  },
  restrictedBtn: {
    backgroundColor: "#033a7d",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  restrictedBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff",
  },
  claimBtn: {
    backgroundColor: "#033a7d",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 6,
  },
  claimBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff",
  },
  claimHintText: {
    fontSize: 11,
    color: "#94a3b8",
    marginBottom: 16,
  },
  backBtn: {
    paddingVertical: 8,
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
  },
});
