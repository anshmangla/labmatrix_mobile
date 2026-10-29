import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  useColorScheme,
  Linking,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  X,
  User as UserIcon,
  Mail,
  Building2,
  ShieldCheck,
  LogOut,
  Package,
  Settings,
  MessageSquare,
  Phone,
  ChevronRight,
  CheckCircle2,
  Shield,
  FileQuestion,
  ExternalLink,
} from "lucide-react-native";
import { useAuth } from "@/context/auth-context";

interface ProfileQuickMenuModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenEscrow?: () => void;
}

export function ProfileQuickMenuModal({
  visible,
  onClose,
  onOpenEscrow,
}: ProfileQuickMenuModalProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, logout } = useAuth();

  if (!visible) return null;

  // Initials generator
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

  const userInitials = getInitials(user?.name, user?.email);
  const isAdmin = user?.role === "ADMIN";

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out of your LabMatrix session?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            onClose();
            try {
              await logout();
              router.replace("/(auth)/login" as any);
            } catch (e) {
              console.error("Sign out error:", e);
            }
          },
        },
      ]
    );
  };

  const handleCallSupport = () => {
    Linking.openURL("tel:+917303040804").catch(() => {
      Alert.alert(
        "Support Helpline",
        "Call: +91 73030 40804\nEmail: contact@labmatrixindia.com"
      );
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View
              style={[
                styles.sheetContainer,
                isDark && styles.sheetContainerDark,
                { paddingBottom: Math.max(insets.bottom, 20) },
              ]}
            >
              {/* Handle Indicator */}
              <View style={styles.dragHandle} />

              {/* Header Title & Close */}
              <View style={styles.headerRow}>
                <View style={styles.headerTitleCol}>
                  <Text style={[styles.sheetTitle, isDark && styles.sheetTitleDark]}>
                    LabMatrix Account
                  </Text>
                  <Text style={styles.sheetSub}>
                    Verified Analytical Surplus Exchange
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.closeBtn, isDark && styles.closeBtnDark]}
                  activeOpacity={0.7}
                  onPress={onClose}
                  accessibilityLabel="Close Menu"
                >
                  <X size={18} color={isDark ? "#cbd5e1" : "#475569"} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.scrollList}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {/* User Identity Card */}
                {isAuthenticated && user ? (
                  <View
                    style={[
                      styles.userCard,
                      isDark && styles.userCardDark,
                    ]}
                  >
                    <View style={styles.avatarRow}>
                      <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>{userInitials}</Text>
                      </View>

                      <View style={styles.userInfoCol}>
                        <View style={styles.nameRow}>
                          <Text
                            style={[
                              styles.userName,
                              isDark && styles.userNameDark,
                            ]}
                            numberOfLines={1}
                          >
                            {user.name || "Laboratory Member"}
                          </Text>
                          {isAdmin ? (
                            <View style={styles.adminPill}>
                              <ShieldCheck size={11} color="#033a7d" />
                              <Text style={styles.adminPillText}>ADMIN</Text>
                            </View>
                          ) : (
                            <View style={styles.verifiedPill}>
                              <CheckCircle2 size={11} color="#059669" />
                              <Text style={styles.verifiedPillText}>VERIFIED LAB</Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.metaLine}>
                          <Mail size={12} color="#64748b" style={{ marginRight: 6 }} />
                          <Text style={styles.userEmail} numberOfLines={1}>
                            {user.email}
                          </Text>
                        </View>

                        {user.companyName ? (
                          <View style={styles.metaLine}>
                            <Building2 size={12} color="#64748b" style={{ marginRight: 6 }} />
                            <Text style={styles.userCompany} numberOfLines={1}>
                              {user.companyName}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.loggedOutPrompt, isDark && styles.loggedOutPromptDark]}>
                    <Text style={[styles.loggedOutTitle, isDark && styles.loggedOutTitleDark]}>
                      You are browsing as a Guest
                    </Text>
                    <TouchableOpacity
                      style={styles.signInDirectBtn}
                      activeOpacity={0.85}
                      onPress={() => {
                        onClose();
                        router.push("/(auth)/login" as any);
                      }}
                    >
                      <Text style={styles.signInDirectBtnText}>Sign In / Register</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Navigation Items */}
                <View style={styles.menuSection}>
                  {/* 1. Profile & Inventory */}
                  <TouchableOpacity
                    style={[styles.menuItem, isDark && styles.menuItemDark]}
                    activeOpacity={0.7}
                    onPress={() => {
                      onClose();
                      router.push("/(tabs)/profile" as any);
                    }}
                  >
                    <View style={[styles.menuIconBox, { backgroundColor: "#eff6ff" }]}>
                      <Package size={18} color="#033a7d" />
                    </View>
                    <View style={styles.menuTextCol}>
                      <Text style={[styles.menuItemTitle, isDark && styles.menuItemTitleDark]}>
                        My Profile & Inventory
                      </Text>
                      <Text style={styles.menuItemSub}>
                        View your listed instruments, active RFQs & quotes
                      </Text>
                    </View>
                    <ChevronRight size={16} color="#94a3b8" />
                  </TouchableOpacity>

                  {/* 2. Inquiries & Deal Desk */}
                  <TouchableOpacity
                    style={[styles.menuItem, isDark && styles.menuItemDark]}
                    activeOpacity={0.7}
                    onPress={() => {
                      onClose();
                      router.push("/(tabs)/inquiries" as any);
                    }}
                  >
                    <View style={[styles.menuIconBox, { backgroundColor: "#f0fdf4" }]}>
                      <MessageSquare size={18} color="#15803d" />
                    </View>
                    <View style={styles.menuTextCol}>
                      <Text style={[styles.menuItemTitle, isDark && styles.menuItemTitleDark]}>
                        Inquiries & Deal Desk
                      </Text>
                      <Text style={styles.menuItemSub}>
                        Buyer proposals, WhatsApp deals & quotes
                      </Text>
                    </View>
                    <ChevronRight size={16} color="#94a3b8" />
                  </TouchableOpacity>

                  {/* 3. Operations & Deal Console (Master Admin Only) */}
                  {isAdmin && (
                    <TouchableOpacity
                      style={[
                        styles.menuItem,
                        styles.adminMenuItem,
                        isDark && styles.adminMenuItemDark,
                      ]}
                      activeOpacity={0.7}
                      onPress={() => {
                        onClose();
                        router.push("/admin" as any);
                      }}
                    >
                      <View style={[styles.menuIconBox, { backgroundColor: "#fef3c7" }]}>
                        <ShieldCheck size={18} color="#b45309" />
                      </View>
                      <View style={styles.menuTextCol}>
                        <Text style={[styles.menuItemTitle, { color: "#b45309", fontWeight: "800" }]}>
                          Operations & Deal Console
                        </Text>
                        <Text style={styles.menuItemSub}>
                          Master Admin pipeline, deal desk & moderation
                        </Text>
                      </View>
                      <ChevronRight size={16} color="#b45309" />
                    </TouchableOpacity>
                  )}

                  {/* 4. Account Settings */}
                  <TouchableOpacity
                    style={[styles.menuItem, isDark && styles.menuItemDark]}
                    activeOpacity={0.7}
                    onPress={() => {
                      onClose();
                      router.push({
                        pathname: "/(tabs)/profile",
                        params: { tab: "settings" },
                      } as any);
                    }}
                  >
                    <View style={[styles.menuIconBox, { backgroundColor: "#f1f5f9" }]}>
                      <Settings size={18} color="#475569" />
                    </View>
                    <View style={styles.menuTextCol}>
                      <Text style={[styles.menuItemTitle, isDark && styles.menuItemTitleDark]}>
                        Account Settings & Security
                      </Text>
                      <Text style={styles.menuItemSub}>
                        Mobile verification, password & lab details
                      </Text>
                    </View>
                    <ChevronRight size={16} color="#94a3b8" />
                  </TouchableOpacity>

                  {/* 5. Escrow & Trust Policy */}
                  <TouchableOpacity
                    style={[styles.menuItem, isDark && styles.menuItemDark]}
                    activeOpacity={0.7}
                    onPress={() => {
                      onClose();
                      if (onOpenEscrow) {
                        onOpenEscrow();
                      } else {
                        Linking.openURL("https://surplus.labmatrixindia.com/contact").catch(() => {});
                      }
                    }}
                  >
                    <View style={[styles.menuIconBox, { backgroundColor: "#e0e7ff" }]}>
                      <Shield size={18} color="#4338ca" />
                    </View>
                    <View style={styles.menuTextCol}>
                      <Text style={[styles.menuItemTitle, isDark && styles.menuItemTitleDark]}>
                        Escrow & Trust Protocol
                      </Text>
                      <Text style={styles.menuItemSub}>
                        Inspection diagnostics & milestone-held escrow
                      </Text>
                    </View>
                    <ChevronRight size={16} color="#94a3b8" />
                  </TouchableOpacity>

                  {/* 6. Engineering Support */}
                  <TouchableOpacity
                    style={[styles.menuItem, isDark && styles.menuItemDark]}
                    activeOpacity={0.7}
                    onPress={handleCallSupport}
                  >
                    <View style={[styles.menuIconBox, { backgroundColor: "#ecfdf5" }]}>
                      <Phone size={18} color="#047857" />
                    </View>
                    <View style={styles.menuTextCol}>
                      <Text style={[styles.menuItemTitle, isDark && styles.menuItemTitleDark]}>
                        Engineering Support Helpline
                      </Text>
                      <Text style={styles.menuItemSub}>
                        +91 73030 40804 • Mon-Sat 9AM - 7PM IST
                      </Text>
                    </View>
                    <ChevronRight size={16} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                {/* SIGN OUT ACTION BUTTON (Prominent Red) */}
                {isAuthenticated && (
                  <View style={styles.signOutWrapper}>
                    <TouchableOpacity
                      style={styles.signOutBtn}
                      activeOpacity={0.85}
                      onPress={handleSignOut}
                    >
                      <LogOut size={18} color="#dc2626" />
                      <Text style={styles.signOutBtnText}>Sign Out from LabMatrix</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <Text style={styles.versionFooter}>
                  LabMatrix Surplus Exchange • v1.0.0
                </Text>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "86%",
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  sheetContainerDark: {
    backgroundColor: "#0d1829",
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#cbd5e1",
    alignSelf: "center",
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  headerTitleCol: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: -0.3,
  },
  sheetTitleDark: {
    color: "#f8fafc",
  },
  sheetSub: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnDark: {
    backgroundColor: "#1e293b",
  },
  scrollList: {
    marginTop: 12,
  },
  userCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
  },
  userCardDark: {
    backgroundColor: "#132137",
    borderColor: "#1e293b",
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#002555",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fbc634",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  userInfoCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 3,
  },
  userName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
    flexShrink: 1,
  },
  userNameDark: {
    color: "#f8fafc",
  },
  adminPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#fde68a",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  adminPillText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#033a7d",
    letterSpacing: 0.4,
  },
  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedPillText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#059669",
    letterSpacing: 0.3,
  },
  metaLine: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  userEmail: {
    fontSize: 12,
    color: "#64748b",
  },
  userCompany: {
    fontSize: 12,
    color: "#64748b",
  },
  loggedOutPrompt: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
  },
  loggedOutPromptDark: {
    backgroundColor: "#132137",
    borderColor: "#1e293b",
  },
  loggedOutTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 10,
  },
  loggedOutTitleDark: {
    color: "#94a3b8",
  },
  signInDirectBtn: {
    backgroundColor: "#033a7d",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  signInDirectBtnText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 13,
  },
  menuSection: {
    gap: 6,
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  menuItemDark: {
    backgroundColor: "#0d1829",
  },
  adminMenuItem: {
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fef3c7",
  },
  adminMenuItemDark: {
    backgroundColor: "#231e13",
    borderColor: "#3d3215",
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuTextCol: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
  },
  menuItemTitleDark: {
    color: "#f1f5f9",
  },
  menuItemSub: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 1,
  },
  signOutWrapper: {
    marginTop: 4,
    marginBottom: 12,
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 14,
    paddingVertical: 13,
  },
  signOutBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#dc2626",
    letterSpacing: -0.2,
  },
  versionFooter: {
    textAlign: "center",
    fontSize: 11,
    color: "#94a3b8",
    paddingVertical: 8,
  },
});
