import { useColorScheme } from "@/hooks/use-color-scheme";
import React, { useState, useRef, useEffect } from "react";
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
  Dimensions,
  Linking,
  Share,
  Platform,
  StatusBar,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { Image as ExpoImage } from "expo-image";
import MapPin from "lucide-react-native/icons/map-pin";
import Tag from "lucide-react-native/icons/tag";
import ShieldCheck from "lucide-react-native/icons/shield-check";
import Send from "lucide-react-native/icons/send";
import X from "lucide-react-native/icons/x";
import Phone from "lucide-react-native/icons/phone";
import Share2 from "lucide-react-native/icons/share-2";
import Heart from "lucide-react-native/icons/heart";
import Pencil from "lucide-react-native/icons/pencil";
import Copy from "lucide-react-native/icons/copy";
import Video from "lucide-react-native/icons/video";
import CheckCircle2 from "lucide-react-native/icons/circle-check";
import Truck from "lucide-react-native/icons/truck";
import FileText from "lucide-react-native/icons/file-text";
import ExternalLink from "lucide-react-native/icons/external-link";
import ChevronLeft from "lucide-react-native/icons/chevron-left";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import Building2 from "lucide-react-native/icons/building-complex";
import Mail from "lucide-react-native/icons/mail";
import Layers from "lucide-react-native/icons/layers";
import ZoomIn from "lucide-react-native/icons/zoom-in";
import ZoomOut from "lucide-react-native/icons/zoom-out";
import RotateCcw from "lucide-react-native/icons/rotate-ccw";
import { api } from "@/lib/api";
import { Listing } from "@/types/api";
import { useAuth } from "@/context/auth-context";
import { LabMatrixTokens } from "@/constants/theme";
import { isListingSaved, toggleSavedListingId } from "@/lib/storage";
import { getOptimizedImageUrl, IMAGE_PRESETS } from "@/lib/images";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ZoomableImage } from "@/components/ZoomableImage";

const { width } = Dimensions.get("window");
const CAROUSEL_HEIGHT = 280;
const LABMATRIX_PHONE = "+917303040804";

const QUICK_TOPICS = [
  { id: "price", label: "Best price", text: "Please share your best commercial price for this unit." },
  { id: "calibration", label: "Calibration records", text: "Please share recent calibration certificates and operational service logs." },
  { id: "video", label: "Video inspection", text: "I would like to request an operational video inspection of the instrument." },
  { id: "delivery", label: "Delivery to my city", text: "Please provide estimated delivery time and crating logistics to my location." },
  { id: "warranty", label: "Warranty terms", text: "What warranty period, parts coverage, or inspection return window is included?" },
];

