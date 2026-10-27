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
import { Lock, Mail, Store } from "lucide-react-native";
import { useAuth } from "@/context/auth-context";

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Validation", "Please enter both email and password.");
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
      Alert.alert("Login Failed", res.error || "Invalid credentials.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, isDark && styles.containerDark]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brandHeader}>
          <View style={styles.logoBadge}>
            <Store size={36} color="#0284c7" />
          </View>
          <Text style={[styles.brandTitle, isDark && styles.brandTitleDark]}>LabMatrix Market</Text>
          <Text style={styles.brandSubtitle}>Sign in to your laboratory marketplace account</Text>
        </View>

        <View style={styles.form}>
          <Text style={[styles.label, isDark && styles.labelDark]}>Email Address</Text>
          <View style={[styles.inputWrapper, isDark && styles.inputWrapperDark]}>
            <Mail size={18} color="#64748b" />
            <TextInput
              style={[styles.input, isDark && styles.inputDark]}
              placeholder="researcher@lab.org"
              placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <Text style={[styles.label, isDark && styles.labelDark]}>Password</Text>
          <View style={[styles.inputWrapper, isDark && styles.inputWrapperDark]}>
            <Lock size={18} color="#64748b" />
            <TextInput
              style={[styles.input, isDark && styles.inputDark]}
              placeholder="••••••••"
              placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => router.replace("/(auth)/register")}>
              <Text style={styles.linkText}>Create Account</Text>
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
    justifyContent: "center",
    flexGrow: 1,
  },
  brandHeader: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
  },
  brandTitleDark: {
    color: "#f8fafc",
  },
  brandSubtitle: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
    textAlign: "center",
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
