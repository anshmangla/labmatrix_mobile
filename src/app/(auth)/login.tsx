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
  StatusBar,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  X,
  HelpCircle,
  Microscope,
  CheckCircle2,
} from "lucide-react-native";
import { useAuth } from "@/context/auth-context";
import { LabMatrixTokens } from "@/constants/theme";

function GoogleLogo() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <Path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <Path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <Path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </Svg>
  );
}

export default function LoginLandingScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { colors } = LabMatrixTokens;
  const { login, loginWithGoogle } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setAuthError("Please enter both your email address and password.");
      return;
    }

    setAuthError(null);
    setIsLoading(true);
    const res = await login(email.trim(), password);
    setIsLoading(false);

    if (res.success) {
      router.replace("/(tabs)");
    } else {
      setAuthError(
        res.error || "Incorrect email or password. Please verify your credentials and try again."
      );
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setIsGoogleLoading(true);
    const res = await loginWithGoogle();
    setIsGoogleLoading(false);

    if (res.success) {
      router.replace("/(tabs)");
    } else {
      if (res.error && !res.error.includes("cancelled")) {
        setAuthError(res.error);
      }
    }
  };

  const handleCallHelpDesk = () => {
    Linking.openURL("tel:+917303040804").catch(() => {
      Alert.alert(
        "LabMatrix Help Desk",
        "Helpline: +91 73030 40804\nEmail: sales@labmatrixindia.com\nAvailable Mon-Sat 9AM - 7PM IST"
      );
    });
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={[styles.safeArea, isDark && styles.safeAreaDark]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* 1. Top Header Bar matching Mockup */}
      <View style={[styles.topBar, isDark && styles.topBarDark]}>
        <View style={styles.topBarLeft}>
          <Image
            source={require("@/assets/images/logo.png")}
            style={styles.logoImg}
            resizeMode="contain"
          />
        </View>

        <View style={styles.topBarRight}>
          <TouchableOpacity
            style={styles.helpIconBtn}
            activeOpacity={0.7}
            onPress={handleCallHelpDesk}
            accessibilityLabel="Help Desk"
          >
            <HelpCircle size={21} color={isDark ? "#cbd5e1" : "#475569"} />
          </TouchableOpacity>
        </View>
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
          {/* 2. Top Pill Tag */}
          <View style={styles.pillTagWrapper}>
            <View style={[styles.statusPill, isDark && styles.statusPillDark]}>
              <View style={styles.statusDotGreen} />
              <Text style={styles.statusPillText}>
                India's B2B Marketplace • Refurbished Machinery
              </Text>
            </View>
          </View>

          {/* 3. Hero Headline & Subtitle */}
          <View style={styles.heroBlock}>
            <Text style={[styles.heroHeading, isDark && styles.heroHeadingDark]}>
              Buy & Sell Refurbished Analytical Instruments and Spare Parts
            </Text>
            <Text style={styles.heroSubtitle}>
              The dedicated marketplace for laboratories, pharma facilities, and research centers to buy and sell high-precision analytical instruments and certified spare parts with verified equipment specifications.
            </Text>
          </View>

          {/* 4. Dual Value Proposition Cards (Option B: Machines & Spares + Monetize Assets) */}
          <View style={styles.valuePropsRow}>
            {/* For Buyers Card */}
            <View style={[styles.valueCard, isDark && styles.valueCardDark]}>
              <View style={styles.valueCardHeader}>
                <Microscope size={15} color="#033a7d" />
                <Text style={styles.buyerLabel}>FOR BUYERS</Text>
              </View>
              <Text style={[styles.valueMetric, isDark && styles.valueMetricDark]}>
                Machines & Spare Parts
              </Text>
              <Text style={styles.valueSubtext}>Ready dispatch & verified specs</Text>
            </View>

            {/* For Sellers Card */}
            <View style={[styles.valueCard, isDark && styles.valueCardDark]}>
              <View style={styles.valueCardHeader}>
                <ShieldCheck size={15} color="#b45309" />
                <Text style={styles.sellerLabel}>FOR SELLERS</Text>
              </View>
              <Text style={[styles.valueMetric, isDark && styles.valueMetricDark]}>
                Monetize Surplus Assets
              </Text>
              <Text style={styles.valueSubtext}>List machines & parts in 2 mins</Text>
            </View>
          </View>

          {/* 5. Floating Sign-In Form Card */}
          <View style={[styles.formCard, isDark && styles.formCardDark]}>
            <Text style={[styles.cardTitle, isDark && styles.cardTitleDark]}>
              Sign in to LabMatrix
            </Text>
            <Text style={styles.cardSubtitle}>
              Access verified inventory & surplus machinery
            </Text>

            {/* Google One-Tap Sign In */}
            <TouchableOpacity
              style={[styles.googleBtn, isDark && styles.googleBtnDark]}
              activeOpacity={0.85}
              disabled={isGoogleLoading || isLoading}
              onPress={handleGoogleSignIn}
            >
              {isGoogleLoading ? (
                <ActivityIndicator size="small" color="#033a7d" />
              ) : (
                <>
                  <GoogleLogo />
                  <Text style={[styles.googleBtnText, isDark && styles.googleBtnTextDark]}>
                    Continue with Google
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* OR SIGN IN WITH EMAIL Divider */}
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, isDark && styles.dividerLineDark]} />
              <Text style={styles.dividerText}>OR SIGN IN WITH EMAIL</Text>
              <View style={[styles.dividerLine, isDark && styles.dividerLineDark]} />
            </View>

            {/* Work / Institutional Email Field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>
                Work / Institutional Email
              </Text>
              <View
                style={[
                  styles.inputBox,
                  isDark && styles.inputBoxDark,
                  authError && styles.inputBoxError,
                ]}
              >
                <Mail size={18} color="#64748b" style={{ marginLeft: 14 }} />
                <TextInput
                  style={[styles.inputField, isDark && styles.inputFieldDark]}
                  placeholder="analyst@labmatrix.com"
                  placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (authError) setAuthError(null);
                  }}
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <View style={styles.passwordLabelRow}>
                <Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>
                  Password
                </Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => router.push("/(auth)/forgot-password" as any)}
                >
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
              <View
                style={[
                  styles.inputBox,
                  isDark && styles.inputBoxDark,
                  authError && styles.inputBoxError,
                ]}
              >
                <Lock size={18} color="#64748b" style={{ marginLeft: 14 }} />
                <TextInput
                  style={[styles.inputField, isDark && styles.inputFieldDark]}
                  placeholder="••••••••••••"
                  placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (authError) setAuthError(null);
                  }}
                />
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeToggleBtn}
                >
                  {showPassword ? (
                    <EyeOff size={18} color="#64748b" />
                  ) : (
                    <Eye size={18} color="#64748b" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Subtle Inline Error Warning Banner */}
            {authError && (
              <View
                style={[
                  styles.inlineWarningBanner,
                  isDark && styles.inlineWarningBannerDark,
                ]}
              >
                <AlertCircle
                  size={18}
                  color="#ba1a1a"
                  style={{ marginTop: 2, flexShrink: 0 }}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.inlineWarningTitle,
                      isDark && styles.inlineWarningTitleDark,
                    ]}
                  >
                    Incorrect Password or Email
                  </Text>
                  <Text style={styles.inlineWarningText}>{authError}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setAuthError(null)}
                  style={styles.dismissErrorBtn}
                >
                  <X size={14} color="#ba1a1a" />
                </TouchableOpacity>
              </View>
            )}

            {/* Sign in to Marketplace Button */}
            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              activeOpacity={0.85}
              disabled={isLoading || isGoogleLoading}
              onPress={handleLogin}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Sign in to Marketplace</Text>
                  <ArrowRight size={17} color="#ffffff" />
                </>
              )}
            </TouchableOpacity>

            {/* Masked Privacy Guarantee Box */}
            <View style={[styles.privacyBox, isDark && styles.privacyBoxDark]}>
              <Lock size={15} color="#b45309" style={{ marginTop: 1, flexShrink: 0 }} />
              <Text style={styles.privacyBoxText}>
                Masked phone & email guarantee. Zero unsolicited sales spam.
              </Text>
            </View>
          </View>

          {/* 6. Registration Redirect */}
          <View style={styles.registerBlock}>
            <Text style={styles.registerPrompt}>
              Don't have an account yet?{" "}
              <Text
                style={styles.createAccountLink}
                onPress={() => router.push("/(auth)/register" as any)}
              >
                Create an account
              </Text>
            </Text>
          </View>

          {/* 7. Footer Trust Seals matching Mockup */}
          <View style={styles.trustFooterSection}>
            <View style={styles.trustSealsRow}>
              <View style={styles.trustSealItem}>
                <CheckCircle2 size={14} color="#15803d" />
                <Text style={styles.trustSealText}>Tested & Inspected</Text>
              </View>

              <Text style={styles.trustSealDot}>•</Text>

              <View style={styles.trustSealItem}>
                <CheckCircle2 size={14} color="#15803d" />
                <Text style={styles.trustSealText}>Direct Lab Pricing</Text>
              </View>
            </View>

            <View style={styles.trustSealsSecondRow}>
              <View style={styles.trustSealItem}>
                <CheckCircle2 size={14} color="#15803d" />
                <Text style={styles.trustSealText}>Secure Escrow</Text>
              </View>
            </View>

            {/* Copyright Line */}
            <Text style={styles.copyrightText}>
              © 2026 Labmatrix Instruments India Pvt. Ltd. • New Delhi
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
    backgroundColor: "#ffffff",
  },
  safeAreaDark: {
    backgroundColor: "#080f1a",
  },

  // Top Header Bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
  },
  topBarDark: {
    backgroundColor: "#080f1a",
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoImg: {
    width: 140,
    height: 34,
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  helpIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 36,
  },

  // Pill Tag
  pillTagWrapper: {
    alignItems: "flex-start",
    marginBottom: 10,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff5fb",
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  statusPillDark: {
    backgroundColor: "#132138",
  },
  statusDotGreen: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#10b981",
  },
  statusPillText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#033a7d",
    letterSpacing: 0.2,
  },

  // Hero Section
  heroBlock: {
    marginBottom: 14,
  },
  heroHeading: {
    fontSize: 25,
    fontWeight: "900",
    color: "#002555",
    letterSpacing: -0.6,
    lineHeight: 31,
    marginBottom: 6,
  },
  heroHeadingDark: {
    color: "#f8fafc",
  },
  heroSubtitle: {
    fontSize: 13.5,
    color: "#475569",
    lineHeight: 20,
  },

  // Dual Value Cards
  valuePropsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  valueCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  valueCardDark: {
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
  },
  valueCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  buyerLabel: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#033a7d",
    letterSpacing: 0.5,
  },
  sellerLabel: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#b45309",
    letterSpacing: 0.5,
  },
  valueMetric: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 5,
    lineHeight: 17,
  },
  valueMetricDark: {
    color: "#f8fafc",
  },
  valueSubtext: {
    fontSize: 10.5,
    color: "#64748b",
    marginTop: 2,
    lineHeight: 14,
  },

  // Floating Sign-In Form Card
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 13,
  },
  formCardDark: {
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#0f172a",
    textAlign: "center",
  },
  cardTitleDark: {
    color: "#f8fafc",
  },
  cardSubtitle: {
    fontSize: 12.5,
    color: "#64748b",
    textAlign: "center",
    marginTop: -8,
    marginBottom: 3,
  },

  // Google Button
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#f0f4ff",
    borderWidth: 1,
    borderColor: "#e0e7ff",
    paddingVertical: 12,
    borderRadius: 11,
  },
  googleBtnDark: {
    backgroundColor: "#132138",
    borderColor: "#1e3a8a",
  },
  googleBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0f172a",
  },
  googleBtnTextDark: {
    color: "#f8fafc",
  },

  // Divider
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e2e8f0",
  },
  dividerLineDark: {
    backgroundColor: "#1e293b",
  },
  dividerText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#94a3b8",
    letterSpacing: 0.8,
  },

  // Input Fields
  inputGroup: {
    gap: 5,
  },
  fieldLabel: {
    fontSize: 12.5,
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
    fontWeight: "700",
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    backgroundColor: "#f3f6fc",
  },
  inputBoxDark: {
    backgroundColor: "#131d2e",
    borderColor: "#1e293b",
  },
  inputBoxError: {
    borderColor: "#f87171",
    backgroundColor: "#fffbfa",
  },
  inputField: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 13.5,
    color: "#0f172a",
  },
  inputFieldDark: {
    color: "#f8fafc",
  },
  eyeToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  // Subtle Warning Banner
  inlineWarningBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  inlineWarningBannerDark: {
    backgroundColor: "#2a1215",
    borderColor: "#5c1d24",
  },
  inlineWarningTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#991b1b",
    marginBottom: 2,
  },
  inlineWarningTitleDark: {
    color: "#fca5a5",
  },
  inlineWarningText: {
    fontSize: 12,
    color: "#b91c1c",
    lineHeight: 16,
  },
  dismissErrorBtn: {
    padding: 2,
  },

  // Submit Button
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#002555",
    paddingVertical: 13.5,
    borderRadius: 10,
    marginTop: 2,
    shadowColor: "#002555",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#ffffff",
  },

  // Masked Privacy Note Box
  privacyBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f4ff",
    borderRadius: 10,
    padding: 12,
    gap: 9,
    marginTop: 2,
  },
  privacyBoxDark: {
    backgroundColor: "#132138",
  },
  privacyBoxText: {
    fontSize: 11.5,
    color: "#475569",
    lineHeight: 16,
    flex: 1,
  },

  // Register Callout
  registerBlock: {
    alignItems: "center",
    marginTop: 18,
    marginBottom: 22,
  },
  registerPrompt: {
    fontSize: 13,
    color: "#475569",
  },
  createAccountLink: {
    fontWeight: "800",
    color: "#033a7d",
  },

  // Footer Trust Seals
  trustFooterSection: {
    alignItems: "center",
    gap: 6,
  },
  trustSealsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  trustSealsSecondRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  trustSealItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  trustSealText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#334155",
  },
  trustSealDot: {
    fontSize: 12,
    color: "#cbd5e1",
  },
  copyrightText: {
    fontSize: 11,
    color: "#64748b",
    textAlign: "center",
    marginTop: 8,
  },
});
