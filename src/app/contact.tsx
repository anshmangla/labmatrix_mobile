import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  useColorScheme,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, CheckCircle2, Send, Phone, Check } from "lucide-react-native";
import { api } from "@/lib/api";
import { useAuth } from "@/context/auth-context";

// Same subjects as the website's /contact form
const INQUIRY_CATEGORIES = [
  "Buy Pre-owned / Refurbished Laboratory Instrument",
  "Sell Surplus or Idle Analytical Equipment",
  "Spare Parts & Consumables Supply",
  "AMC & Preventive Maintenance / Relocation",
  "Analytical Laboratory Setup & Turnkey Consultancy",
  "Calibration & Validation Services",
  "General Business / Partnership Inquiry",
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ContactScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === "dark";
  const { user } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phoneNumber || "");
  const [company, setCompany] = useState(user?.companyName || "");
  const [subject, setSubject] = useState(INQUIRY_CATEGORIES[0]);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  // Mirrors the server's validation in /api/contact so users see problems before sending
  const validate = (): string | null => {
    if (name.trim().length < 2) return "Please enter your full name.";
    if (!EMAIL_REGEX.test(email.trim())) return "Please provide a valid email address.";
    if (phone.trim().length < 6) return "Please provide a valid contact phone number.";
    if (message.trim().length < 10) return "Please describe your requirement (at least 10 characters).";
    return null;
  };

  const handleSubmit = async () => {
    if (isSending) return;
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    setError("");
    setIsSending(true);
    try {
      await api.post("/api/contact", {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        company: company.trim(),
        subject,
        message: message.trim(),
      });
      setSent(true);
      setMessage("");
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          "Could not send your inquiry. Please try again or call +91 7303040804."
      );
    } finally {
      setIsSending(false);
    }
  };

  const inputStyle = [styles.input, isDark && styles.inputDark];

  return (
    <SafeAreaView edges={["top", "bottom"]} style={[styles.safeArea, isDark && styles.safeAreaDark]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={[styles.topBar, isDark && styles.topBarDark]}>
        <TouchableOpacity style={styles.backButton} activeOpacity={0.7} onPress={() => router.back()}>
          <ArrowLeft size={20} color={isDark ? "#f8fafc" : "#0f172a"} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && styles.headerTitleDark]}>Contact Sales Desk</Text>
        <View style={{ width: 36 }} />
      </View>

      {sent ? (
        <View style={styles.successWrap}>
          <CheckCircle2 size={48} color="#16a34a" />
          <Text style={[styles.successTitle, isDark && styles.textLight]}>Inquiry Sent</Text>
          <Text style={styles.successText}>
            Thank you! Your inquiry has been dispatched to LabMatrix Instrument India. Our team will
            contact you shortly, and a confirmation has been sent to {email.trim()}.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.back()}>
            <Text style={styles.primaryBtnText}>Done</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkBtn} onPress={() => setSent(false)}>
            <Text style={styles.linkBtnText}>Send another inquiry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            <Text style={styles.intro}>
              Tell us what you need and our engineering sales team will get back to you, typically
              within 2 to 4 business hours.
            </Text>

            <Text style={styles.label}>Full Name *</Text>
            <TextInput style={inputStyle} value={name} onChangeText={setName} maxLength={100} placeholder="Your name" placeholderTextColor="#94a3b8" />

            <Text style={styles.label}>Email Address *</Text>
            <TextInput
              style={inputStyle}
              value={email}
              onChangeText={setEmail}
              maxLength={254}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="you@company.com"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.label}>Phone / WhatsApp *</Text>
            <TextInput style={inputStyle} value={phone} onChangeText={setPhone} maxLength={30} keyboardType="phone-pad" placeholder="+91-XXXXXXXXXX" placeholderTextColor="#94a3b8" />

            <Text style={styles.label}>Company / Institution</Text>
            <TextInput style={inputStyle} value={company} onChangeText={setCompany} maxLength={150} placeholder="Laboratory or organization" placeholderTextColor="#94a3b8" />

            <Text style={styles.label}>Inquiry Type *</Text>
            <View style={styles.subjectList}>
              {INQUIRY_CATEGORIES.map((cat) => {
                const selected = subject === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.subjectOption, isDark && styles.subjectOptionDark, selected && styles.subjectOptionActive]}
                    activeOpacity={0.8}
                    onPress={() => setSubject(cat)}
                  >
                    <Text style={[styles.subjectText, isDark && styles.textLight, selected && styles.subjectTextActive]}>{cat}</Text>
                    {selected ? <Check size={16} color="#033a7d" /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Your Requirement *</Text>
            <TextInput
              style={[...inputStyle, styles.textArea]}
              value={message}
              onChangeText={setMessage}
              maxLength={5000}
              multiline
              textAlignVertical="top"
              placeholder="Model numbers, manufacturer preference, urgency, target city/state, or spare part catalog IDs..."
              placeholderTextColor="#94a3b8"
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.primaryBtn, isSending && { opacity: 0.6 }]}
              activeOpacity={0.85}
              onPress={handleSubmit}
              disabled={isSending}
            >
              {isSending ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Send size={16} color="#ffffff" />
                  <Text style={styles.primaryBtnText}>Send Inquiry</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => Linking.openURL("tel:+917303040804").catch(() => {})}
            >
              <Phone size={14} color="#033a7d" />
              <Text style={styles.linkBtnText}>Urgent? Call +91 73030 40804</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  safeAreaDark: { backgroundColor: "#010f22" },
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
  topBarDark: { backgroundColor: "#011936", borderBottomColor: "#1e293b" },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#eff5fb",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#0f172a" },
  headerTitleDark: { color: "#f8fafc" },
  textLight: { color: "#f8fafc" },
  form: { padding: 16, paddingBottom: 40, gap: 6 },
  intro: { fontSize: 13, color: "#64748b", lineHeight: 19, marginBottom: 8 },
  label: { fontSize: 12, fontWeight: "700", color: "#475569", marginTop: 8 },
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
  },
  inputDark: { backgroundColor: "#0b1320", borderColor: "#334155", color: "#f8fafc" },
  textArea: { minHeight: 120 },
  subjectList: { gap: 6 },
  subjectOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  subjectOptionDark: { backgroundColor: "#0b1320", borderColor: "#334155" },
  subjectOptionActive: { borderColor: "#033a7d", backgroundColor: "#eff5fb" },
  subjectText: { flex: 1, fontSize: 13, color: "#334155" },
  subjectTextActive: { color: "#033a7d", fontWeight: "700" },
  errorText: { color: "#ba1a1a", fontSize: 13, fontWeight: "600", marginTop: 8 },
  primaryBtn: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#033a7d",
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryBtnText: { color: "#ffffff", fontSize: 15, fontWeight: "700" },
  linkBtn: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
  },
  linkBtnText: { color: "#033a7d", fontSize: 13, fontWeight: "600" },
  successWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
  successTitle: { fontSize: 20, fontWeight: "800", color: "#0f172a" },
  successText: { fontSize: 14, color: "#64748b", textAlign: "center", lineHeight: 20 },
});
