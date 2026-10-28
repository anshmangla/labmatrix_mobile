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
import { Mail, Lock, KeyRound, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react-native";
import { api } from "@/lib/api";
import { LabMatrixTokens } from "@/constants/theme";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { colors } = LabMatrixTokens;

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestOtp = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert("Validation", "Please enter a valid registered email address.");
      return;
    }

    setIsLoading(true);
    try {
      await api.post("/api/auth/password/reset-request", {
        email: email.trim().toLowerCase(),
      });
      setOtpSent(true);
      Alert.alert(
        "Verification Code Sent",
        `If an account exists for ${email}, a 6-digit password reset code has been sent.`
      );
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.error || "Could not send reset code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!otp.trim() || otp.trim().length !== 6) {
      Alert.alert("Validation", "Please enter the 6-digit verification code.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      Alert.alert("Validation", "New password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    try {
      await api.post("/api/auth/password/reset-confirm", {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        password: newPassword,
      });

      Alert.alert(
        "Password Reset Successful",
        "Your password has been updated. You can now log in with your new password.",
        [{ text: "Sign In", onPress: () => router.replace("/(auth)/login") }]
      );
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.error || "Could not reset password.");
    } finally {
      setIsLoading(false);
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
          onPress={() => router.back()}
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
          <View style={styles.headerBlock}>
            <Text style={[styles.pageTitle, isDark && styles.pageTitleDark]}>
              Reset Account Password
            </Text>
            <Text style={styles.pageSubtitle}>
              Enter your registered facility email address to receive a secure 6-digit reset code.
            </Text>
          </View>

          <View style={[styles.formCard, isDark && styles.formCardDark]}>
            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>
                Registered Email Address *
              </Text>
              <View style={[styles.inputBox, isDark && styles.inputBoxDark]}>
                <Mail size={18} color="#64748b" style={{ marginLeft: 12 }} />
                <TextInput
                  style={[styles.inputField, isDark && styles.inputFieldDark]}
                  placeholder="scientist@laboratory.org"
                  placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  editable={!otpSent}
                />
              </View>
            </View>

            {!otpSent ? (
              <TouchableOpacity
                style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                onPress={handleRequestOtp}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Text style={styles.submitButtonText}>Send Password Reset Code</Text>
                    <ArrowRight size={16} color="#ffffff" />
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View style={{ gap: 14 }}>
                <View style={styles.codeSentAlert}>
                  <CheckCircle2 size={14} color="#15803d" />
                  <Text style={styles.codeSentAlertText}>
                    Reset code sent to {email}. Check your inbox.
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>
                    6-Digit Verification Code *
                  </Text>
                  <View style={[styles.inputBox, isDark && styles.inputBoxDark]}>
                    <KeyRound size={18} color="#033a7d" style={{ marginLeft: 12 }} />
                    <TextInput
                      style={[styles.inputField, isDark && styles.inputFieldDark]}
                      placeholder="123456"
                      placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                      keyboardType="number-pad"
                      maxLength={6}
                      value={otp}
                      onChangeText={setOtp}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>
                    New Password (min. 6 characters) *
                  </Text>
                  <View style={[styles.inputBox, isDark && styles.inputBoxDark]}>
                    <Lock size={18} color="#64748b" style={{ marginLeft: 12 }} />
                    <TextInput
                      style={[styles.inputField, isDark && styles.inputFieldDark]}
                      placeholder="••••••••••••"
                      placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                      secureTextEntry
                      value={newPassword}
                      onChangeText={setNewPassword}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                  onPress={handleResetPassword}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Text style={styles.submitButtonText}>Update Password & Sign In</Text>
                      <ArrowRight size={16} color="#ffffff" />
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleRequestOtp}
                  disabled={isLoading}
                  style={{ alignSelf: "center", marginTop: 4 }}
                >
                  <Text style={styles.resendCodeText}>Resend code</Text>
                </TouchableOpacity>
              </View>
            )}
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
    paddingTop: 8,
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
    fontSize: 14,
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
    fontSize: 12,
    fontWeight: "600",
    color: "#033a7d",
  },
});
