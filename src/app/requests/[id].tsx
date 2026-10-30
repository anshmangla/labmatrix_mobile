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
  Linking,
  Share,
  Platform,
  StatusBar,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  ShieldCheck,
  Shield,
  CheckCircle2,
  FileText,
  Phone,
  Share2,
  Pencil,
  ChevronLeft,
  Building,
  Send,
  X,
  MapPin,
  Layers,
  ArrowRight,
} from "lucide-react-native";
import { api } from "@/lib/api";
import { Requirement } from "@/types/api";
import { useAuth } from "@/context/auth-context";
import { LabMatrixTokens } from "@/constants/theme";

const LABMATRIX_PHONE = "+917303040804";

export default function RequirementDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { colors } = LabMatrixTokens;
  const { isAuthenticated, user } = useAuth();

  // Offer modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phoneNumber || "");
  const [company, setCompany] = useState(user?.companyName || "");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const { data: detail, isLoading } = useQuery({
    queryKey: ["requirement", id],
    queryFn: async () => {
      const res = await api.get(`/api/requirements/${id}`);
      return {
        requirement: res.data?.requirement as Requirement,
        canEdit: Boolean(res.data?.isOwner || res.data?.isAdmin),
      };
    },
  });
  const data = detail?.requirement;
  const canEdit = detail?.canEdit ?? false;

  const handleShare = async () => {
    if (!data) return;
    try {
      await Share.share({
        title: data.title,
        message: `Buyer equipment requirement on LabMatrix: ${data.title} - https://surplus.labmatrixindia.com/requests/${data.id}`,
        url: `https://surplus.labmatrixindia.com/requests/${data.id}`,
      });
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  const handleCall = () => {
    Alert.alert(
      "Contact LabMatrix Procurement Desk",
      `Call LabMatrix technical coordinator regarding requirement REQ-${id.slice(0, 6).toUpperCase()}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Call Now", onPress: () => Linking.openURL(`tel:${LABMATRIX_PHONE}`) },
      ]
    );
  };

  const handleSendFulfillment = async () => {
    if (!name.trim() || !email.trim() || !phone.trim()) {
      Alert.alert("Validation Error", "Name, email, and phone number are required.");
      return;
    }
    if (!message.trim() || message.length < 10) {
      Alert.alert("Validation Error", "Please describe what equipment, model condition, and asking quote you can provide.");
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
      Alert.alert(
        "Proposal Delivered",
        "Your quotation and equipment offer have been delivered to the requesting facility and LabMatrix procurement operations."
      );
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.error || "Could not submit offer.");
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading || !data) {
    return (
      <View style={[styles.loadingContainer, isDark && styles.loadingContainerDark]}>
        <ActivityIndicator size="large" color={colors.primaryContainer} />
        <Text style={styles.loadingText}>Loading procurement requirement details...</Text>
      </View>
    );
  }

  const isFulfilled = data.status === "FULFILLED";
  const shortCode = data.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 5).toUpperCase();

  const getTargetBudget = () => {
    const desc = data.description;
    const match = desc.match(/₹[\d,]+(\s*-\s*₹[\d,]+)?/i) || desc.match(/budget:?\s*₹?[\d,]+/i);
    if (match) return match[0];
    if (data.category.includes("ICP") || data.category.includes("GC-MS")) return "₹18,00,000 – ₹25,00,000";
    if (data.category.includes("HPLC")) return "₹4,00,000 – ₹7,50,000";
    if (data.category.includes("FTIR") || data.category.includes("UV")) return "₹3,50,000 – ₹6,00,000";
    if (data.itemType === "SPARE_PART") return "₹50,000 – ₹1,50,000";
    return "Budget Upon Quotation";
  };

  const getPreferredOEM = () => {
    const desc = data.description.toLowerCase();
    const title = data.title.toLowerCase();
    const combined = `${title} ${desc}`;

    const brands: string[] = [];
    if (combined.includes("perkinelmer") || combined.includes("perkin elmer")) brands.push("PerkinElmer");
    if (combined.includes("agilent")) brands.push("Agilent");
    if (combined.includes("waters")) brands.push("Waters");
    if (combined.includes("shimadzu")) brands.push("Shimadzu");
    if (combined.includes("thermo")) brands.push("Thermo Fisher");
    if (combined.includes("metrohm")) brands.push("Metrohm");

    if (brands.length > 0) return brands.join(", ");
    return "Verified Lab OEMs";
  };

  return (
    <SafeAreaView edges={["top"]} style={[styles.safeArea, isDark && styles.safeAreaDark]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Top Header */}
      <View style={[styles.headerBar, isDark && styles.headerBarDark]}>
        <TouchableOpacity
          style={styles.headerCircleBtn}
          activeOpacity={0.8}
          onPress={() => router.back()}
        >
          <ChevronLeft size={22} color="#0f172a" />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, isDark && styles.headerTitleDark]} numberOfLines={1}>
          Requirement REQ-2026-{shortCode}
        </Text>

        <View style={{ flexDirection: "row", gap: 8 }}>
          {canEdit && (
            <TouchableOpacity
              style={styles.headerCircleBtn}
              activeOpacity={0.8}
              onPress={() =>
                router.push({ pathname: "/(tabs)/requests", params: { edit: data.id } } as any)
              }
            >
              <Pencil size={18} color="#0f172a" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.headerCircleBtn}
            activeOpacity={0.8}
            onPress={handleShare}
          >
            <Share2 size={18} color="#0f172a" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Card */}
        <View style={[styles.heroCard, isDark && styles.heroCardDark]}>
          <View style={styles.badgeRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{data.category}</Text>
            </View>

            <View style={styles.adminProtectedBadge}>
              <Shield size={12} color="#033a7d" />
              <Text style={styles.adminProtectedText}>ADMIN PROTECTED BUYER</Text>
            </View>
          </View>

          {/* Status Row */}
          <View style={styles.statusPillRow}>
            {isFulfilled ? (
              <View style={styles.fulfilledPill}>
                <View style={styles.fulfilledDot} />
                <Text style={styles.fulfilledPillText}>FULFILLED</Text>
              </View>
            ) : (
              <View style={styles.openPill}>
                <View style={styles.openDot} />
                <Text style={styles.openPillText}>OPEN FOR PROPOSALS</Text>
              </View>
            )}
          </View>

          {/* Timestamp */}
          <View style={styles.metaRow}>
            <Clock size={12} color="#64748b" />
            <Text style={styles.metaDate}>
              Posted on {new Date(data.createdAt).toLocaleDateString("en-GB")}
            </Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.reqCodeText}>REQ-2026-{shortCode}</Text>
          </View>

          {/* Title */}
          <Text style={[styles.title, isDark && styles.titleDark]}>{data.title}</Text>

          {/* Budget Highlight Container */}
          <View style={styles.budgetHighlightBox}>
            <Text style={styles.budgetLabel}>TARGET BUDGET RANGE</Text>
            <Text style={styles.budgetValue}>{getTargetBudget()}</Text>
            <Text style={styles.budgetSub}>Direct commercial quotation proposals welcomed</Text>
          </View>
        </View>

        {/* Specifications & Description */}
        <View style={[styles.sectionCard, isDark && styles.sectionCardDark]}>
          <View style={styles.sectionHeader}>
            <FileText size={18} color="#033a7d" />
            <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
              Required Specifications & Testing Scope
            </Text>
          </View>
          <Text style={[styles.descriptionText, isDark && styles.descriptionTextDark]}>
            {data.description}
          </Text>
        </View>

        {/* Target Parameters Grid Table */}
        <View style={[styles.sectionCard, isDark && styles.sectionCardDark]}>
          <View style={styles.sectionHeader}>
            <Layers size={18} color="#033a7d" />
            <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
              Target Parameters
            </Text>
          </View>

          <View style={styles.specTable}>
            <View style={styles.specTableRow}>
              <Text style={styles.specKey}>Category</Text>
              <Text style={[styles.specVal, isDark && styles.specValDark]}>{data.category}</Text>
            </View>

            <View style={styles.specTableRow}>
              <Text style={styles.specKey}>Requirement Type</Text>
              <Text style={[styles.specVal, isDark && styles.specValDark]}>
                {data.itemType === "SPARE_PART" ? "Replacement Spare Part / Board" : "Analytical Equipment / Machine"}
              </Text>
            </View>

            <View style={styles.specTableRow}>
              <Text style={styles.specKey}>Preferred OEMs</Text>
              <Text style={[styles.specVal, isDark && styles.specValDark]}>{getPreferredOEM()}</Text>
            </View>

            {data.partNumber && (
              <View style={styles.specTableRow}>
                <Text style={styles.specKey}>Part Number / Code</Text>
                <Text style={[styles.specValMono, isDark && styles.specValDark]}>{data.partNumber}</Text>
              </View>
            )}

            {data.compatibleWith && (
              <View style={styles.specTableRow}>
                <Text style={styles.specKey}>Compatible Model</Text>
                <Text style={[styles.specVal, isDark && styles.specValDark]}>{data.compatibleWith}</Text>
              </View>
            )}

            <View style={[styles.specTableRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.specKey}>Procurement Status</Text>
              <Text style={[styles.specVal, { color: isFulfilled ? "#64748b" : "#15803d" }]}>
                {isFulfilled ? "Fulfilled / Closed" : "Actively Sourcing"}
              </Text>
            </View>
          </View>
        </View>

        {/* Verified Procurement Request Callout Banner */}
        <View style={styles.assuranceBanner}>
          <View style={styles.assuranceHeader}>
            <ShieldCheck size={22} color={colors.goldAccent} />
            <Text style={styles.assuranceTitle}>Verified Laboratory Procurement Request</Text>
          </View>
          <Text style={styles.assuranceText}>
            This procurement request is actively posted by a verified testing, pharmaceutical, or research laboratory.
            If you own, inventory, or represent equivalent refurbished equipment or spare parts, submit your proposal below.
          </Text>
        </View>

        {/* 3-Step Fulfillment Guide */}
        <View style={[styles.guideCard, isDark && styles.guideCardDark]}>
          <Text style={[styles.guideTitle, isDark && styles.guideTitleDark]}>
            How Equipment Sellers Fulfill Requests
          </Text>

          <View style={styles.guideStep}>
            <CheckCircle2 size={16} color="#033a7d" style={{ marginTop: 2 }} />
            <Text style={styles.guideStepText}>
              <Text style={{ fontWeight: "700" }}>Submit Model Details & Ask: </Text>
              Provide configuration, operational testing history, and price quote.
            </Text>
          </View>

          <View style={styles.guideStep}>
            <CheckCircle2 size={16} color="#033a7d" style={{ marginTop: 2 }} />
            <Text style={styles.guideStepText}>
              <Text style={{ fontWeight: "700" }}>LabMatrix Operations Review: </Text>
              The platform technical coordinator facilitates matching and technical review with the buyer.
            </Text>
          </View>

          <View style={styles.guideStep}>
            <CheckCircle2 size={16} color="#033a7d" style={{ marginTop: 2 }} />
            <Text style={styles.guideStepText}>
              <Text style={{ fontWeight: "700" }}>Protected Inspection & Settlement: </Text>
              Pre-dispatch inspection, white-glove transport, and transaction escrow coordinated.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      <View style={[styles.bottomBar, isDark && styles.bottomBarDark, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity
          style={styles.callDeskBtn}
          activeOpacity={0.8}
          onPress={handleCall}
        >
          <Phone size={20} color="#033a7d" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryFulfillBtn, isFulfilled && styles.primaryFulfillBtnDisabled]}
          activeOpacity={0.85}
          onPress={() => {
            if (!isAuthenticated) {
              Alert.alert("Sign In Required", "Please sign in to submit a quotation proposal.", [
                { text: "Cancel", style: "cancel" },
                { text: "Sign In", onPress: () => router.push("/(auth)/login" as any) },
              ]);
              return;
            }
            setModalVisible(true);
          }}
          disabled={isFulfilled}
        >
          <Send size={16} color="#ffffff" />
          <Text style={styles.primaryFulfillBtnText}>
            {isFulfilled ? "Requirement Fulfilled" : "Submit Supply Proposal"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Supply Proposal Modal Form */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { paddingTop: insets.top }]}>
          <View style={[styles.modalSheet, isDark && styles.modalSheetDark, { paddingBottom: Math.max(insets.bottom + 8, 20) }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.modalSub}>Quotation Proposal</Text>
                <Text style={[styles.modalTitleText, isDark && styles.modalTitleTextDark]} numberOfLines={1}>
                  Offer for: {data.title}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalForm}
              contentContainerStyle={styles.modalFormContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.inputLabel}>Your Name *</Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                value={name}
                onChangeText={setName}
                placeholder="Full Name"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputLabel}>Phone / WhatsApp *</Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="+91-XXXXXXXXXX"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputLabel}>Email Address *</Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="name@company.com"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputLabel}>Company / Institution</Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                value={company}
                onChangeText={setCompany}
                placeholder="Facility or Supplier Company"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputLabel}>
                What equipment can you supply? (Model, Condition, Asking Price) *
              </Text>
              <TextInput
                style={[styles.textArea, isDark && styles.textAreaDark]}
                value={message}
                onChangeText={setMessage}
                placeholder="Describe available instrument model, year, working condition, accessories, testing status, and your quotation price..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
              />

              <TouchableOpacity
                style={[
                  styles.submitProposalBtn,
                  isSending && styles.submitProposalBtnDisabled,
                ]}
                activeOpacity={0.85}
                onPress={handleSendFulfillment}
                disabled={isSending}
              >
                {isSending ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Send size={16} color="#ffffff" />
                    <Text style={styles.submitProposalBtnText}>Submit Supply Proposal</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  safeAreaDark: {
    backgroundColor: LabMatrixTokens.colors.brandBlue950,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerBarDark: {
    backgroundColor: "#0b1329",
    borderBottomColor: "#1e293b",
  },
  headerCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
    maxWidth: "70%",
  },
  headerTitleDark: {
    color: "#f8fafc",
  },
  scrollContent: {
    paddingBottom: 110,
    backgroundColor: "#f8fafc",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#ffffff",
  },
  loadingContainerDark: {
    backgroundColor: LabMatrixTokens.colors.brandBlue950,
  },
  loadingText: {
    fontSize: 14,
    color: "#64748b",
  },
  heroCard: {
    backgroundColor: "#ffffff",
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  heroCardDark: {
    backgroundColor: "#0b1329",
    borderBottomColor: "#1e293b",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: "#eff5fb",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#033a7d",
    letterSpacing: 0.3,
  },
  adminProtectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#eff5fb",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  adminProtectedText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#033a7d",
    letterSpacing: 0.3,
  },
  statusPillRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  openPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  openDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#15803d",
  },
  openPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#15803d",
    letterSpacing: 0.4,
  },
  fulfilledPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  fulfilledDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#64748b",
  },
  fulfilledPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  metaDate: {
    fontSize: 11,
    color: "#64748b",
  },
  metaDot: {
    fontSize: 11,
    color: "#cbd5e1",
  },
  reqCodeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#b45309",
    fontFamily: Platform.select({ ios: "Courier", android: "monospace" }),
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0f172a",
    lineHeight: 26,
    marginBottom: 14,
  },
  titleDark: {
    color: "#f8fafc",
  },
  budgetHighlightBox: {
    backgroundColor: "#eff5fb",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#dbeaf7",
    padding: 12,
  },
  budgetLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  budgetValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#002555",
    marginBottom: 2,
  },
  budgetSub: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "500",
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    marginTop: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionCardDark: {
    backgroundColor: "#0b1329",
    borderColor: "#1e293b",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
  },
  sectionTitleDark: {
    color: "#f8fafc",
  },
  descriptionText: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 22,
  },
  descriptionTextDark: {
    color: "#cbd5e1",
  },
  specTable: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  specTableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  specKey: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },
  specVal: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
    maxWidth: "60%",
    textAlign: "right",
  },
  specValMono: {
    fontSize: 12,
    fontWeight: "700",
    color: "#002555",
    fontFamily: Platform.select({ ios: "Courier", android: "monospace" }),
  },
  specValDark: {
    color: "#f8fafc",
  },
  assuranceBanner: {
    backgroundColor: LabMatrixTokens.colors.brandBlue950,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#033a7d",
  },
  assuranceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  assuranceTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: LabMatrixTokens.colors.goldAccent,
    letterSpacing: 0.3,
  },
  assuranceText: {
    fontSize: 12,
    color: "#cbd5e1",
    lineHeight: 18,
  },
  guideCard: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 10,
  },
  guideCardDark: {
    backgroundColor: "#0b1329",
    borderColor: "#1e293b",
  },
  guideTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 4,
  },
  guideTitleDark: {
    color: "#f8fafc",
  },
  guideStep: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  guideStepText: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 18,
    flex: 1,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 28 : 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bottomBarDark: {
    backgroundColor: "#0b1329",
    borderTopColor: "#1e293b",
  },
  callDeskBtn: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#eff5fb",
    borderWidth: 1,
    borderColor: "#dbeaf7",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryFulfillBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#033a7d",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryFulfillBtnDisabled: {
    backgroundColor: "#94a3b8",
  },
  primaryFulfillBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    maxHeight: "90%",
  },
  modalSheetDark: {
    backgroundColor: "#0b1329",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  modalSub: {
    fontSize: 11,
    fontWeight: "800",
    color: "#033a7d",
    textTransform: "uppercase",
  },
  modalTitleText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
  },
  modalTitleTextDark: {
    color: "#f8fafc",
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalForm: {
    flexShrink: 1,
  },
  modalFormContent: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    height: 42,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#0f172a",
  },
  inputDark: {
    backgroundColor: "#16203a",
    borderColor: "#1e293b",
    color: "#f8fafc",
  },
  textArea: {
    height: 90,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
    textAlignVertical: "top",
  },
  textAreaDark: {
    backgroundColor: "#16203a",
    borderColor: "#1e293b",
    color: "#f8fafc",
  },
  submitProposalBtn: {
    backgroundColor: "#033a7d",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    marginTop: 18,
    marginBottom: 20,
  },
  submitProposalBtnDisabled: {
    opacity: 0.6,
  },
  submitProposalBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
});
