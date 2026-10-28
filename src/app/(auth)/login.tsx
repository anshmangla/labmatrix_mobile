import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { Lock, Mail, ArrowRight, ShieldCheck, ArrowLeft } from "lucide-react-native";
import { useAuth } from "@/context/auth-context";
import { LabMatrixTokens } from "@/constants/theme";

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { colors } = LabMatrixTokens;
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Validation", "Please enter both email address and password.");
      return;
    }

    setIsLoading(true);
    const res = await login(email.trim(), password);
    setIsLoading(false);

    if (res.success) {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(tabs)");
      }
    } else {
      Alert.alert("Sign In Failed", res.error || "Invalid credentials. Please verify your email and password.");
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, isDark && styles.safeAreaDark]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Top Header */}
      <View style={[styles.topBar, isDark && styles.topBarDark]}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/(tabs)");
          }}
        >
          <ArrowLeft size={20} color={isDark ? "#f8fafc" : "#0f172a"} />
        </TouchableOpacity>

        <Image
          source={require("@/assets/images/logo.png")}
          style={styles.logoImg}
          resizeMode="contain"
        />

        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Welcome Card */}
          <View style={styles.headerBlock}>
            <Text style={[styles.pageTitle, isDark && styles.pageTitleDark]}>
              Welcome Back
            </Text>
            <Text style={styles.pageSubtitle}>
              Sign in to manage analytical instruments, deal inquiries, and sourcing requests.
            </Text>

            <View style={styles.assurancePill}>
              <ShieldCheck size={13} color="#033a7d" />
              <Text style={styles.assurancePillText}>Verified Clinical Portal • Direct Lab Escrow</Text>
            </View>
          </View>

          {/* Form Card */}
          <View style={[styles.formCard, isDark && styles.formCardDark]}>
            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>
                Facility / Researcher Email *
              </Text>
              <View style={[styles.inputBox, isDark && styles.inputBoxDark]}>
                <Mail size={18} color="#64748b" style={{ marginLeft: 12 }} />
                <TextInput
                  style={[styles.inputField, isDark && styles.inputFieldDark]}
                  placeholder="scientist@laboratory.org"
                  placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <View style={styles.passwordLabelRow}>
                <Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>
                  Account Password *
                </Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => router.push("/(auth)/forgot-password" as any)}
                >
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.inputBox, isDark && styles.inputBoxDark]}>
                <Lock size={18} color="#64748b" style={{ marginLeft: 12 }} />
                <TextInput
                  style={[styles.inputField, isDark && styles.inputFieldDark]}
                  placeholder="••••••••••••"
                  placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>
            </View>

            {/* Submit Action */}
            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              activeOpacity={0.85}
              disabled={isLoading}
              onPress={handleLogin}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Sign In to LabMatrix</Text>
                  <ArrowRight size={16} color="#ffffff" />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Registration Redirect */}
          <View style={styles.registerBlock}>
            <Text style={styles.registerPrompt}>Don't have a verified facility account?</Text>
            <TouchableOpacity
              style={styles.registerButton}
              activeOpacity={0.8}
              onPress={() => router.push("/(auth)/register" as any)}
            >
              <Text style={styles.registerButtonText}>Register Laboratory Account</Text>
            </TouchableOpacity>
          </View>

          {/* Help Contact */}
          <View style={styles.supportFootnote}>
            <Text style={styles.supportFootnoteText}>
              Need immediate help? Call Support Desk at{" "}
              <Text style={{ fontWeight: "700", color: "#033a7d" }}>+91 73030 40804</Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#eff5fb",
    alignItems: "center",
    justifyContent: "center",
  },
  logoImg: {
    width: 140,
    height: 32,
  },
  scrollContent: {
    padding: 20,
    gap: 20,
    paddingBottom: 40,
  },
  headerBlock: {
    gap: 6,
    paddingTop: 8,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.4,
  },
  pageTitleDark: {
    color: "#f8fafc",
  },
  pageSubtitle: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
  },
  assurancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#eff5fb",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  assurancePillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#033a7d",
  },
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 16,
  },
  formCardDark: {
    backgroundColor: "#03142e",
    borderColor: "#1e293b",
  },
  inputGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  fieldLabelDark: {
    color: "#f8fafc",
  },
  passwordLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  forgotPasswordText: {
    fontSize: 12,
    color: "#033a7d",
    fontWeight: "600",
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    backgroundColor: "#ffffff",
  },
  inputBoxDark: {
    backgroundColor: "#020d1c",
    borderColor: "#334155",
  },
  inputField: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: "#0f172a",
  },
  inputFieldDark: {
    color: "#f8fafc",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#033a7d",
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
  registerBlock: {
    alignItems: "center",
    gap: 8,
    paddingTop: 6,
  },
  registerPrompt: {
    fontSize: 13,
    color: "#64748b",
  },
  registerButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: "#eff5fb",
    borderWidth: 1,
    borderColor: "#dbeaf7",
  },
  registerButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#033a7d",
  },
  supportFootnote: {
    alignItems: "center",
    paddingTop: 10,
  },
  supportFootnoteText: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
  },
});
