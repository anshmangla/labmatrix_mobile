import React, { useState } from "react";
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
  SafeAreaView,
  StatusBar,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
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
  Headphones,
  CheckCircle2,
  FileText,
  ArrowRight,
  Bell,
  Sparkles,
  AlertTriangle,
  X,
} from "lucide-react-native";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { LabMatrixTokens } from "@/constants/theme";

export default function ProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { colors } = LabMatrixTokens;
  const { user, isAuthenticated, logout } = useAuth();
  const queryClient = useQueryClient();

  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: myItems, isLoading: isLoadingItems } = useQuery({
    queryKey: ["myItems"],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await api.get("/api/user/my-items");
      return res.data as { listings: any[]; requirements: any[] };
    },
  });

  const { data: inquiriesData } = useQuery({
    queryKey: ["inquiries"],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await api.get("/api/inquiries");
      return res.data as { received: any[]; sent: any[] };
    },
  });

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out of your LabMatrix session?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation.trim() !== "DELETE") {
      Alert.alert("Confirmation Required", 'Please type "DELETE" to permanently remove your account.');
      return;
    }

    setIsDeleting(true);
    try {
      await api.post("/api/user/delete-account", { confirmation: "DELETE" });
      setIsDeleteModalVisible(false);
      Alert.alert("Account Deleted", "Your account and associated data have been permanently removed.");
      await logout();
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.error || "Could not delete account.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCallSupport = () => {
    Linking.openURL("tel:+917303040804").catch(() => {
      Alert.alert("Support Desk", "Helpline: +91 73030 40804\nAvailable Mon-Sat 9AM - 7PM IST");
    });
  };

  const handleEmailSupport = () => {
    Linking.openURL("mailto:sales@labmatrixindia.com?subject=Platform%20Assistance").catch(() => {
      Alert.alert("Support Desk", "Email: sales@labmatrixindia.com");
    });
  };

  // Logged-out State
  if (!isAuthenticated || !user) {
    return (
      <SafeAreaView style={[styles.safeArea, isDark && styles.safeAreaDark]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={[styles.topBar, isDark && styles.topBarDark]}>
          <Image
            source={require("@/assets/images/logo.png")}
            style={styles.logoImg}
            resizeMode="contain"
          />
        </View>

        <ScrollView contentContainerStyle={styles.loggedOutScroll}>
          <View style={styles.loggedOutHero}>
            <View style={styles.loggedOutIconCircle}>
              <UserIcon size={42} color="#033a7d" />
            </View>
            <Text style={[styles.loggedOutTitle, isDark && styles.loggedOutTitleDark]}>
              Welcome to LabMatrix
            </Text>
            <Text style={styles.loggedOutSubtitle}>
              India's premier verified clinical & analytical surplus equipment marketplace.
            </Text>
          </View>

          {/* Value Props Card */}
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
                  Every instrument undergoes optical & electronic diagnostic inspection prior to dispatch.
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
              <Text style={styles.secondaryRegisterBtnText}>Register Facility Account</Text>
              <ArrowRight size={16} color="#033a7d" />
            </TouchableOpacity>
          </View>

          {/* Support Helpline Footer */}
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

  const listingsCount = myItems?.listings?.length || 0;
  const requirementsCount = myItems?.requirements?.length || 0;
  const inquiriesCount = (inquiriesData?.received?.length || 0) + (inquiriesData?.sent?.length || 0);

  return (
    <SafeAreaView style={[styles.safeArea, isDark && styles.safeAreaDark]}>
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
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. Dark Navy Verified Scientist / Lab Profile Banner */}
        <View style={styles.profileHeroCard}>
          <View style={styles.profileTopRow}>
            <View style={styles.heroAvatarContainer}>
              <View style={styles.heroAvatar}>
                <UserIcon size={30} color="#ffffff" />
              </View>
              <View style={styles.verifiedDot}>
                <CheckCircle2 size={12} color="#ffffff" />
              </View>
            </View>

            <View style={styles.heroTextCol}>
              <Text style={styles.heroName} numberOfLines={1}>
                {user.name || "Laboratory Representative"}
              </Text>
              <Text style={styles.heroEmail} numberOfLines={1}>
                {user.email}
              </Text>

              <View style={styles.roleBadgeContainer}>
                <View style={styles.roleBadgePill}>
                  <ShieldCheck size={11} color="#fbc634" />
                  <Text style={styles.roleBadgeText}>
                    {user.role === "ADMIN" ? "ADMINISTRATOR" : "VERIFIED FACILITY"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Details Row: Phone & Org */}
          {(user.phoneNumber || user.companyName) && (
            <View style={styles.heroMetaRow}>
              {user.companyName ? (
                <View style={styles.metaItem}>
                  <Building2 size={12} color="#81a6f0" />
                  <Text style={styles.metaItemText} numberOfLines={1}>
                    {user.companyName}
                  </Text>
                </View>
              ) : null}

              {user.phoneNumber ? (
                <View style={styles.metaItem}>
                  <Phone size={12} color="#81a6f0" />
                  <Text style={styles.metaItemText}>{user.phoneNumber}</Text>
                </View>
              ) : null}
            </View>
          )}
        </View>

        {/* 3. Activity Metrics Row */}
        <View style={[styles.statsContainer, isDark && styles.statsContainerDark]}>
          <TouchableOpacity
            style={styles.statBox}
            activeOpacity={0.8}
            onPress={() => router.push("/(tabs)/sell" as any)}
          >
            <View style={[styles.statIconCircle, { backgroundColor: "#eff5fb" }]}>
              <Package size={18} color="#033a7d" />
            </View>
            <Text style={[styles.statValue, isDark && styles.statValueDark]}>{listingsCount}</Text>
            <Text style={styles.statLabel}>My Listings</Text>
          </TouchableOpacity>

          <View style={styles.statDivider} />

          <TouchableOpacity
            style={styles.statBox}
            activeOpacity={0.8}
            onPress={() => router.push("/(tabs)/requests" as any)}
          >
            <View style={[styles.statIconCircle, { backgroundColor: "#fdf4ff" }]}>
              <ClipboardList size={18} color="#a21caf" />
            </View>
            <Text style={[styles.statValue, isDark && styles.statValueDark]}>{requirementsCount}</Text>
            <Text style={styles.statLabel}>My Requests</Text>
          </TouchableOpacity>

          <View style={styles.statDivider} />

          <TouchableOpacity
            style={styles.statBox}
            activeOpacity={0.8}
            onPress={() => router.push("/(tabs)/inquiries" as any)}
          >
            <View style={[styles.statIconCircle, { backgroundColor: "#fef3c7" }]}>
              <MessageSquare size={18} color="#b45309" />
            </View>
            <Text style={[styles.statValue, isDark && styles.statValueDark]}>{inquiriesCount}</Text>
            <Text style={styles.statLabel}>Active Deals</Text>
          </TouchableOpacity>
        </View>

        {/* 4. Quick Action Shortcuts */}
        <View style={[styles.menuSection, isDark && styles.menuSectionDark]}>
          <Text style={styles.menuSectionHeader}>EQUIPMENT MANAGEMENT</Text>

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => router.push("/(tabs)/sell" as any)}
          >
            <View style={[styles.menuIconBox, { backgroundColor: "#eff5fb" }]}>
              <Package size={18} color="#033a7d" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuItemTitle, isDark && styles.menuItemTitleDark]}>
                Post Equipment or Spare Parts
              </Text>
              <Text style={styles.menuItemSubtitle}>List machines for sale across India</Text>
            </View>
            <ChevronRight size={18} color="#94a3b8" />
          </TouchableOpacity>

          <View style={styles.menuItemDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => router.push("/(tabs)/requests" as any)}
          >
            <View style={[styles.menuIconBox, { backgroundColor: "#fdf4ff" }]}>
              <ClipboardList size={18} color="#a21caf" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuItemTitle, isDark && styles.menuItemTitleDark]}>
                Post Sourcing Requirement
              </Text>
              <Text style={styles.menuItemSubtitle}>Procure hard-to-find lab spares & instruments</Text>
            </View>
            <ChevronRight size={18} color="#94a3b8" />
          </TouchableOpacity>

          <View style={styles.menuItemDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => router.push("/(tabs)/inquiries" as any)}
          >
            <View style={[styles.menuIconBox, { backgroundColor: "#fef3c7" }]}>
              <MessageSquare size={18} color="#b45309" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuItemTitle, isDark && styles.menuItemTitleDark]}>
                Direct Inquiries & Quotes
              </Text>
              <Text style={styles.menuItemSubtitle}>Review counterparty messages & offers</Text>
            </View>
            <ChevronRight size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* 5. Support & Escrow Assistance */}
        <View style={[styles.menuSection, isDark && styles.menuSectionDark]}>
          <Text style={styles.menuSectionHeader}>HELP & VERIFICATION DESK</Text>

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={handleCallSupport}
          >
            <View style={[styles.menuIconBox, { backgroundColor: "#eff5fb" }]}>
              <Phone size={18} color="#033a7d" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuItemTitle, isDark && styles.menuItemTitleDark]}>
                Technical Helpline (+91 73030 40804)
              </Text>
              <Text style={styles.menuItemSubtitle}>Mon-Sat 9AM-7PM IST direct engineer support</Text>
            </View>
            <ExternalLink size={16} color="#033a7d" />
          </TouchableOpacity>

          <View style={styles.menuItemDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={handleEmailSupport}
          >
            <View style={[styles.menuIconBox, { backgroundColor: "#f0fdf4" }]}>
              <Mail size={18} color="#15803d" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuItemTitle, isDark && styles.menuItemTitleDark]}>
                Email Escrow & Support Desk
              </Text>
              <Text style={styles.menuItemSubtitle}>sales@labmatrixindia.com</Text>
            </View>
            <ExternalLink size={16} color="#15803d" />
          </TouchableOpacity>
        </View>

        {/* 6. Account Actions: Sign Out & Delete */}
        <View style={styles.accountActionsContainer}>
          <TouchableOpacity
            style={styles.signOutBtn}
            activeOpacity={0.8}
            onPress={handleLogout}
          >
            <LogOut size={16} color="#ba1a1a" />
            <Text style={styles.signOutBtnText}>Sign Out of Session</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteAccountBtn}
            activeOpacity={0.7}
            onPress={() => setIsDeleteModalVisible(true)}
          >
            <Trash2 size={14} color="#94a3b8" />
            <Text style={styles.deleteAccountBtnText}>Delete LabMatrix Account</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.appVersionText}>
          LabMatrix Surplus Mobile v1.0.0 • Verified Clinical Network
        </Text>
      </ScrollView>

      {/* Account Deletion Confirmation Modal */}
      <Modal
        visible={isDeleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.deleteModalCard, isDark && styles.deleteModalCardDark]}>
            <View style={styles.deleteModalHeader}>
              <View style={styles.deleteWarningIcon}>
                <AlertTriangle size={24} color="#ba1a1a" />
              </View>
              <TouchableOpacity
                onPress={() => setIsDeleteModalVisible(false)}
                style={styles.closeModalBtn}
              >
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={[styles.deleteModalTitle, isDark && styles.deleteModalTitleDark]}>
              Delete Your Account?
            </Text>
            <Text style={styles.deleteModalDesc}>
              This action is permanent and cannot be undone. All your active equipment listings,
              sourcing requests, and inquiry messages will be erased immediately.
            </Text>

            <Text style={styles.deleteConfirmationLabel}>
              Type <Text style={{ fontWeight: "800", color: "#ba1a1a" }}>DELETE</Text> below to confirm:
            </Text>
            <TextInput
              style={[styles.deleteInput, isDark && styles.deleteInputDark]}
              value={deleteConfirmation}
              onChangeText={setDeleteConfirmation}
              placeholder="DELETE"
              placeholderTextColor="#94a3b8"
              autoCapitalize="characters"
            />

            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => {
                  setIsDeleteModalVisible(false);
                  setDeleteConfirmation("");
                }}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmDeleteBtn,
                  deleteConfirmation.trim() !== "DELETE" && styles.confirmDeleteBtnDisabled,
                ]}
                disabled={deleteConfirmation.trim() !== "DELETE" || isDeleting}
                onPress={handleDeleteAccount}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.confirmDeleteBtnText}>Permanently Delete</Text>
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
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  profileHeroCard: {
    backgroundColor: "#011936",
    borderRadius: 14,
    padding: 18,
    gap: 14,
  },
  profileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  heroAvatarContainer: {
    position: "relative",
  },
  heroAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#033a7d",
    borderWidth: 2,
    borderColor: "#fdc836",
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#15803d",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#011936",
  },
  heroTextCol: {
    flex: 1,
  },
  heroName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.3,
  },
  heroEmail: {
    fontSize: 13,
    color: "#cbd5e1",
    marginTop: 2,
  },
  roleBadgeContainer: {
    marginTop: 6,
    flexDirection: "row",
  },
  roleBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(253, 200, 54, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(253, 200, 54, 0.4)",
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#fdc836",
    letterSpacing: 0.4,
  },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.12)",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaItemText: {
    fontSize: 12,
    color: "#cbd5e1",
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  statsContainerDark: {
    backgroundColor: "#03142e",
    borderColor: "#1e293b",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  statValueDark: {
    color: "#f8fafc",
  },
  statLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 4,
  },
  menuSection: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  menuSectionDark: {
    backgroundColor: "#03142e",
    borderColor: "#1e293b",
  },
  menuSectionHeader: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.6,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  menuItemTitleDark: {
    color: "#f8fafc",
  },
  menuItemSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 1,
  },
  menuItemDivider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginLeft: 64,
  },
  accountActionsContainer: {
    gap: 10,
    marginTop: 6,
    alignItems: "center",
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    backgroundColor: "#fff1f2",
    borderWidth: 1,
    borderColor: "#fecdd3",
    paddingVertical: 12,
    borderRadius: 10,
  },
  signOutBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ba1a1a",
  },
  deleteAccountBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
  },
  deleteAccountBtnText: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
  },
  appVersionText: {
    fontSize: 11,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    padding: 20,
  },
  deleteModalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  deleteModalCardDark: {
    backgroundColor: "#011936",
  },
  deleteModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  deleteWarningIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
  },
  closeModalBtn: {
    padding: 4,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  deleteModalTitleDark: {
    color: "#f8fafc",
  },
  deleteModalDesc: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 18,
  },
  deleteConfirmationLabel: {
    fontSize: 12,
    color: "#0f172a",
    marginTop: 6,
  },
  deleteInput: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "700",
    letterSpacing: 1,
  },
  deleteInputDark: {
    borderColor: "#334155",
    color: "#f8fafc",
    backgroundColor: "#020d1c",
  },
  deleteModalActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  cancelModalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  cancelModalBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
  },
  confirmDeleteBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#ba1a1a",
    alignItems: "center",
  },
  confirmDeleteBtnDisabled: {
    opacity: 0.5,
  },
  confirmDeleteBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff",
  },
  loggedOutScroll: {
    padding: 20,
    gap: 20,
    paddingBottom: 40,
  },
  loggedOutHero: {
    alignItems: "center",
    paddingVertical: 16,
    gap: 10,
  },
  loggedOutIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#eff5fb",
    alignItems: "center",
    justifyContent: "center",
  },
  loggedOutTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
  },
  loggedOutTitleDark: {
    color: "#f8fafc",
  },
  loggedOutSubtitle: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 320,
  },
  benefitsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  benefitsCardDark: {
    backgroundColor: "#03142e",
    borderColor: "#1e293b",
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  benefitHeading: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  benefitHeadingDark: {
    color: "#f8fafc",
  },
  benefitDesc: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
    lineHeight: 16,
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
    paddingVertical: 14,
    borderRadius: 10,
  },
  primaryLoginBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
  secondaryRegisterBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbeaf7",
    paddingVertical: 14,
    borderRadius: 10,
  },
  secondaryRegisterBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#033a7d",
  },
  supportFooter: {
    alignItems: "center",
    paddingTop: 8,
  },
  supportFooterText: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
  },
});