export default function ListingDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id, openInquiry } = useLocalSearchParams<{ id: string; openInquiry?: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { colors } = LabMatrixTokens;
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);

  // Photo Magnifier & Lightbox State
  const [magnifyModalVisible, setMagnifyModalVisible] = useState(false);
  const [magnifyIndex, setMagnifyIndex] = useState(0);
  const [zoomScale, setZoomScale] = useState(1);
  const carouselScrollRef = useRef<any>(null);

  const openMagnifier = (index: number) => {
    setMagnifyIndex(index);
    setZoomScale(1);
    setMagnifyModalVisible(true);
  };

  const handleSelectPhoto = (idx: number) => {
    setActiveImageIndex(idx);
    carouselScrollRef.current?.scrollTo({ x: idx * width, animated: true });
  };

  // Inquiry form states
  const [inquiryModalVisible, setInquiryModalVisible] = useState(false);
  const [inquiryPhone, setInquiryPhone] = useState(user?.phoneNumber || "");
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [isSendingInquiry, setIsSendingInquiry] = useState(false);
  const [inquirySuccess, setInquirySuccess] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  useEffect(() => {
    if (id) {
      isListingSaved(id).then(setIsSaved);
    }
  }, [id]);

  useEffect(() => {
    if (openInquiry === "true" && isAuthenticated) {
      setInquiryModalVisible(true);
    }
  }, [openInquiry, isAuthenticated]);

  const handleToggleSave = async () => {
    if (!id) return;
    const nowSaved = await toggleSavedListingId(id);
    setIsSaved(nowSaved);
  };

  const handleToggleTopic = (topic: (typeof QUICK_TOPICS)[number]) => {
    let nextTopics: string[];
    let nextMessage = inquiryMessage;
    if (selectedTopics.includes(topic.id)) {
      nextTopics = selectedTopics.filter((t) => t !== topic.id);
      nextMessage = nextMessage.replace(topic.text, "").replace(/\n\n+/g, "\n").trim();
    } else {
      nextTopics = [...selectedTopics, topic.id];
      nextMessage = nextMessage ? `${nextMessage}\n${topic.text}` : topic.text;
    }
    setSelectedTopics(nextTopics);
    setInquiryMessage(nextMessage);
  };

  // Query single listing
  const { data: detail, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      const res = await api.get(`/api/listings/${id}`);
      return {
        listing: res.data?.listing as Listing,
        isOwner: Boolean(res.data?.isOwner),
        isAdmin: Boolean(res.data?.isAdmin),
      };
    },
    // Opened from the marketplace feed: show the card's data right away while the full
    // record (and owner/admin flags) loads, instead of a blank loading screen.
    placeholderData: () => {
      const feeds = queryClient.getQueriesData<InfiniteData<{ listings: Listing[] }>>({ queryKey: ["listings"] });
      for (const [, feed] of feeds) {
        for (const page of feed?.pages ?? []) {
          const match = page.listings?.find((l) => l.id === id);
          // The public feed only contains approved listings
          if (match) return { listing: { ...match, isApproved: true }, isOwner: false, isAdmin: false };
        }
      }
      return undefined;
    },
  });

  const data = detail?.listing;
  const isOwner = detail?.isOwner ?? false;
  const isAdmin = detail?.isAdmin ?? false;

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
    if (!inquiryPhone.trim()) {
      Alert.alert("Phone Number Required", "Please enter a phone number so our deal desk can reach you.");
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
        phoneNumber: inquiryPhone.trim(),
        message: inquiryMessage.trim(),
      });
      // Show it in the Inquiries tab's "Sent" list right away
      queryClient.invalidateQueries({ queryKey: ["inquiries"] });

      setInquirySuccess(true);
      setInquiryMessage("");
      setSelectedTopics([]);
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.error || "Could not submit inquiry.");
    } finally {
      setIsSendingInquiry(false);
    }
  };

  if (isLoading || !data) {
    const loadError =
      (isError || !isLoading) && !isFetching
        ? (error as any)?.response?.data?.error || "We couldn't load this listing. Please check your connection and try again."
        : null;
    return (
      <SafeAreaView
        edges={["top", "bottom"]}
        style={[styles.loadingContainer, isDark && styles.loadingContainerDark, { paddingHorizontal: 24 }]}
      >
        {loadError ? (
          <>
            <Text style={[styles.loadingText, { textAlign: "center" }]}>{loadError}</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity style={styles.stateSecondaryBtn} onPress={() => router.back()}>
                <Text style={styles.stateSecondaryBtnText}>Go Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statePrimaryBtn} onPress={() => refetch()}>
                <Text style={styles.statePrimaryBtnText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={colors.primaryContainer} />
            <Text style={styles.loadingText}>Loading instrument details & verified specs...</Text>
          </>
        )}
      </SafeAreaView>
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
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={22} color="#0f172a" />
        </TouchableOpacity>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.headerCircleBtn}
            activeOpacity={0.8}
            onPress={handleShare}
            accessibilityLabel="Share listing"
          >
            <Share2 size={18} color="#0f172a" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerCircleBtn}
            activeOpacity={0.8}
            onPress={handleToggleSave}
            accessibilityLabel={isSaved ? "Remove from saved" : "Save listing"}
          >
            <Heart
              size={18}
              color={isSaved ? "#dc2626" : "#0f172a"}
              fill={isSaved ? "#dc2626" : "none"}
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Photo Gallery Carousel */}
        <View style={styles.carouselContainer}>
          {photos.length > 0 ? (
            <>
              <ScrollView
                ref={carouselScrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
                  setActiveImageIndex(newIndex);
                }}
              >
                {photos.map((photo, idx) => (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.92}
                    onPress={() => openMagnifier(idx)}
                    style={{ width, height: CAROUSEL_HEIGHT }}
                  >
                    <ExpoImage
                      source={{ uri: getOptimizedImageUrl(photo, IMAGE_PRESETS.HERO) }}
                      placeholder={{ uri: getOptimizedImageUrl(photo, IMAGE_PRESETS.CARD) }}
                      placeholderContentFit="cover"
                      style={styles.carouselImage}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>

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
              <Text style={styles.noImageText}>No photos yet</Text>
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
            <Text style={{ color: "#94a3b8", fontSize: 13, marginHorizontal: 6 }}>·</Text>
            <Text style={styles.classificationText}>
              {data.itemType === "MACHINE"
                ? "Pre-Owned Machine"
                : data.itemType === "NEW_INSTRUMENT"
                ? "Brand New"
                : "Spare Part"}
            </Text>
          </View>

          <Text style={[styles.title, isDark && styles.titleDark]}>{data.title}</Text>

          {(isOwner || isAdmin) && (
            <View style={[styles.manageCard, isDark && styles.manageCardDark]}>
              <View style={styles.manageHeader}>
                <Text style={[styles.manageTitle, isDark && styles.titleDark]}>
                  {isAdmin ? "Administrator Controls Active" : "You are the owner of this listing"}
                </Text>
                <View style={[styles.manageBadge, data.isApproved ? styles.manageBadgeLive : styles.manageBadgePending]}>
                  <Text style={[styles.manageBadgeText, data.isApproved ? styles.manageBadgeTextLive : styles.manageBadgeTextPending]}>
                    {data.isApproved ? "Approved & Live" : "Pending Admin Approval"}
                  </Text>
                </View>
              </View>
              <View style={styles.manageActions}>
                <TouchableOpacity
                  style={styles.manageSecondaryBtn}
                  activeOpacity={0.8}
                  onPress={() =>
                    router.push({ pathname: "/(tabs)/sell", params: { duplicate: data.id } } as any)
                  }
                >
                  <Copy size={14} color="#475569" />
                  <Text style={styles.manageSecondaryText}>Duplicate</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.managePrimaryBtn}
                  activeOpacity={0.8}
                  onPress={() =>
                    router.push({ pathname: "/(tabs)/sell", params: { edit: data.id } } as any)
                  }
                >
                  <Pencil size={14} color="#0f172a" />
                  <Text style={styles.managePrimaryText}>Edit Listing</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Price Box */}
          <View style={styles.priceContainer}>
            <Text style={[styles.priceText, isSold && styles.priceTextSold]}>{priceText}</Text>
            <Text style={styles.priceSubtext}>
              {isSold ? "Price realized (sold)" : "Expected price · final after inspection"}
            </Text>
          </View>

          {/* Chips Row */}
          <View style={styles.chipsRow}>
            {data.condition ? (
              <View style={styles.conditionChip}>
                <Text style={styles.conditionChipText}>{data.condition}</Text>
              </View>
            ) : null}

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

        {/* Specifications Table */}
        <View style={[styles.sectionContainer, isDark && styles.sectionContainerDark]}>
          <View style={styles.sectionHeader}>
            <Layers size={18} color={colors.primaryContainer} />
            <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
              Equipment Specifications
            </Text>
          </View>

          <View style={styles.specTable}>
            {data.partNumber ? (
              <View style={styles.specTableRow}>
                <Text style={styles.specKey}>Model / Part No.</Text>
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
              <Text style={styles.specKey}>Category</Text>
              <Text style={[styles.specVal, isDark && styles.specValDark]}>{data.category}</Text>
            </View>

            <View style={styles.specTableRow}>
              <Text style={styles.specKey}>Condition</Text>
              <Text style={[styles.specVal, isDark && styles.specValDark]}>{data.condition}</Text>
            </View>

            <View style={styles.specTableRow}>
              <Text style={styles.specKey}>Stock Quantity</Text>
              <Text style={[styles.specVal, isDark && styles.specValDark]}>{data.quantity || 1} unit</Text>
            </View>

            {data.location ? (
              <View style={styles.specTableRow}>
                <Text style={styles.specKey}>Location</Text>
                <Text style={[styles.specVal, isDark && styles.specValDark]}>
                  {data.location}
                </Text>
              </View>
            ) : null}

            <View style={[styles.specTableRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.specKey}>Listed Date</Text>
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

        {/* Technical Description */}
        {data.description ? (
          <View style={[styles.sectionContainer, isDark && styles.sectionContainerDark]}>
            <View style={styles.sectionHeader}>
              <FileText size={18} color={colors.primaryContainer} />
              <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
                Technical Description
              </Text>
            </View>
            <Text style={[styles.descriptionText, isDark && styles.descriptionTextDark]}>
              {data.description}
            </Text>
          </View>
        ) : null}

        {/* Attached Technical Documents & Manuals */}
        {data.documents && data.documents.length > 0 ? (
          <View style={[styles.sectionContainer, isDark && styles.sectionContainerDark]}>
            <View style={styles.sectionHeader}>
              <FileText size={18} color="#dc2626" />
              <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
                Attached Documents ({data.documents.length})
              </Text>
            </View>
            <View style={{ gap: 8, marginTop: 4 }}>
              {data.documents.map((docUrl: string, idx: number) => {
                const rawName = docUrl.split("/").pop()?.split("?")[0] || `Document_${idx + 1}.pdf`;
                const displayName = decodeURIComponent(rawName);
                return (
                  <TouchableOpacity
                    key={idx}
                    style={styles.docItemCard}
                    activeOpacity={0.8}
                    onPress={async () => {
                      try {
                        await WebBrowser.openBrowserAsync(docUrl);
                      } catch {
                        Linking.openURL(docUrl);
                      }
                    }}
                  >
                    <View style={styles.docIconPill}>
                      <FileText size={18} color="#dc2626" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.docNameText} numberOfLines={1}>
                        {displayName}
                      </Text>
                      <Text style={styles.docHintText}>Tap to view or download PDF</Text>
                    </View>
                    <ExternalLink size={16} color="#033a7d" />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* How this deal works */}
        <View style={[styles.dealProcessContainer, isDark && styles.dealProcessContainerDark]}>
          <Text style={[styles.dealProcessHeader, isDark && styles.dealProcessHeaderDark]}>
            How this deal works
          </Text>
          <View style={styles.dealStepsRow}>
            <View style={[styles.dealStepCard, isDark && styles.dealStepCardDark]}>
              <Text style={styles.dealStepNum}>1</Text>
              <Text style={[styles.dealStepTitle, isDark && styles.dealStepTitleDark]}>
                Request quote
              </Text>
              <Text style={styles.dealStepDesc}>
                Connect directly with LabMatrix deal desk
              </Text>
            </View>

            <View style={[styles.dealStepCard, isDark && styles.dealStepCardDark]}>
              <Text style={styles.dealStepNum}>2</Text>
              <Text style={[styles.dealStepTitle, isDark && styles.dealStepTitleDark]}>
                Inspection
              </Text>
              <Text style={styles.dealStepDesc}>
                Physical visit or live video diagnostics
              </Text>
            </View>

            <View style={[styles.dealStepCard, isDark && styles.dealStepCardDark]}>
              <Text style={styles.dealStepNum}>3</Text>
              <Text style={[styles.dealStepTitle, isDark && styles.dealStepTitleDark]}>
                Handover
              </Text>
              <Text style={styles.dealStepDesc}>
                Insured transit & secure release
              </Text>
            </View>
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
          accessibilityLabel="Call LabMatrix Desk"
        >
          <Phone size={20} color={colors.primaryContainer} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryInquireBtn, isSold && styles.primaryInquireBtnSold]}
          activeOpacity={0.85}
          onPress={() => {
            if (!isAuthenticated) {
              Alert.alert("Sign In Required", "Please sign in to request a quote.", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Sign In",
                  onPress: () =>
                    router.push({
                      pathname: "/(auth)/login",
                      params: { returnTo: `/listing/${id}?openInquiry=true` },
                    } as any),
                },
              ]);
              return;
            }
            if (isSold && !inquiryMessage) {
              setInquiryMessage(
                `Hello, I saw that this ${data.title} was recently sold. I am looking for a similar or equivalent unit. Please let me know what options or incoming inventory are available.`
              );
            }
            setInquirySuccess(false);
            setInquiryModalVisible(true);
          }}
        >
          <Send size={18} color="#ffffff" />
          <Text style={styles.primaryInquireBtnText}>
            {isSold ? "Request similar" : "Request quote"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Inquiry Bottom Sheet Modal */}
      <Modal
        visible={inquiryModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setInquirySuccess(false);
          setInquiryModalVisible(false);
        }}
      >
        <View style={[styles.modalOverlay, { paddingTop: insets.top }]}>
          <View style={[styles.modalSheet, isDark && styles.modalSheetDark, { paddingBottom: Math.max(insets.bottom + 8, 20) }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalSub}>
                  {isSold ? "Request Equivalent Machine" : "Quotation Request"}
                </Text>
                <Text style={[styles.modalTitle, isDark && styles.modalTitleDark]} numberOfLines={1}>
                  {inquirySuccess ? "Confirmation" : data.title}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setInquirySuccess(false);
                  setInquiryModalVisible(false);
                }}
                style={styles.modalCloseBtn}
              >
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {inquirySuccess ? (
              <View style={styles.successContainer}>
                <View style={styles.successCircle}>
                  <CheckCircle2 size={36} color="#15803d" />
                </View>
                <Text style={[styles.successTitle, isDark && styles.successTitleDark]}>
                  Quote Request Sent!
                </Text>
                <Text style={[styles.successDesc, isDark && styles.successDescDark]}>
                  Your quotation request has been delivered to LabMatrix operations and the equipment seller. You will be contacted shortly on {inquiryPhone || "your phone"}.
                </Text>
                <TouchableOpacity
                  style={styles.successDoneBtn}
                  activeOpacity={0.85}
                  onPress={() => {
                    setInquirySuccess(false);
                    setInquiryModalVisible(false);
                  }}
                >
                  <Text style={styles.successDoneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView
                style={styles.modalForm}
                contentContainerStyle={styles.modalFormContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Compact Listing Snippet Card */}
                <View style={[styles.sheetListingCard, isDark && styles.sheetListingCardDark]}>
                  {photos.length > 0 ? (
                    <ExpoImage
                      source={{ uri: getOptimizedImageUrl(photos[0], IMAGE_PRESETS.THUMBNAIL) }}
                      style={styles.sheetListingThumb}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[styles.sheetListingThumb, { backgroundColor: "#e2e8f0", alignItems: "center", justifyContent: "center" }]}>
                      <Tag size={20} color="#64748b" />
                    </View>
                  )}
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text style={[styles.sheetListingTitle, isDark && styles.sheetListingTitleDark]} numberOfLines={1}>
                      {data.title}
                    </Text>
                    <Text style={styles.sheetListingPrice} numberOfLines={1}>
                      {priceText}
                    </Text>
                  </View>
                </View>

                {/* Quick Topic Chips */}
                <Text style={styles.topicHeaderTitle}>What would you like to know?</Text>
                <View style={styles.topicChipsContainer}>
                  {QUICK_TOPICS.map((topic) => {
                    const isSelected = selectedTopics.includes(topic.id);
                    return (
                      <TouchableOpacity
                        key={topic.id}
                        style={[styles.topicChip, isSelected && styles.topicChipActive]}
                        activeOpacity={0.75}
                        onPress={() => handleToggleTopic(topic)}
                      >
                        <Text style={[styles.topicChipText, isSelected && styles.topicChipTextActive]}>
                          {isSelected ? "✓ " : ""}{topic.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.inputLabel}>Inquiry Message *</Text>
                <TextInput
                  style={[styles.textArea, isDark && styles.textAreaDark]}
                  value={inquiryMessage}
                  onChangeText={setInquiryMessage}
                  placeholder="Select topics above or type your questions..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={4}
                />

                <Text style={styles.inputLabel}>Deal desk will call</Text>
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  value={inquiryPhone}
                  onChangeText={setInquiryPhone}
                  keyboardType="phone-pad"
                  placeholder="+91-XXXXXXXXXX"
                  placeholderTextColor="#94a3b8"
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
                      <Text style={styles.submitInquiryBtnText}>Send request</Text>
                    </>
                  )}
                </TouchableOpacity>

                <Text style={styles.privacyNoteText}>
                  The seller never sees your phone number or email.
                </Text>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Fullscreen Interactive Photo Magnifier & Zoom Modal */}
      <Modal
        visible={magnifyModalVisible}
        animationType="fade"
        transparent={false}
        statusBarTranslucent
        onRequestClose={() => {
          setMagnifyModalVisible(false);
          setZoomScale(1);
        }}
      >
        <GestureHandlerRootView
          style={[styles.magnifyModalContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
        >
          <StatusBar barStyle="light-content" />

          {/* Top Bar with Photo Counter & Zoom Controls */}
          <View style={styles.magnifyTopBar}>
            <View style={styles.magnifyCounterPill}>
              <Text style={styles.magnifyCounterText}>
                {magnifyIndex + 1} of {photos.length}
              </Text>
              {zoomScale > 1 && (
                <View style={styles.magnifyZoomBadge}>
                  <Text style={styles.magnifyZoomBadgeText}>{zoomScale.toFixed(1)}x</Text>
                </View>
              )}
            </View>

            <View style={styles.magnifyControlsRow}>
              {/* Zoom Out Button */}
              <TouchableOpacity
                style={[styles.magnifyControlBtn, zoomScale <= 1 && styles.magnifyControlBtnDisabled]}
                disabled={zoomScale <= 1}
                onPress={() => setZoomScale((s) => Math.max(1, Number((s - 0.5).toFixed(1))))}
                activeOpacity={0.7}
              >
                <ZoomOut size={18} color={zoomScale <= 1 ? "#64748b" : "#ffffff"} />
              </TouchableOpacity>

              {/* Zoom In Button */}
              <TouchableOpacity
                style={[styles.magnifyControlBtn, zoomScale >= 4 && styles.magnifyControlBtnDisabled]}
                disabled={zoomScale >= 4}
                onPress={() => setZoomScale((s) => Math.min(4, Number((s + 0.5).toFixed(1))))}
                activeOpacity={0.7}
              >
                <ZoomIn size={18} color={zoomScale >= 4 ? "#64748b" : "#ffffff"} />
              </TouchableOpacity>

              {/* Reset Zoom */}
              {zoomScale > 1 && (
                <TouchableOpacity
                  style={styles.magnifyControlBtn}
                  onPress={() => setZoomScale(1)}
                  activeOpacity={0.7}
                >
                  <RotateCcw size={17} color="#ffffff" />
                </TouchableOpacity>
              )}

              {/* Close Button */}
              <TouchableOpacity
                style={styles.magnifyCloseBtn}
                onPress={() => {
                  setMagnifyModalVisible(false);
                  setZoomScale(1);
                }}
                activeOpacity={0.7}
              >
                <X size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Center Viewport: Zoomable Image with Pan & Double-Tap */}
          <View style={styles.magnifyViewport}>
            <ZoomableImage
              uri={getOptimizedImageUrl(photos[magnifyIndex], {
                width: 1600,
                quality: "auto:best",
                format: "webp",
              })}
              width={width}
              height={width * 0.95}
              zoom={zoomScale}
              onZoomChange={setZoomScale}
            />

            {/* Navigation Arrows for Multiple Photos when not zoomed */}
            {photos.length > 1 && zoomScale === 1 && (
              <>
                {magnifyIndex > 0 && (
                  <TouchableOpacity
                    style={styles.magnifyPrevArrow}
                    activeOpacity={0.8}
                    onPress={() => {
                      setMagnifyIndex((i) => i - 1);
                      setZoomScale(1);
                      handleSelectPhoto(magnifyIndex - 1);
                    }}
                  >
                    <ChevronLeft size={24} color="#ffffff" />
                  </TouchableOpacity>
                )}

                {magnifyIndex < photos.length - 1 && (
                  <TouchableOpacity
                    style={styles.magnifyNextArrow}
                    activeOpacity={0.8}
                    onPress={() => {
                      setMagnifyIndex((i) => i + 1);
                      setZoomScale(1);
                      handleSelectPhoto(magnifyIndex + 1);
                    }}
                  >
                    <ChevronRight size={24} color="#ffffff" />
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* Floating Magnify Hint */}
            <View style={styles.magnifyHintOverlay}>
              <Text style={styles.magnifyHintText}>
                {zoomScale > 1
                  ? "Drag to pan • Pinch or double-tap to zoom out"
                  : "Pinch, double-tap or tap + to zoom • Swipe thumbnails below"}
              </Text>
            </View>
          </View>

          {/* Bottom Thumbnails Strip */}
          {photos.length > 1 && (
            <View style={styles.magnifyBottomBar}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.magnifyThumbnailsScroll}
              >
                {photos.map((photo, idx) => (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.8}
                    onPress={() => {
                      setMagnifyIndex(idx);
                      setZoomScale(1);
                      handleSelectPhoto(idx);
                    }}
                    style={[
                      styles.magnifyThumbItem,
                      magnifyIndex === idx && styles.magnifyThumbItemActive,
                    ]}
                  >
                    <Image
                      source={{ uri: getOptimizedImageUrl(photo, IMAGE_PRESETS.THUMBNAIL) }}
                      style={styles.magnifyThumbImg}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </GestureHandlerRootView>
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
  statePrimaryBtn: {
    backgroundColor: "#033a7d",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  statePrimaryBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  stateSecondaryBtn: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  stateSecondaryBtnText: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "600",
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
  manageCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    backgroundColor: "#ffffff",
    gap: 10,
  },
  manageCardDark: {
    backgroundColor: "#0b1320",
    borderColor: "#1e3a5f",
  },
  manageHeader: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  manageTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1e293b",
  },
  manageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  manageBadgeLive: { backgroundColor: "#ecfdf5", borderColor: "#a7f3d0" },
  manageBadgePending: { backgroundColor: "#fffbeb", borderColor: "#fde68a" },
  manageBadgeText: { fontSize: 11, fontWeight: "700" },
  manageBadgeTextLive: { color: "#047857" },
  manageBadgeTextPending: { color: "#92400e" },
  manageActions: {
    flexDirection: "row",
    gap: 8,
  },
  manageSecondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
  },
  manageSecondaryText: { fontSize: 12, fontWeight: "700", color: "#1e293b" },
  managePrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#fbc634",
  },
  managePrimaryText: { fontSize: 12, fontWeight: "700", color: "#0f172a" },
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
    flexShrink: 1,
  },
  modalFormContent: {
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
  classificationText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
  },
  dealProcessContainer: {
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
  },
  dealProcessContainerDark: {
    backgroundColor: "#0b1329",
    borderColor: "#1e293b",
  },
  dealProcessHeader: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 10,
  },
  dealProcessHeaderDark: {
    color: "#f8fafc",
  },
  dealStepsRow: {
    flexDirection: "row",
    gap: 8,
  },
  dealStepCard: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 8,
    gap: 3,
  },
  dealStepCardDark: {
    backgroundColor: "#16203a",
    borderColor: "#1e293b",
  },
  dealStepNum: {
    fontSize: 11,
    fontWeight: "900",
    color: "#033a7d",
  },
  dealStepTitle: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#0f172a",
  },
  dealStepTitleDark: {
    color: "#f8fafc",
  },
  dealStepDesc: {
    fontSize: 10,
    color: "#64748b",
    lineHeight: 13,
  },
  sheetListingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 8,
    marginBottom: 10,
  },
  sheetListingCardDark: {
    backgroundColor: "#16203a",
    borderColor: "#1e293b",
  },
  sheetListingThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  sheetListingTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
    lineHeight: 16,
  },
  sheetListingTitleDark: {
    color: "#f8fafc",
  },
  sheetListingPrice: {
    fontSize: 12,
    fontWeight: "800",
    color: "#033a7d",
  },
  topicHeaderTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#334155",
    marginTop: 6,
    marginBottom: 4,
  },
  topicChipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  topicChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
  },
  topicChipActive: {
    backgroundColor: "#033a7d",
    borderColor: "#033a7d",
  },
  topicChipText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#475569",
  },
  topicChipTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  privacyNoteText: {
    fontSize: 11.5,
    color: "#64748b",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 12,
  },
  successContainer: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 20,
    gap: 12,
  },
  successCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  successTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
  },
  successTitleDark: {
    color: "#f8fafc",
  },
  successDesc: {
    fontSize: 13.5,
    color: "#475569",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  successDescDark: {
    color: "#94a3b8",
  },
  successDoneBtn: {
    backgroundColor: "#033a7d",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginTop: 10,
  },
  successDoneBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  magnifyPill: {
    position: "absolute",
    bottom: 12,
    left: 14,
    backgroundColor: "rgba(15, 23, 42, 0.78)",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
  },
  magnifyPillText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  thumbnailStrip: {
    backgroundColor: "#ffffff",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  thumbnailStripDark: {
    backgroundColor: "#0b1329",
    borderBottomColor: "#1e293b",
  },
  thumbnailScroll: {
    paddingHorizontal: 16,
    gap: 10,
    alignItems: "center",
  },
  thumbnailItem: {
    width: 62,
    height: 62,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    position: "relative",
  },
  thumbnailItemActive: {
    borderColor: "#033a7d",
  },
  thumbnailImg: {
    width: "100%",
    height: "100%",
  },
  thumbnailActiveOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(3, 58, 125, 0.12)",
  },
  magnifyModalContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  magnifyTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 20,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
  },
  magnifyCounterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  magnifyCounterText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  magnifyZoomBadge: {
    backgroundColor: "#f59e0b",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  magnifyZoomBadgeText: {
    color: "#0f172a",
    fontSize: 11,
    fontWeight: "800",
  },
  magnifyControlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  magnifyControlBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  magnifyControlBtnDisabled: {
    opacity: 0.35,
  },
  magnifyCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  magnifyViewport: {
    flex: 1,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  magnifyPrevArrow: {
    position: "absolute",
    left: 14,
    top: "50%",
    transform: [{ translateY: -22 }],
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 15,
  },
  magnifyNextArrow: {
    position: "absolute",
    right: 14,
    top: "50%",
    transform: [{ translateY: -22 }],
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 15,
  },
  magnifyHintOverlay: {
    position: "absolute",
    bottom: 14,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 15,
  },
  magnifyHintText: {
    color: "#cbd5e1",
    fontSize: 11,
    fontWeight: "600",
  },
  magnifyBottomBar: {
    paddingVertical: 12,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
  },
  magnifyThumbnailsScroll: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center",
  },
  magnifyThumbItem: {
    width: 52,
    height: 52,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  magnifyThumbItemActive: {
    borderColor: "#38bdf8",
  },
  magnifyThumbImg: {
    width: "100%",
    height: "100%",
  },
  docItemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  docIconPill: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
  },
  docNameText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0f172a",
  },
  docHintText: {
    fontSize: 11.5,
    color: "#64748b",
    marginTop: 2,
  },
});
