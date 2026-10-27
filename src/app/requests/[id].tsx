import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  StyleSheet,
  useColorScheme,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Clock, Layers, Send, X } from "lucide-react-native";
import { api } from "@/lib/api";
import { Requirement } from "@/types/api";
import { useAuth } from "@/context/auth-context";

export default function RequirementDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { isAuthenticated, user } = useAuth();

  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phoneNumber || "");
  const [company, setCompany] = useState(user?.companyName || "");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["requirement", id],
    queryFn: async () => {
      const res = await api.get(`/api/requirements/${id}`);
      return res.data?.requirement as Requirement;
    },
  });

  const handleSendFulfillment = async () => {
    if (!name.trim() || !email.trim() || !phone.trim()) {
      Alert.alert("Validation", "Name, email, and phone number are required.");
      return;
    }
    if (!message.trim() || message.length < 10) {
      Alert.alert("Validation", "Please describe what instrument or spare part you can supply.");
      return;
    }

    setIsSending(true);
    try {
      await api.post("/api/inquiries", {
        requirementId: id,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        company: company.trim() || undefined,
        message: message.trim(),
      });

      setModalVisible(false);
      setMessage("");
      Alert.alert("Offer Submitted", "Your proposal has been delivered to the requesting buyer.");
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.error || "Could not submit offer.");
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading || !data) {
    return (
      <View style={[styles.loadingContainer, isDark && styles.loadingContainerDark]}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={styles.loadingText}>Loading requirement details...</Text>
      </View>
    );
  }

  const isFulfilled = data.status === "FULFILLED";

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.badgeRow}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{data.category}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              isFulfilled ? styles.statusFulfilled : styles.statusOpen,
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                isFulfilled ? styles.statusFulfilledText : styles.statusOpenText,
              ]}
            >
              {data.status}
            </Text>
          </View>
        </View>

        <Text style={[styles.title, isDark && styles.titleDark]}>{data.title}</Text>

        <View style={styles.metaRow}>
          <Clock size={13} color="#64748b" />
          <Text style={styles.metaText}>
            Posted on {new Date(data.createdAt).toLocaleDateString()}
          </Text>
        </View>

        {(data.partNumber || data.compatibleWith) && (
          <View style={[styles.specBox, isDark && styles.specBoxDark]}>
            <Text style={[styles.specHeader, isDark && styles.specHeaderDark]}>Target Specifications</Text>
            {data.partNumber && (
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Part Number / Code:</Text>
                <Text style={[styles.specValue, isDark && styles.specValueDark]}>{data.partNumber}</Text>
              </View>
            )}
            {data.compatibleWith && (
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Instrument Compatibility:</Text>
                <Text style={[styles.specValue, isDark && styles.specValueDark]}>{data.compatibleWith}</Text>
              </View>
            )}
          </View>
        )}

        <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>Description</Text>
        <Text style={[styles.description, isDark && styles.descriptionDark]}>{data.description}</Text>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={[styles.actionBar, isDark && styles.actionBarDark]}>
        <TouchableOpacity
          style={styles.fulfillBtn}
          onPress={() => {
            if (!isAuthenticated) {
              Alert.alert("Sign In Required", "Please sign in to reply to this requirement.", [
                { text: "Cancel" },
                { text: "Sign In", onPress: () => router.push("/(auth)/login") },
              ]);
              return;
            }
            setModalVisible(true);
          }}
        >
          <Send size={18} color="#ffffff" />
          <Text style={styles.fulfillBtnText}>I Have This Equipment (Fulfill Request)</Text>
        </TouchableOpacity>
      </View>

      {/* Offer Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isDark && styles.modalCardDark]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDark && styles.modalTitleDark]}>Supply Equipment to Buyer</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={22} color={isDark ? "#f8fafc" : "#0f172a"} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.inputLabel}>Your Name *</Text>
              <TextInput
                style={[styles.modalInput, isDark && styles.modalInputDark]}
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.inputLabel}>Phone Number *</Text>
              <TextInput
                style={[styles.modalInput, isDark && styles.modalInputDark]}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />

              <Text style={styles.inputLabel}>Company / Facility</Text>
              <TextInput
                style={[styles.modalInput, isDark && styles.modalInputDark]}
                value={company}
                onChangeText={setCompany}
              />

              <Text style={styles.inputLabel}>What can you provide? (Condition, Price, Specs) *</Text>
              <TextInput
                style={[styles.modalTextArea, isDark && styles.modalTextAreaDark]}
                placeholder="Mention condition, testing status, price quote..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
                value={message}
                onChangeText={setMessage}
              />

              <TouchableOpacity
                style={[styles.modalSubmitBtn, isSending && styles.modalSubmitBtnDisabled]}
                onPress={handleSendFulfillment}
                disabled={isSending}
              >
                {isSending ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Submit Supply Proposal</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
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
  scrollContent: {
    padding: 18,
    paddingBottom: 90,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainerDark: {
    backgroundColor: "#090d16",
  },
  loadingText: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 10,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  categoryBadge: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    color: "#0369a1",
    fontSize: 12,
    fontWeight: "700",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  statusOpen: {
    backgroundColor: "#dcfce7",
  },
  statusOpenText: {
    color: "#15803d",
    fontSize: 12,
    fontWeight: "700",
  },
  statusFulfilled: {
    backgroundColor: "#f1f5f9",
  },
  statusFulfilledText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 8,
  },
  titleDark: {
    color: "#f8fafc",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 18,
  },
  metaText: {
    fontSize: 13,
    color: "#64748b",
  },
  specBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  specBoxDark: {
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
  },
  specHeader: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
  },
  specHeaderDark: {
    color: "#cbd5e1",
  },
  specItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  specLabel: {
    fontSize: 13,
    color: "#64748b",
  },
  specValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0f172a",
  },
  specValueDark: {
    color: "#f8fafc",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 8,
  },
  sectionTitleDark: {
    color: "#f8fafc",
  },
  description: {
    fontSize: 15,
    color: "#334155",
    lineHeight: 22,
  },
  descriptionDark: {
    color: "#cbd5e1",
  },
  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    padding: 14,
  },
  actionBarDark: {
    backgroundColor: "#0f172a",
    borderTopColor: "#1e293b",
  },
  fulfillBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0284c7",
    paddingVertical: 14,
    borderRadius: 12,
  },
  fulfillBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "85%",
  },
  modalCardDark: {
    backgroundColor: "#0f172a",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  modalTitleDark: {
    color: "#f8fafc",
  },
  modalForm: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginTop: 8,
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 14,
    color: "#0f172a",
  },
  modalInputDark: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    color: "#f8fafc",
  },
  modalTextArea: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 80,
    fontSize: 14,
    color: "#0f172a",
    textAlignVertical: "top",
  },
  modalTextAreaDark: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    color: "#f8fafc",
  },
  modalSubmitBtn: {
    backgroundColor: "#0284c7",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 18,
    marginBottom: 10,
  },
  modalSubmitBtnDisabled: {
    opacity: 0.6,
  },
  modalSubmitBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },
});
