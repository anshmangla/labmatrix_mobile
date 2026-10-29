import React, { useState, useRef } from "react";
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
  Linking,
  Share,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  MapPin,
  Tag,
  ShieldCheck,
  Send,
  X,
  Calendar,
  Phone,
  Share2,
  Video,
  CheckCircle2,
  Truck,
  FileText,
  ChevronLeft,
  Building2,
  Mail,
  Layers,
} from "lucide-react-native";
import { api } from "@/lib/api";
import { Listing } from "@/types/api";
import { useAuth } from "@/context/auth-context";
import { LabMatrixTokens } from "@/constants/theme";
import { getOptimizedImageUrl, IMAGE_PRESETS } from "@/lib/images";

const { width } = Dimensions.get("window");
const CAROUSEL_HEIGHT = 280;
const LABMATRIX_PHONE = "+917303040804";

const DETAIL_TABS = ["Overview", "Specifications", "Verification", "Assurance"] as const;
type DetailTab = (typeof DETAIL_TABS)[number];

export default function ListingDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { colors } = LabMatrixTokens;
  const { isAuthenticated, user } = useAuth();

  const [activeTab, setActiveTab] = useState<DetailTab>("Overview");
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Inquiry form states
  const [inquiryModalVisible, setInquiryModalVisible] = useState(false);
  const [inquiryName, setInquiryName] = useState(user?.name || "");
  const [inquiryEmail, setInquiryEmail] = useState(user?.email || "");
  const [inquiryPhone, setInquiryPhone] = useState(user?.phoneNumber || "");
  const [inquiryCompany, setInquiryCompany] = useState(user?.companyName || "");
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [isSendingInquiry, setIsSendingInquiry] = useState(false);

  // Query single listing
  const { data, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      const res = await api.get(`/api/listings/${id}`);
      return res.data?.listing as Listing;
    },
  });

  const handleShare = async () => {
    if (!data) return;
    try {
      await Share.share({
        title: data.title,
        message: `Check out this laboratory equipment on LabMatrix: ${data.title} - https://surplus.labmatrixindia.com/listings/${data.id}`,
        url: `https://surplus.labmatrixindia.com/listings/${data.id}`,
      });
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  const handleCall = () => {
    Alert.alert(
      "Contact LabMatrix Desk",
      `Call LabMatrix technical sales desk directly at ${LABMATRIX_PHONE}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Call Now",
          onPress: () => Linking.openURL(`tel:${LABMATRIX_PHONE}`),
        },
      ]
    );
  };

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
      Alert.alert(
        "Inquiry Submitted",
        "Your quotation request has been delivered to LabMatrix operations and the equipment seller. You will be contacted shortly."
      );
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.error || "Could not submit inquiry.");
    } finally {
      setIsSendingInquiry(false);
    }
  };

  if (isLoading || !data) {
    return (
      <View style={[styles.loadingContainer, isDark && styles.loadingContainerDark]}>
        <ActivityIndicator size="large" color={colors.primaryContainer} />
        <Text style={styles.loadingText}>Loading instrument details & verified specs...</Text>
      </View>
    );
  }

  const isSold = data.status === "SOLD";
  const formattedMin = data.minPrice ? data.minPrice.toLocaleString("en-IN") : null;
  const formattedMax =
    data.maxPrice && data.minPrice && data.maxPrice > data.minPrice
      ? data.maxPrice.toLocaleString("en-IN")
      : null;

  const priceText = formattedMin
    ? formattedMax
      ? `₹${formattedMin} - ₹${formattedMax}`
      : `₹${formattedMin}`
    : "Contact for Pricing";

  const photos = data.photos || [];

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Top Floating Navigation Header */}
      <SafeAreaView style={styles.headerBar}>
        <TouchableOpacity
          style={styles.headerCircleBtn}
          activeOpacity={0.8}
          onPress={() => router.back()}
        >
          <ChevronLeft size={22} color="#0f172a" />
        </TouchableOpacity>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.headerCircleBtn}
            activeOpacity={0.8}
            onPress={handleShare}
          >
            <Share2 size={18} color="#0f172a" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Photo Gallery Carousel */}
        <View style={styles.carouselContainer}>
          {photos.length > 0 ? (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
                  setActiveImageIndex(newIndex);
                }}
              >
                {photos.map((photo, idx) => (
                  <Image
                    key={idx}
                    source={{ uri: getOptimizedImageUrl(photo, IMAGE_PRESETS.HERO) }}
                    style={styles.carouselImage}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>

              {/* Pagination Dots */}
              {photos.length > 1 && (
                <View style={styles.paginationDots}>
                  {photos.map((_, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.dot,
                        idx === activeImageIndex && styles.activeDot,
                      ]}
                    />
                  ))}
                </View>
              )}

              {/* Photo Count Pill */}
              <View style={styles.photoCountPill}>
                <Text style={styles.photoCountText}>
                  {activeImageIndex + 1} / {photos.length}
                </Text>
              </View>
            </>
          ) : (
            <View style={[styles.noImageContainer, isDark && styles.noImageContainerDark]}>
              <Tag size={44} color="#94a3b8" />
              <Text style={styles.noImageText}>Laboratory Inspection Photos Pending</Text>
            </View>
          )}

          {/* Sold Out Watermark / Overlay */}
          {isSold && (
            <View style={styles.soldBannerOverlay}>
              <Text style={styles.soldBannerOverlayText}>SOLD OUT</Text>
            </View>
          )}
        </View>

        {/* Instrument Title & Identification Block */}
        <View style={[styles.mainBlock, isDark && styles.mainBlockDark]}>
          <View style={styles.categoryBadgeRow}>
            <Text style={styles.categorySubtitle}>{data.category}</Text>
            {data.itemType === "SPARE_PART" && (
              <View style={styles.spareBadge}>
                <Text style={styles.spareBadgeText}>Tested Spare Part</Text>
              </View>
            )}
            {data.itemType === "NEW_INSTRUMENT" && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>OEM Sealed Demo</Text>
              </View>
            )}
          </View>

          <Text style={[styles.title, isDark && styles.titleDark]}>{data.title}</Text>

          {/* Price Box */}
          <View style={styles.priceContainer}>
            <Text style={styles.priceSubtext}>
              {isSold ? "Price Realized (Sold)" : "Approximate Price Expectation"}
            </Text>
            <Text style={[styles.priceText, isSold && styles.priceTextSold]}>{priceText}</Text>
          </View>

          {/* Chips Row */}
          <View style={styles.chipsRow}>
            <View style={styles.conditionChip}>
              <Text style={styles.conditionChipText}>{data.condition}</Text>
            </View>

            {isSold ? (
              <View style={[styles.conditionChip, { backgroundColor: "#fee2e2" }]}>
                <Text style={[styles.conditionChipText, { color: "#b91c1c", fontWeight: "800" }]}>
                  • Sold Out
                </Text>
              </View>
            ) : (
              <View style={styles.qtyChip}>
                <Text style={styles.qtyChipText}>Qty: {data.quantity || 1} available</Text>
              </View>
            )}

            {data.location ? (
              <View style={styles.locationChip}>
                <MapPin size={12} color={colors.textMuted} />
                <Text style={styles.locationChipText}>{data.location}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Section Tabs Bar (Stitch Interactive Segment Bar) */}
        <View style={[styles.tabsBar, isDark && styles.tabsBarDark]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
            {DETAIL_TABS.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Tab 1: Overview & Technical Description */}
        {(activeTab === "Overview" || activeTab === "Specifications") && (
          <View style={[styles.sectionContainer, isDark && styles.sectionContainerDark]}>
            <View style={styles.sectionHeader}>
              <FileText size={18} color={colors.primaryContainer} />
              <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
                Technical Description & Summary
              </Text>
            </View>
            <Text style={[styles.descriptionText, isDark && styles.descriptionTextDark]}>
              {data.description}
            </Text>
          </View>
        )}

        {/* Tab 2: Technical Specifications Table */}
        {(activeTab === "Overview" || activeTab === "Specifications") && (
          <View style={[styles.sectionContainer, isDark && styles.sectionContainerDark]}>
            <View style={styles.sectionHeader}>
              <Layers size={18} color={colors.primaryContainer} />
              <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
                Technical Specifications
              </Text>
            </View>

            <View style={styles.specTable}>
              <View style={styles.specTableRow}>
                <Text style={styles.specKey}>Category</Text>
                <Text style={[styles.specVal, isDark && styles.specValDark]}>{data.category}</Text>
              </View>

              <View style={styles.specTableRow}>
                <Text style={styles.specKey}>Catalog Classification</Text>
                <Text style={[styles.specVal, isDark && styles.specValDark]}>
                  {data.itemType === "MACHINE"
                    ? "Pre-Owned Machine"
                    : data.itemType === "NEW_INSTRUMENT"
                    ? "Brand New Instrument"
                    : "Spare Part / Board"}
                </Text>
              </View>

              <View style={styles.specTableRow}>
                <Text style={styles.specKey}>Condition</Text>
                <Text style={[styles.specVal, isDark && styles.specValDark]}>{data.condition}</Text>
              </View>

              {data.partNumber ? (
                <View style={styles.specTableRow}>
                  <Text style={styles.specKey}>Part / Catalog Number</Text>
                  <Text style={[styles.specValMono, isDark && styles.specValDark]}>
                    {data.partNumber}
                  </Text>
                </View>
              ) : null}

              {data.compatibleWith ? (
                <View style={styles.specTableRow}>
                  <Text style={styles.specKey}>Compatible Instruments</Text>
                  <Text style={[styles.specVal, isDark && styles.specValDark]}>
                    {data.compatibleWith}
                  </Text>
                </View>
              ) : null}

              <View style={styles.specTableRow}>
                <Text style={styles.specKey}>Stock Quantity</Text>
                <Text style={[styles.specVal, isDark && styles.specValDark]}>{data.quantity || 1}</Text>
              </View>

              <View style={styles.specTableRow}>
                <Text style={styles.specKey}>Inspection Location</Text>
                <Text style={[styles.specVal, isDark && styles.specValDark]}>
                  {data.location || "India"}
                </Text>
              </View>

              <View style={[styles.specTableRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.specKey}>Cataloged Date</Text>
                <Text style={[styles.specVal, isDark && styles.specValDark]}>
                  {new Date(data.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Tab 3: Inspection & Verification Protocol */}
        {(activeTab === "Overview" || activeTab === "Verification") && (
          <View style={[styles.sectionContainer, isDark && styles.sectionContainerDark]}>
            <View style={styles.sectionHeader}>
              <ShieldCheck size={18} color={colors.primaryContainer} />
              <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
                Inspection & Verification Protocol
              </Text>
            </View>

            {/* Protocol Item 1 */}
            <View style={styles.protocolCard}>
              <View style={[styles.protocolIconCircle, { backgroundColor: "#dcfce7" }]}>
                <CheckCircle2 size={18} color="#15803d" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.protocolTitle}>Operational Diagnostics Video</Text>
                <Text style={styles.protocolDesc}>
                  Verified pump pressure, baseline detector signals, and power-on self-test logs
                  recorded for technical due diligence.
                </Text>
              </View>
            </View>

            {/* Protocol Item 2 */}
            <View style={styles.protocolCard}>
              <View style={[styles.protocolIconCircle, { backgroundColor: "#eff5fb" }]}>
                <Video size={18} color={colors.primaryContainer} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.protocolTitle}>On-Site Physical Inspection</Text>
                <Text style={styles.protocolDesc}>
                  In-person facility inspection or scheduled video call inspection coordinated prior
                  to commercial settlement.
                </Text>
              </View>
            </View>

            {/* Protocol Item 3 */}
            <View style={styles.protocolCard}>
              <View style={[styles.protocolIconCircle, { backgroundColor: "#fef3c7" }]}>
                <Truck size={18} color="#b45309" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.protocolTitle}>Pan-India White-Glove Transport</Text>
                <Text style={styles.protocolDesc}>
                  Custom crating and fully insured transit coordinated with specialized logistics
                  carriers across India.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Tab 4: LabMatrix Assurance Guarantee */}
        {(activeTab === "Overview" || activeTab === "Assurance") && (
          <View style={styles.assuranceBanner}>
            <View style={styles.assuranceHeader}>
              <ShieldCheck size={24} color={colors.goldAccent} />
              <Text style={styles.assuranceTitle}>LabMatrix Assurance Guarantee</Text>
            </View>
            <Text style={styles.assuranceText}>
              Every refurbished and pre-owned instrument cataloged on LabMatrix undergoes rigorous
              verification of specifications, operational history, and seller legitimacy. Direct
              quotation requests are routed through verified operations with secure logistics
              handling.
            </Text>
          </View>
        )}

        {/* Contact Desk Information Card */}
        <View style={[styles.contactCard, isDark && styles.contactCardDark]}>
          <Text style={styles.contactDeskTitle}>LABMATRIX INSTRUMENT INDIA PVT. LTD.</Text>
          <View style={styles.contactRow}>
            <Building2 size={14} color={colors.textMuted} />
            <Text style={styles.contactText}>514/5, Mehrauli, New Delhi – 110030, India</Text>
          </View>
          <View style={styles.contactRow}>
            <Mail size={14} color={colors.textMuted} />
            <Text style={styles.contactText}>sales@labmatrixindia.com</Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      <View
        style={[
          styles.bottomBar,
          isDark && styles.bottomBarDark,
          { paddingBottom: Math.max(insets.bottom, 12) },
        ]}
      >
        <TouchableOpacity
          style={styles.callDeskBtn}
          activeOpacity={0.8}
          onPress={handleCall}
        >
          <Phone size={20} color={colors.primaryContainer} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryInquireBtn, isSold && styles.primaryInquireBtnSold]}
          activeOpacity={0.85}
          onPress={() => {
            if (!isAuthenticated) {
              Alert.alert("Sign In Required", "Please sign in to submit a direct inquiry.", [
                { text: "Cancel", style: "cancel" },
                { text: "Sign In", onPress: () => router.push("/(auth)/login" as any) },
              ]);
              return;
            }
            if (isSold && !inquiryMessage) {
              setInquiryMessage(
                `Hello, I saw that this ${data.title} was recently sold. I am looking for a similar or equivalent unit. Please let me know what options or incoming inventory are available.`
              );
            }
            setInquiryModalVisible(true);
          }}
        >
          <Send size={18} color="#ffffff" />
          <Text style={styles.primaryInquireBtnText}>
            {isSold ? "Request Similar Equipment" : "Send Inquiry / Request Quote"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Inquiry Bottom Sheet Modal */}
      <Modal
        visible={inquiryModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setInquiryModalVisible(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={[styles.modalSheet, isDark && styles.modalSheetDark]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalSub}>
                  {isSold ? "Request Equivalent Machine" : "Quotation Request"}
                </Text>
                <Text style={[styles.modalTitle, isDark && styles.modalTitleDark]} numberOfLines={1}>
                  {data.title}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setInquiryModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Your Name *</Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                value={inquiryName}
                onChangeText={setInquiryName}
                placeholder="Full Name"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputLabel}>Phone / WhatsApp *</Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                value={inquiryPhone}
                onChangeText={setInquiryPhone}
                keyboardType="phone-pad"
                placeholder="+91-XXXXXXXXXX"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputLabel}>Email Address *</Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                value={inquiryEmail}
                onChangeText={setInquiryEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="name@company.com"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputLabel}>Company / Laboratory Name</Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                value={inquiryCompany}
                onChangeText={setInquiryCompany}
                placeholder="Organization or Research Institution"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputLabel}>Inquiry / Quotation Message *</Text>
              <TextInput
                style={[styles.textArea, isDark && styles.textAreaDark]}
                value={inquiryMessage}
                onChangeText={setInquiryMessage}
                placeholder="Ask about warranty, operational logs, physical inspection, or offer your target price..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
              />

              <TouchableOpacity
                style={[
                  styles.submitInquiryBtn,
                  isSendingInquiry && styles.submitInquiryBtnDisabled,
                ]}
                activeOpacity={0.85}
                onPress={handleSendInquiry}
                disabled={isSendingInquiry}
              >
                {isSendingInquiry ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Send size={16} color="#ffffff" />
                    <Text style={styles.submitInquiryBtnText}>Submit Quotation Request</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LabMatrixTokens.colors.canvas,
  },
  containerDark: {
    backgroundColor: LabMatrixTokens.colors.brandBlue950,
  },
  headerBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 12 : 0,
  },
  headerCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  headerRightActions: {
    flexDirection: "row",
    gap: 8,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: LabMatrixTokens.colors.surface,
  },
  loadingContainerDark: {
    backgroundColor: LabMatrixTokens.colors.brandBlue950,
  },
  loadingText: {
    fontSize: 14,
    color: LabMatrixTokens.colors.textMuted,
  },
  carouselContainer: {
    width: width,
    height: CAROUSEL_HEIGHT,
    backgroundColor: "#e2e8f0",
    position: "relative",
  },
  carouselImage: {
    width: width,
    height: CAROUSEL_HEIGHT,
  },
  paginationDots: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  activeDot: {
    width: 18,
    backgroundColor: "#ffffff",
  },
  photoCountPill: {
    position: "absolute",
    bottom: 12,
    right: 14,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  photoCountText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  noImageContainer: {
    width: width,
    height: CAROUSEL_HEIGHT,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  noImageContainerDark: {
    backgroundColor: "#16203a",
  },
  noImageText: {
    fontSize: 13,
    color: LabMatrixTokens.colors.textMuted,
    fontWeight: "600",
  },
  soldBannerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  soldBannerOverlayText: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 2,
    borderWidth: 2,
    borderColor: "#ffffff",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  mainBlock: {
    backgroundColor: LabMatrixTokens.colors.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: LabMatrixTokens.colors.border,
  },
  mainBlockDark: {
    backgroundColor: "#0b1329",
    borderBottomColor: "#1e293b",
  },
  categoryBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  categorySubtitle: {
    fontSize: 11,
    fontWeight: "800",
    color: LabMatrixTokens.colors.primaryContainer,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  spareBadge: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  spareBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#92400e",
  },
  newBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#15803d",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: LabMatrixTokens.colors.textPrimary,
    lineHeight: 26,
    marginBottom: 10,
  },
  titleDark: {
    color: "#f8fafc",
  },
  priceContainer: {
    backgroundColor: LabMatrixTokens.colors.brandBlue50,
    padding: 12,
    borderRadius: LabMatrixTokens.radius.button,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: LabMatrixTokens.colors.brandBlue100,
  },
  priceSubtext: {
    fontSize: 10,
    fontWeight: "700",
    color: LabMatrixTokens.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  priceText: {
    fontSize: 22,
    fontWeight: "900",
    color: LabMatrixTokens.colors.primaryContainer,
  },
  priceTextSold: {
    color: LabMatrixTokens.colors.textSecondary,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  conditionChip: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: LabMatrixTokens.radius.badge,
  },
  conditionChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: LabMatrixTokens.colors.textSecondary,
  },
  qtyChip: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: LabMatrixTokens.radius.badge,
  },
  qtyChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400e",
  },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: LabMatrixTokens.radius.badge,
  },
  locationChipText: {
    fontSize: 12,
    color: LabMatrixTokens.colors.textMuted,
  },
  tabsBar: {
    backgroundColor: LabMatrixTokens.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: LabMatrixTokens.colors.border,
    marginTop: 10,
  },
  tabsBarDark: {
    backgroundColor: "#0b1329",
    borderBottomColor: "#1e293b",
  },
  tabsScroll: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 18,
  },
  tabBtn: {
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabBtnActive: {
    borderBottomColor: LabMatrixTokens.colors.primaryContainer,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: LabMatrixTokens.colors.textMuted,
  },
  tabBtnTextActive: {
    color: LabMatrixTokens.colors.primaryContainer,
    fontWeight: "800",
  },
  sectionContainer: {
    backgroundColor: LabMatrixTokens.colors.surface,
    padding: 16,
    marginTop: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: LabMatrixTokens.colors.border,
  },
  sectionContainerDark: {
    backgroundColor: "#0b1329",
    borderColor: "#1e293b",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: LabMatrixTokens.colors.textPrimary,
  },
  sectionTitleDark: {
    color: "#f8fafc",
  },
  descriptionText: {
    fontSize: 14,
    color: LabMatrixTokens.colors.textSecondary,
    lineHeight: 22,
  },
  descriptionTextDark: {
    color: "#cbd5e1",
  },
  specTable: {
    borderRadius: LabMatrixTokens.radius.button,
    borderWidth: 1,
    borderColor: LabMatrixTokens.colors.border,
    overflow: "hidden",
  },
  specTableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: LabMatrixTokens.colors.border,
    backgroundColor: "#ffffff",
  },
  specKey: {
    fontSize: 12,
    color: LabMatrixTokens.colors.textMuted,
    fontWeight: "500",
  },
  specVal: {
    fontSize: 12,
    fontWeight: "700",
    color: LabMatrixTokens.colors.textPrimary,
    maxWidth: "55%",
    textAlign: "right",
  },
  specValMono: {
    fontSize: 12,
    fontWeight: "700",
    color: LabMatrixTokens.colors.primaryContainer,
    fontFamily: Platform.select({ ios: "Courier", android: "monospace" }),
  },
  specValDark: {
    color: "#f8fafc",
  },
  protocolCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: LabMatrixTokens.radius.button,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: LabMatrixTokens.colors.border,
  },
  protocolIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  protocolTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: LabMatrixTokens.colors.textPrimary,
    marginBottom: 3,
  },
  protocolDesc: {
    fontSize: 12,
    color: LabMatrixTokens.colors.textMuted,
    lineHeight: 17,
  },
  assuranceBanner: {
    backgroundColor: LabMatrixTokens.colors.brandBlue950,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16,
    borderRadius: LabMatrixTokens.radius.card,
    borderWidth: 1,
    borderColor: LabMatrixTokens.colors.primaryContainer,
  },
  assuranceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  assuranceTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: LabMatrixTokens.colors.goldAccent,
    letterSpacing: 0.3,
  },
  assuranceText: {
    fontSize: 12,
    color: "#cbd5e1",
    lineHeight: 18,
  },
  contactCard: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 14,
    borderRadius: LabMatrixTokens.radius.button,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: LabMatrixTokens.colors.border,
    gap: 6,
  },
  contactCardDark: {
    backgroundColor: "#0b1329",
    borderColor: "#1e293b",
  },
  contactDeskTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: LabMatrixTokens.colors.textMuted,
    letterSpacing: 0.5,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  contactText: {
    fontSize: 12,
    color: LabMatrixTokens.colors.textSecondary,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: LabMatrixTokens.colors.border,
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
    borderRadius: LabMatrixTokens.radius.button,
    backgroundColor: LabMatrixTokens.colors.brandBlue50,
    borderWidth: 1,
    borderColor: LabMatrixTokens.colors.brandBlue100,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryInquireBtn: {
    flex: 1,
    height: 48,
    borderRadius: LabMatrixTokens.radius.button,
    backgroundColor: LabMatrixTokens.colors.primaryContainer,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryInquireBtnSold: {
    backgroundColor: "#d97706",
  },
  primaryInquireBtnText: {
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
    borderBottomColor: LabMatrixTokens.colors.border,
  },
  modalSub: {
    fontSize: 11,
    fontWeight: "700",
    color: LabMatrixTokens.colors.primaryContainer,
    textTransform: "uppercase",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: LabMatrixTokens.colors.textPrimary,
  },
  modalTitleDark: {
    color: "#f8fafc",
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalForm: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: LabMatrixTokens.colors.textSecondary,
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    height: 42,
    borderRadius: LabMatrixTokens.radius.button,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: LabMatrixTokens.colors.border,
    paddingHorizontal: 12,
    fontSize: 14,
    color: LabMatrixTokens.colors.textPrimary,
  },
  inputDark: {
    backgroundColor: "#16203a",
    borderColor: "#1e293b",
    color: "#f8fafc",
  },
  textArea: {
    height: 90,
    borderRadius: LabMatrixTokens.radius.button,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: LabMatrixTokens.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: LabMatrixTokens.colors.textPrimary,
    textAlignVertical: "top",
  },
  textAreaDark: {
    backgroundColor: "#16203a",
    borderColor: "#1e293b",
    color: "#f8fafc",
  },
  submitInquiryBtn: {
    backgroundColor: LabMatrixTokens.colors.primaryContainer,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: LabMatrixTokens.radius.button,
    gap: 8,
    marginTop: 18,
    marginBottom: 20,
  },
  submitInquiryBtnDisabled: {
    opacity: 0.6,
  },
  submitInquiryBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
});
