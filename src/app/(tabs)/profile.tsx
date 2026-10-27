import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  useColorScheme,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { User as UserIcon, Mail, Phone, Building, ShieldCheck, LogOut, Trash2, LogIn, Package } from "lucide-react-native";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";

export default function ProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user, isAuthenticated, logout } = useAuth();

  const { data: myItems } = useQuery({
    queryKey: ["myItems"],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await api.get("/api/user/my-items");
      return res.data as { listings: any[]; requirements: any[] };
    },
  });

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => logout() },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure? This action is permanent and will remove all your listings, requirements, and profile data.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            try {
              await api.post("/api/user/delete-account", { confirmation: "DELETE" });
              Alert.alert("Account Deleted", "Your account has been deleted.");
              await logout();
            } catch (err: any) {
              Alert.alert("Error", err.response?.data?.error || "Could not delete account.");
            }
          },
        },
      ]
    );
  };

  if (!isAuthenticated || !user) {
    return (
      <View style={[styles.container, isDark && styles.containerDark, styles.centered]}>
        <UserIcon size={54} color="#0284c7" />
        <Text style={[styles.loggedOutTitle, isDark && styles.loggedOutTitleDark]}>
          Welcome to LabMatrix
        </Text>
        <Text style={styles.loggedOutSubtitle}>
          Sign in to access your laboratory equipment listings, inquiry tracking, and account management.
        </Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push("/(auth)/login")}
        >
          <LogIn size={18} color="#ffffff" />
          <Text style={styles.primaryBtnText}>Sign In / Register</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, isDark && styles.containerDark]} contentContainerStyle={styles.content}>
      {/* Profile Header */}
      <View style={[styles.profileCard, isDark && styles.profileCardDark]}>
        <View style={styles.avatar}>
          <UserIcon size={32} color="#ffffff" />
        </View>
        <Text style={[styles.userName, isDark && styles.userNameDark]}>
          {user.name || "Lab Researcher"}
        </Text>
        <Text style={styles.userEmail}>{user.email}</Text>
        <View style={styles.roleBadge}>
          <ShieldCheck size={13} color="#0284c7" />
          <Text style={styles.roleText}>{user.role} ACCOUNT</Text>
        </View>
      </View>

      {/* Account Info Details */}
      <View style={[styles.sectionCard, isDark && styles.sectionCardDark]}>
        <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>Contact & Company</Text>
        <View style={styles.detailRow}>
          <Mail size={16} color="#64748b" />
          <Text style={[styles.detailText, isDark && styles.detailTextDark]}>{user.email}</Text>
        </View>
        {user.phoneNumber && (
          <View style={styles.detailRow}>
            <Phone size={16} color="#64748b" />
            <Text style={[styles.detailText, isDark && styles.detailTextDark]}>{user.phoneNumber}</Text>
          </View>
        )}
        {user.companyName && (
          <View style={styles.detailRow}>
            <Building size={16} color="#64748b" />
            <Text style={[styles.detailText, isDark && styles.detailTextDark]}>{user.companyName}</Text>
          </View>
        )}
      </View>

      {/* Activity Summary */}
      <View style={[styles.sectionCard, isDark && styles.sectionCardDark]}>
        <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>My Activity</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Package size={20} color="#0284c7" />
            <Text style={styles.statNumber}>{myItems?.listings?.length || 0}</Text>
            <Text style={styles.statLabel}>Listings</Text>
          </View>
          <View style={styles.statBox}>
            <ShieldCheck size={20} color="#0284c7" />
            <Text style={styles.statNumber}>{myItems?.requirements?.length || 0}</Text>
            <Text style={styles.statLabel}>Requirements</Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <LogOut size={18} color="#dc2626" />
        <Text style={styles.logoutBtnText}>Sign Out</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
        <Trash2 size={16} color="#94a3b8" />
        <Text style={styles.deleteBtnText}>Delete Account</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  containerDark: {
    backgroundColor: "#090d16",
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 14,
  },
  loggedOutTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a",
  },
  loggedOutTitleDark: {
    color: "#f8fafc",
  },
  loggedOutSubtitle: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 20,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#0284c7",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },
  profileCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  profileCardDark: {
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#0284c7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  userNameDark: {
    color: "#f8fafc",
  },
  userEmail: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 10,
  },
  roleText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0369a1",
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionCardDark: {
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 12,
    textTransform: "uppercase",
  },
  sectionTitleDark: {
    color: "#94a3b8",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  detailText: {
    fontSize: 14,
    color: "#1e293b",
  },
  detailTextDark: {
    color: "#e2e8f0",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
  },
  statLabel: {
    fontSize: 12,
    color: "#64748b",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fee2e2",
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  logoutBtnText: {
    color: "#dc2626",
    fontSize: 15,
    fontWeight: "700",
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  deleteBtnText: {
    color: "#94a3b8",
    fontSize: 13,
  },
});
