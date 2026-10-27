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
} from "react-native";
import { useRouter } from "expo-router";
import { Mail, Lock, KeyRound, ArrowLeft } from "lucide-react-native";
import { api } from "@/lib/api";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestOtp = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert("Validation", "Please enter a valid email address.");
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
    <KeyboardAvoidingView
      style={[styles.container, isDark && styles.containerDark]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={isDark ? "#f8fafc" : "#0f172a"} />
          <Text style={[styles.backBtnText, isDark && styles.backBtnTextDark]}>Back to Sign In</Text>
        </TouchableOpacity>

        <Text style={[styles.title, isDark && styles.titleDark]}>Reset Password</Text>
        <Text style={styles.subtitle}>
          Enter your registered email address to receive a 6-digit password reset code.
        </Text>

        <View style={styles.form}>
          <Text style={[styles.label, isDark && styles.labelDark]}>Email Address</Text>
          <View style={[styles.inputWrapper, isDark && styles.inputWrapperDark]}>
            <Mail size={18} color="#64748b" />
            <TextInput
              style={[styles.input, isDark && styles.inputDark]}
              placeholder="researcher@lab.org"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              editable={!otpSent}
            />
          </View>

          {!otpSent ? (
            <TouchableOpacity
              style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
              onPress={handleRequestOtp}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitBtnText}>Send Reset Code</Text>
              )}
            </TouchableOpacity>
          ) : (
            <>
              <Text style={[styles.label, isDark && styles.labelDark]}>6-Digit Verification Code</Text>
              <View style={[styles.inputWrapper, isDark && styles.inputWrapperDark]}>
                <KeyRound size={18} color="#0284c7" />
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  placeholder="123456"
                  placeholderTextColor="#94a3b8"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={setOtp}
                />
              </View>

              <Text style={[styles.label, isDark && styles.labelDark]}>New Password (Min. 6 chars)</Text>
              <View style={[styles.inputWrapper, isDark && styles.inputWrapperDark]}>
                <Lock size={18} color="#64748b" />
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  placeholder="••••••••"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
                onPress={handleResetPassword}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitBtnText}>Update Password & Sign In</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  containerDark: {
    backgroundColor: "#090d16",
  },
  content: {
    padding: 24,
    flexGrow: 1,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 24,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
  backBtnTextDark: {
    color: "#f8fafc",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 6,
  },
  titleDark: {
    color: "#f8fafc",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
    marginBottom: 24,
  },
  form: {
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginTop: 6,
  },
  labelDark: {
    color: "#cbd5e1",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
    gap: 10,
  },
  inputWrapperDark: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#0f172a",
  },
  inputDark: {
    color: "#f8fafc",
  },
  submitBtn: {
    backgroundColor: "#0284c7",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 14,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
});
