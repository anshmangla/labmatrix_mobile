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
import {
  Lock,
  Mail,
  User,
  Phone,
  Building2,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react-native";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { LabMatrixTokens } from "@/constants/theme";

export default function RegisterScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { colors } = LabMatrixTokens;
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [otp, setOtp] = useState("");

  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleSendOtp = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert("Validation", "Please enter a valid official/work email address.");
      return;
    }
    if (!password || password.length < 6) {
      Alert.alert("Validation", "Password must be at least 6 characters in length.");
      return;
    }

    setIsSendingOtp(true);
    try {
      await api.post("/api/auth/otp/send", {
        email: email.trim().toLowerCase(),
        name: name.trim() || undefined,
      });

      setOtpSent(true);
      Alert.alert(
        "Verification Code Dispatched",
        `A 6-digit verification code has been dispatched to ${email.trim().toLowerCase()}. Please check your inbox or spam folder.`
      );
    } catch (err: any) {
      console.error("Send OTP error:", err);
      Alert.alert("Dispatch Failed", err.response?.data?.error || "Could not dispatch verification code.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleRegister = async () => {
    if (!name.trim()) {
      Alert.alert("Validation", "Please enter your name or laboratory title.");
      return;
    }
    if (!otp.trim() || otp.trim().length !== 6) {
      Alert.alert("Validation", "Please enter the 6-digit email verification code.");
      return;
    }

    setIsRegistering(true);
    const res = await register({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      otp: otp.trim(),
      phoneNumber: phoneNumber.trim() || undefined,
      companyName: companyName.trim() || undefined,
    });
    setIsRegistering(false);

    if (res.success) {
      Alert.alert(
        "Facility Registered Successfully",
        "Your verified laboratory account has been created. Welcome to LabMatrix!",
        [
          {
            text: "Proceed to Marketplace",
            onPress: () => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/(tabs)");
              }
            },
          },
        ]
      );
    } else {
      Alert.alert("Registration Failed", res.error || "Could not complete account registration.");
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
          {/* Header Block */}
          <View style={styles.headerBlock}>
            <Text style={[styles.pageTitle, isDark && styles.pageTitleDark]}>
              Register Laboratory Account
            </Text>
            <Text style={styles.pageSubtitle}>
              Join India's verified scientific network for surplus instruments and analytical spares.
            </Text>

            <View style={styles.assurancePill}>
              <ShieldCheck size={13} color="#033a7d" />
              <Text style={styles.assurancePillText}>Physical Diagnostics • Transparent Escrow Logistics</Text>
            </View>
          </View>

          {/* Registration Form Card */}
          <View style={[styles.formCard, isDark && styles.formCardDark]}>
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>
                Researcher / Contact Person Name *
              </Text>
              <View style={[styles.inputBox, isDark && styles.inputBoxDark]}>
                <User size={18} color="#64748b" style={{ marginLeft: 12 }} />
                <TextInput
                  style={[styles.inputField, isDark && styles.inputFieldDark]}
                  placeholder="e.g. Dr. Rajesh Sharma"
                  placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </View>

            {/* Email Address */}
            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>
                Official Email Address *
              </Text>
              <View style={[styles.inputBox, isDark && styles.inputBoxDark]}>
                <Mail size={18} color="#64748b" style={{ marginLeft: 12 }} />
                <TextInput
                  style={[styles.inputField, isDark && styles.inputFieldDark]}
                  placeholder="name@laboratory.org"
                  placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>
                Password (min. 6 characters) *
              </Text>
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

            {/* Mobile / WhatsApp Phone Number */}
            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>
                Mobile / WhatsApp Number (For verified inquiries)
              </Text>
              <View style={[styles.inputBox, isDark && styles.inputBoxDark]}>
                <Phone size={18} color="#64748b" style={{ marginLeft: 12 }} />
                <TextInput
                  style={[styles.inputField, isDark && styles.inputFieldDark]}
                  placeholder="+91 98765 43210"
                  placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                />
              </View>
            </View>

            {/* Company / Lab Facility Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>
                Facility / Institution / Company Name
              </Text>
              <View style={[styles.inputBox, isDark && styles.inputBoxDark]}>
                <Building2 size={18} color="#64748b" style={{ marginLeft: 12 }} />
                <TextInput
                  style={[styles.inputField, isDark && styles.inputFieldDark]}
                  placeholder="e.g. Apex Analytical Research Labs"
                  placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                  value={companyName}
                  onChangeText={setCompanyName}
                />
              </View>
            </View>

            {/* Step 2: Email OTP Verification Section */}
            <View style={[styles.otpSection, isDark && styles.otpSectionDark]}>
              <View style={styles.otpHeaderRow}>
                <KeyRound size={16} color="#033a7d" />
                <Text style={styles.otpSectionTitle}>EMAIL VERIFICATION</Text>
              </View>

              {!otpSent ? (
                <TouchableOpacity
                  style={[styles.sendOtpBtn, isSendingOtp && styles.sendOtpBtnDisabled]}
                  activeOpacity={0.85}
                  disabled={isSendingOtp}
                  onPress={handleSendOtp}
                >
                  {isSendingOtp ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Text style={styles.sendOtpBtnText}>Send 6-Digit Email Code</Text>
                      <ArrowRight size={15} color="#ffffff" />
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <View style={{ gap: 10 }}>
                  <View style={styles.codeSentAlert}>
                    <CheckCircle2 size={14} color="#15803d" />
                    <Text style={styles.codeSentAlertText}>
                      Code dispatched to {email}. Check your inbox.
                    </Text>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>
                      Enter 6-Digit Code *
                    </Text>
                    <View style={[styles.inputBox, isDark && styles.inputBoxDark]}>
                      <TextInput
                        style={[styles.otpInputField, isDark && styles.inputFieldDark]}
                        placeholder="123456"
                        placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                        keyboardType="number-pad"
                        maxLength={6}
                        value={otp}
                        onChangeText={setOtp}
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={handleSendOtp}
                    disabled={isSendingOtp}
                    style={{ alignSelf: "flex-end" }}
                  >
                    <Text style={styles.resendCodeText}>Resend verification code</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Complete Registration Action */}
            <TouchableOpacity
              style={[
                styles.registerBtn,
                (!otpSent || otp.trim().length !== 6 || isRegistering) && styles.registerBtnDisabled,
              ]}
              activeOpacity={0.85}
              disabled={!otpSent || otp.trim().length !== 6 || isRegistering}
              onPress={handleRegister}
            >
              {isRegistering ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Text style={styles.registerBtnText}>Complete Facility Registration</Text>
                  <ArrowRight size={16} color="#ffffff" />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Already have account prompt */}
          <View style={styles.signInBlock}>
            <Text style={styles.signInPrompt}>Already have a registered account?</Text>
            <TouchableOpacity
              style={styles.signInLinkBtn}
              activeOpacity={0.8}
              onPress={() => router.push("/(auth)/login" as any)}
            >
              <Text style={styles.signInLinkBtnText}>Sign In to LabMatrix</Text>
            </TouchableOpacity>
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
    gap: 18,
    paddingBottom: 40,
  },
  headerBlock: {
    gap: 6,
    paddingTop: 4,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.3,
  },
  pageTitleDark: {
    color: "#f8fafc",
  },
  pageSubtitle: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 18,
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
    marginTop: 4,
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
    gap: 14,
  },
  formCardDark: {
    backgroundColor: "#03142e",
    borderColor: "#1e293b",
  },
  inputGroup: {
    gap: 5,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
  },
  fieldLabelDark: {
    color: "#f8fafc",
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
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
  },
  otpInputField: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 4,
    color: "#033a7d",
    textAlign: "center",
  },
  inputFieldDark: {
    color: "#f8fafc",
  },
  otpSection: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  otpSectionDark: {
    backgroundColor: "#020d1c",
    borderColor: "#1e293b",
  },
  otpHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  otpSectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#033a7d",
    letterSpacing: 0.5,
  },
  sendOtpBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#033a7d",
    paddingVertical: 11,
    borderRadius: 8,
  },
  sendOtpBtnDisabled: {
    opacity: 0.6,
  },
  sendOtpBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff",
  },
  codeSentAlert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  codeSentAlertText: {
    fontSize: 11,
    color: "#15803d",
    fontWeight: "600",
    flex: 1,
  },
  resendCodeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#033a7d",
  },
  registerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#033a7d",
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 4,
  },
  registerBtnDisabled: {
    opacity: 0.5,
  },
  registerBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
  signInBlock: {
    alignItems: "center",
    gap: 8,
    paddingTop: 4,
  },
  signInPrompt: {
    fontSize: 13,
    color: "#64748b",
  },
  signInLinkBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: "#eff5fb",
    borderWidth: 1,
    borderColor: "#dbeaf7",
  },
  signInLinkBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#033a7d",
  },
});
