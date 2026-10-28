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
  Linking,
} from "react-native";
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
  User as UserIcon,
  Wrench,
  Building2,
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

  const handleOpenPolicy = (title: string, message: string) => {
    Alert.alert(title, message, [{ text: "Understood", style: "default" }]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, isDark && styles.safeAreaDark]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Top Header Bar matching Mockup */}
      <View style={[styles.topBar, isDark && styles.topBarDark]}>
        <View style={styles.topBarLeft}>
          <Image
            source={require("@/assets/images/logo.png")}
            style={styles.logoImg}
            resizeMode="contain"
          />
        </View>

        <View style={styles.topBarRight}>
          <View style={styles.exchangeTitleCol}>
            <Text style={[styles.exchangeTitle, isDark && styles.exchangeTitleDark]}>
              LabMatrix
            </Text>
            <Text style={styles.exchangeSub}>Surplus Exchange</Text>
          </View>

          <TouchableOpacity
            style={styles.helpIconBtn}
            activeOpacity={0.7}
            onPress={handleCallHelpDesk}
            accessibilityLabel="Help Desk"
          >
            <HelpCircle size={20} color={isDark ? "#cbd5e1" : "#475569"} />
          </TouchableOpacity>

          <View style={styles.userAvatarCircle}>
            <UserIcon size={16} color="#ffffff" />
          </View>
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
          {/* Green Status Tag */}
          <View style={styles.statusPillRow}>
            <View style={styles.statusDotGreen} />
            <Text style={styles.statusPillText}>
              VERIFIED B2B SURPLUS • CLINICAL & PHARMA
            </Text>
          </View>

          {/* Hero Branding & Headings */}
          <View style={styles.heroBlock}>
            <Image
              source={require("@/assets/images/logo.png")}
              style={styles.heroLogoImg}
              resizeMode="contain"
            />
            <Text style={[styles.heroHeading, isDark && styles.heroHeadingDark]}>
              Sign in to your lab account
            </Text>
            <Text style={styles.heroSubtitle}>
              Direct institutional trading for certified refurbished chromatography,
              mass specs, and laboratory surplus spares.
            </Text>
          </View>

          {/* Floating Sign-In Form Card */}
          <View style={[styles.formCard, isDark && styles.formCardDark]}>
            <Text style={[styles.cardTitle, isDark && styles.cardTitleDark]}>
              Sign in to your account
            </Text>
            <Text style={styles.cardSubtitle}>
              Verified marketplace for analytical & pharma instruments
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

            {/* Email Address Field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>
                Email address
              </Text>
              <View
                style={[
                  styles.inputBox,
                  isDark && styles.inputBoxDark,
                  authError && styles.inputBoxError,
                ]}
              >
                <Mail size={18} color="#64748b" style={{ marginLeft: 12 }} />
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
                <Lock size={18} color="#64748b" style={{ marginLeft: 12 }} />
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

            {/* Sign in Button */}
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
                  <Text style={styles.submitButtonText}>Sign in</Text>
                  <ArrowRight size={17} color="#ffffff" />
                </>
              )}
            </TouchableOpacity>

            {/* Privacy Guarantee Note */}
            <View style={styles.privacyNoteRow}>
              <ShieldCheck size={16} color="#fbc634" style={{ marginTop: 1, flexShrink: 0 }} />
              <Text style={styles.privacyNoteText}>
                Privacy protected. No public phone or email exposure across bidding.
              </Text>
            </View>
          </View>

          {/* Registration Redirect */}
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

          {/* Guaranteed Trust Protocol & ISO 17025 Ready Section */}
          <View style={styles.trustSection}>
            <View style={styles.trustHeaderRow}>
              <Text style={styles.trustHeaderLabel}>GUARANTEED TRUST PROTOCOL</Text>
              <Text style={styles.trustHeaderLabel}>ISO 17025 READY</Text>
            </View>

            <View style={styles.trustCardsRow}>
              {/* Card 1 */}
              <View style={[styles.trustCard, isDark && styles.trustCardDark]}>
                <ShieldCheck size={20} color="#033a7d" />
                <Text style={[styles.trustCardTitle, isDark && styles.trustCardTitleDark]}>
                  Verified Pharma Labs
                </Text>
              </View>

              {/* Card 2 */}
              <View style={[styles.trustCard, isDark && styles.trustCardDark]}>
                <Wrench size={20} color="#033a7d" />
                <Text style={[styles.trustCardTitle, isDark && styles.trustCardTitleDark]}>
                  Technical Inspections
                </Text>
              </View>

              {/* Card 3 */}
              <View style={[styles.trustCard, isDark && styles.trustCardDark]}>
                <Building2 size={20} color="#033a7d" />
                <Text style={[styles.trustCardTitle, isDark && styles.trustCardTitleDark]}>
                  Escrow Coordination
                </Text>
              </View>
            </View>
          </View>

          {/* Legal Institutional Footer */}
          <View style={styles.footerBlock}>
            <Text style={styles.footerEntityText}>
              Labmatrix Instruments India Pvt Ltd • Mehrauli, New Delhi
            </Text>

            <View style={styles.footerLinksRow}>
              <TouchableOpacity
                onPress={() =>
                  handleOpenPolicy(
                    "Inspection Policy",
                    "All laboratory instruments posted on LabMatrix undergo optical, mechanical, and electronic diagnostic audit prior to release of escrow payment."
                  )
                }
              >
                <Text style={styles.footerLinkText}>Inspection Policy</Text>
              </TouchableOpacity>

              <Text style={styles.footerDividerDot}>•</Text>

              <TouchableOpacity
                onPress={() =>
                  handleOpenPolicy(
                    "Escrow Terms",
                    "Buyer funds are held in secure tripartite escrow. Sellers receive payment within 48 hours of successful equipment verification and installation."
                  )
                }
              >
                <Text style={styles.footerLinkText}>Escrow Terms</Text>
              </TouchableOpacity>

              <Text style={styles.footerDividerDot}>•</Text>

              <TouchableOpacity onPress={handleCallHelpDesk}>
                <Text style={styles.footerLinkText}>Help Desk</Text>
              </TouchableOpacity>
            </View>
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
    backgroundColor: "#0b1320",
  },

  // Top Header Bar matching mockup
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  topBarDark: {
    backgroundColor: "#0f172a",
    borderBottomColor: "#1e293b",
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoImg: {
    width: 130,
    height: 32,
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  exchangeTitleCol: {
    alignItems: "flex-end",
  },
  exchangeTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0f172a",
  },
  exchangeTitleDark: {
    color: "#f8fafc",
  },
  exchangeSub: {
    fontSize: 10,
    color: "#64748b",
  },
  helpIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#011936",
    alignItems: "center",
    justifyContent: "center",
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Status Tag
  statusPillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    marginBottom: 12,
  },
  statusDotGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#16a34a",
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#033a7d",
    letterSpacing: 0.5,
  },

  // Hero Section
  heroBlock: {
    marginBottom: 16,
  },
  heroLogoImg: {
    width: 170,
    height: 42,
    marginBottom: 8,
  },
  heroHeading: {
    fontSize: 26,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: -0.5,
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

  // Floating Sign-In Card
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 14,
  },
  formCardDark: {
    backgroundColor: "#131d2e",
    borderColor: "#1e293b",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
  },
  cardTitleDark: {
    color: "#f8fafc",
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    marginTop: -8,
    marginBottom: 4,
  },

  // Google Button
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  googleBtnDark: {
    backgroundColor: "#0b1320",
    borderColor: "#334155",
  },
  googleBtnText: {
    fontSize: 13.5,
    fontWeight: "600",
    color: "#1e293b",
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
    fontSize: 10,
    fontWeight: "800",
    color: "#94a3b8",
    letterSpacing: 0.6,
  },

  // Input Groups
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
    borderColor: "#cbd5e1",
    borderRadius: 10,
    backgroundColor: "#ffffff",
  },
  inputBoxDark: {
    backgroundColor: "#0b1320",
    borderColor: "#334155",
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

  // Subtle Inline Error Banner
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

  // Privacy Note
  privacyNoteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingTop: 4,
  },
  privacyNoteText: {
    fontSize: 11.5,
    color: "#64748b",
    lineHeight: 16,
    flex: 1,
  },

  // Register Callout
  registerBlock: {
    alignItems: "center",
    marginTop: 18,
    marginBottom: 20,
  },
  registerPrompt: {
    fontSize: 13.5,
    color: "#475569",
  },
  createAccountLink: {
    fontWeight: "800",
    color: "#033a7d",
  },

  // Trust Protocol Section
  trustSection: {
    backgroundColor: "transparent",
    marginBottom: 20,
  },
  trustHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  trustHeaderLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.5,
  },
  trustCardsRow: {
    flexDirection: "row",
    gap: 8,
  },
  trustCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  trustCardDark: {
    backgroundColor: "#131d2e",
    borderColor: "#1e293b",
  },
  trustCardTitle: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
  },
  trustCardTitleDark: {
    color: "#f8fafc",
  },

  // Legal Institutional Footer
  footerBlock: {
    alignItems: "center",
    paddingTop: 4,
    gap: 8,
  },
  footerEntityText: {
    fontSize: 11,
    color: "#64748b",
    textAlign: "center",
  },
  footerLinksRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  footerLinkText: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
  },
  footerDividerDot: {
    fontSize: 11,
    color: "#cbd5e1",
  },
});
