import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  StyleSheet,
  useColorScheme,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  MapPin,
  Tag,
  ShieldCheck,
  Send,
  X,
  Layers,
  Calendar,
} from "lucide-react-native";
import { api } from "@/lib/api";
import { Listing } from "@/types/api";
import { useAuth } from "@/context/auth-context";

const { width } = Dimensions.get("window");

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { isAuthenticated, user } = useAuth();

  const [inquiryModalVisible, setInquiryModalVisible] = useState(false);
  const [inquiryName, setInquiryName] = useState(user?.name || "");
  const [inquiryEmail, setInquiryEmail] = useState(user?.email || "");
  const [inquiryPhone, setInquiryPhone] = useState(user?.phoneNumber || "");
  const [inquiryCompany, setInquiryCompany] = useState(user?.companyName || "");
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [isSendingInquiry, setIsSendingInquiry] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      const res = await api.get(`/api/listings/${id}`);
      return res.data?.listing as Listing;
    },
  });

  const handleSendInquiry = async () => {
    if (!inquiryName.trim() || !inquiryEmail.trim() || !inquiryPhone.trim()) {
      Alert.alert("Validation", "Name, email, and phone number are required.");
      return;
    }
    if (!inquiryMessage.trim() || inquiryMessage.length < 10) {
      Alert.alert("Validation", "Please enter a message of at least 10 characters.");
      return;
    }

    setIsSendingInquiry(true);
    try {
      await api.post("/api/inquiries", {
        listingId: id,
        name: inquiryName.trim(),
        email: inquiryEmail.trim(),
        phone: inquiryPhone.trim(),
        company: inquiryCompany.trim() || undefined,
        message: inquiryMessage.trim(),
      });

      setInquiryModalVisible(false);
      setInquiryMessage("");
      Alert.alert("Inquiry Sent", "Your inquiry has been submitted. The seller will be notified.");
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.error || "Could not submit inquiry.");
    } finally {
      setIsSendingInquiry(false);
    }
  };

  if (isLoading || !data) {
    return (
      <View style={[styles.loadingContainer, isDark && styles.loadingContainerDark]}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={styles.loadingText}>Loading instrument details...</Text>
      </View>
    );
  }

  const priceText =
    data.minPrice && data.maxPrice
      ? data.minPrice === data.maxPrice
        ? `₹${data.minPrice.toLocaleString()}`
        : `₹${data.minPrice.toLocaleString()} - ₹${data.maxPrice.toLocaleString()}`
      : data.minPrice
      ? `₹${data.minPrice.toLocaleString()}`
      : "Contact for Pricing";

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Photo Gallery */}
        {data.photos && data.photos.length > 0 ? (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.carousel}>
            {data.photos.map((photo, idx) => (
              <Image key={idx} source={{ uri: photo }} style={styles.carouselImage} resizeMode="cover" />
            ))}
          </ScrollView>
        ) : (
          <View style={[styles.noImageBanner, isDark && styles.noImageBannerDark]}>
            <Tag size={44} color="#94a3b8" />
          </View>
        )}

        {/* Content Body */}
        <View style={styles.body}>
          <View style={styles.badgeRow}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>
                {data.itemType === "SPARE_PART" ? "Spare Part" : "Equipment"}
              </Text>
            </View>
            <View style={styles.conditionBadge}>
              <Text style={styles.conditionBadgeText}>{data.condition}</Text>
            </View>
          </View>

          <Text style={[styles.title, isDark && styles.titleDark]}>{data.title}</Text>
          <Text style={styles.price}>{priceText}</Text>

          <View style={styles.metaRow}>
            <MapPin size={14} color="#64748b" />
            <Text style={styles.metaText}>{data.location}</Text>
            <Calendar size={14} color="#64748b" style={{ marginLeft: 12 }} />
            <Text style={styles.metaText}>{new Date(data.createdAt).toLocaleDateString()}</Text>
          </View>

          {/* Specifications Box */}
          <View style={[styles.specBox, isDark && styles.specBoxDark]}>
            <Text style={[styles.specHeader, isDark && styles.specHeaderDark]}>Specifications</Text>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Category:</Text>
              <Text style={[styles.specValue, isDark && styles.specValueDark]}>{data.category}</Text>
            </View>
            {data.partNumber && (
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Part Number:</Text>
                <Text style={[styles.specValue, isDark && styles.specValueDark]}>{data.partNumber}</Text>
              </View>
            )}
            {data.compatibleWith && (
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Compatible With:</Text>
                <Text style={[styles.specValue, isDark && styles.specValueDark]}>{data.compatibleWith}</Text>
              </View>
            )}
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Quantity Available:</Text>
              <Text style={[styles.specValue, isDark && styles.specValueDark]}>{data.quantity}</Text>
            </View>
          </View>

          {/* Description */}
          <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>Description</Text>
          <Text style={[styles.description, isDark && styles.descriptionDark]}>{data.description}</Text>
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={[styles.actionBar, isDark && styles.actionBarDark]}>
        <TouchableOpacity
          style={styles.inquireBtn}
          onPress={() => {
            if (!isAuthenticated) {
              Alert.alert("Sign In Required", "Please sign in to send an inquiry.", [
                { text: "Cancel" },
                { text: "Sign In", onPress: () => router.push("/(auth)/login") },
              ]);
              return;
            }
            setInquiryModalVisible(true);
          }}
        >
          <Send size={18} color="#ffffff" />
          <Text style={styles.inquireBtnText}>Send Inquiry / Request Quote</Text>
        </TouchableOpacity>
      </View>

      {/* Inquiry Modal */}
      <Modal visible={inquiryModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isDark && styles.modalCardDark]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDark && styles.modalTitleDark]}>Inquiry for {data.title}</Text>
              <TouchableOpacity onPress={() => setInquiryModalVisible(false)}>
                <X size={22} color={isDark ? "#f8fafc" : "#0f172a"} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.inputLabel}>Your Name *</Text>
              <TextInput
                style={[styles.modalInput, isDark && styles.modalInputDark]}
                value={inquiryName}
                onChangeText={setInquiryName}
              />

              <Text style={styles.inputLabel}>Phone Number *</Text>
              <TextInput
                style={[styles.modalInput, isDark && styles.modalInputDark]}
                keyboardType="phone-pad"
                value={inquiryPhone}
                onChangeText={setInquiryPhone}
              />

              <Text style={styles.inputLabel}>Company / Institution</Text>
              <TextInput
                style={[styles.modalInput, isDark && styles.modalInputDark]}
                value={inquiryCompany}
                onChangeText={setInquiryCompany}
              />

              <Text style={styles.inputLabel}>Message *</Text>
              <TextInput
                style={[styles.modalTextArea, isDark && styles.modalTextAreaDark]}
                placeholder="Ask about testing, warranty, shipping, or make an offer..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
                value={inquiryMessage}
                onChangeText={setInquiryMessage}
              />

              <TouchableOpacity
                style={[styles.modalSubmitBtn, isSendingInquiry && styles.modalSubmitBtnDisabled]}
                onPress={handleSendInquiry}
                disabled={isSendingInquiry}
              >
                {isSendingInquiry ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Submit Inquiry</Text>
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
    paddingBottom: 90,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  loadingContainerDark: {
    backgroundColor: "#090d16",
  },
  loadingText: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 10,
  },
  carousel: {
    width: width,
    height: 260,
  },
  carouselImage: {
    width: width,
    height: 260,
  },
  noImageBanner: {
    width: width,
    height: 180,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  noImageBannerDark: {
    backgroundColor: "#1e293b",
  },
  body: {
    padding: 16,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  typeBadge: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    color: "#0369a1",
    fontSize: 12,
    fontWeight: "700",
  },
  conditionBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  conditionBadgeText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "600",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 6,
  },
  titleDark: {
    color: "#f8fafc",
  },
  price: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0284c7",
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  metaText: {
    fontSize: 13,
    color: "#64748b",
    marginLeft: 4,
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
  inquireBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0284c7",
    paddingVertical: 14,
    borderRadius: 12,
  },
  inquireBtnText: {
    color: "#ffffff",
    fontSize: 16,
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
    flex: 1,
    marginRight: 10,
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
