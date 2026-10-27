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
import { Lock, Mail, User, Phone, Building, KeyRound } from "lucide-react-native";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";

export default function RegisterScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
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
      Alert.alert("Validation", "Please enter a valid email address.");
      return;
    }
    if (!password || password.length < 6) {
      Alert.alert("Validation", "Password must be at least 6 characters.");
      return;
    }

    setIsSendingOtp(true);
    try {
      await api.post("/api/auth/otp/send", {
        email: email.trim().toLowerCase(),
        name: name.trim() || undefined,
      });

      setOtpSent(true);
      Alert.alert("Verification Code Sent", `A 6-digit verification code has been emailed to ${email}.`);
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.error || "Could not send verification code.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleRegister = async () => {
    if (!otp.trim() || otp.trim().length !== 6) {
      Alert.alert("Validation", "Please enter the 6-digit verification code sent to your email.");
      return;
    }

    setIsRegistering(true);
    const res = await register({
      name: name.trim() || "Researcher",
      email: email.trim().toLowerCase(),
      password,
      otp: otp.trim(),
      phoneNumber: phoneNumber.trim() || undefined,
      companyName: companyName.trim() || undefined,
    });
    setIsRegistering(false);

    if (res.success) {
      Alert.alert("Account Created", "Your account has been registered successfully!", [
        {
          text: "OK",
          onPress: () => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)");
            }
          },
        },
      ]);
    } else {
      Alert.alert("Registration Failed", res.error || "Could not complete registration.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, isDark && styles.containerDark]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, isDark && styles.titleDark]}>Create Account</Text>
          <Text style={styles.subtitle}>Join the trusted laboratory instrument marketplace</Text>
        </View>

        <View style={styles.form}>
          <Text style={[styles.label, isDark && styles.labelDark]}>Full Name *</Text>
          <View style={[styles.inputWrapper, isDark && styles.inputWrapperDark]}>
            <User size={18} color="#64748b" />
            <TextInput
              style={[styles.input, isDark && styles.inputDark]}
              placeholder="Dr. Rajesh Sharma"
              placeholderTextColor="#94a3b8"
              value={name}
              onChangeText={setName}
            />
          </View>

          <Text style={[styles.label, isDark && styles.labelDark]}>Email Address *</Text>
          <View style={[styles.inputWrapper, isDark && styles.inputWrapperDark]}>
            <Mail size={18} color="#64748b" />
            <TextInput
              style={[styles.input, isDark && styles.inputDark]}
              placeholder="lab@institution.org"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              editable={!otpSent}
            />
          </View>

          <Text style={[styles.label, isDark && styles.labelDark]}>Password (Min. 6 chars) *</Text>
          <View style={[styles.inputWrapper, isDark && styles.inputWrapperDark]}>
            <Lock size={18} color="#64748b" />
            <TextInput
              style={[styles.input, isDark && styles.inputDark]}
              placeholder="••••••••"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <Text style={[styles.label, isDark && styles.labelDark]}>Phone Number</Text>
          <View style={[styles.inputWrapper, isDark && styles.inputWrapperDark]}>
            <Phone size={18} color="#64748b" />
            <TextInput
              style={[styles.input, isDark && styles.inputDark]}
              placeholder="+91 98765 43210"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />
          </View>

          <Text style={[styles.label, isDark && styles.labelDark]}>Company / Diagnostic Lab / University</Text>
          <View style={[styles.inputWrapper, isDark && styles.inputWrapperDark]}>
            <Building size={18} color="#64748b" />
            <TextInput
              style={[styles.input, isDark && styles.inputDark]}
              placeholder="Apex Research Diagnostics"
              placeholderTextColor="#94a3b8"
              value={companyName}
              onChangeText={setCompanyName}
            />
          </View>

          {/* OTP Section */}
          {!otpSent ? (
            <TouchableOpacity
              style={[styles.actionBtn, isSendingOtp && styles.actionBtnDisabled]}
              onPress={handleSendOtp}
              disabled={isSendingOtp}
            >
              {isSendingOtp ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.actionBtnText}>Send Email Verification Code</Text>
              )}
            </TouchableOpacity>
          ) : (
            <>
              <Text style={[styles.label, isDark && styles.labelDark]}>Enter 6-Digit Email Code *</Text>
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

              <TouchableOpacity
                style={[styles.actionBtn, isRegistering && styles.actionBtnDisabled]}
                onPress={handleRegister}
                disabled={isRegistering}
              >
                {isRegistering ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.actionBtnText}>Verify & Create Account</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
              <Text style={styles.linkText}>Sign In</Text>
            </TouchableOpacity>
          </View>
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
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a",
  },
  titleDark: {
    color: "#f8fafc",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
  },
  form: {
    gap: 10,
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
  actionBtn: {
    backgroundColor: "#0284c7",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 14,
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
  actionBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 16,
  },
  footerText: {
    fontSize: 14,
    color: "#64748b",
  },
  linkText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0284c7",
  },
});
