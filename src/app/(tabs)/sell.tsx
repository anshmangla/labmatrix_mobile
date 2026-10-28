import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
  useColorScheme,
  Platform,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  Upload,
  X,
  Lock,
  Phone,
  Building2,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Bell,
  User,
  Search,
  Sparkles,
  Wrench,
  Microscope,
} from "lucide-react-native";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { LabMatrixTokens } from "@/constants/theme";

const CATEGORIES = [
  "HPLC & UHPLC",
  "GC & GC-MS",
  "UV-Vis & FTIR",
  "AAS",
  "ICP-OES & ICP-MS",
  "DSC-TGA & DMA",
  "Dissolution Testers",
  "Stability Chambers",
  "Particle Analyzers",
  "Centrifuges & Shakers",
  "Karl Fischer & Titrators",
  "Spare Parts & Consumables",
  "Other Lab Equipment",
];

const MACHINE_CONDITIONS = [
  "Used - Excellent (Calibrated)",
  "Used - Good Working Condition",
  "Used - Normal Wear",
  "Refurbished by OEM/Third-Party",
  "For Parts / Non-operational",
];

const NEW_INSTRUMENT_CONDITIONS = [
  "Brand New - Factory Sealed",
  "Brand New - Demo Unit",
  "Brand New with OEM Warranty",
];

const SPARE_CONDITIONS = [
  "Brand New - Sealed OEM",
  "Tested Working Surplus",
  "Used - Functional",
  "Refurbished / Repaired",
];

export default function SellScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { colors } = LabMatrixTokens;
  const { isAuthenticated, user } = useAuth();

  const [itemType, setItemType] = useState<"MACHINE" | "NEW_INSTRUMENT" | "SPARE_PART">("MACHINE");

  // Form Fields
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [condition, setCondition] = useState(MACHINE_CONDITIONS[1]);
  const [compatibleWith, setCompatibleWith] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [location, setLocation] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [description, setDescription] = useState("");

  // Photos
  const [photos, setPhotos] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Private Contact Details
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [companyName, setCompanyName] = useState(user?.companyName || "");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<{ id: string; title: string; itemType: string } | null>(null);

  // Sync profile details if available
  useEffect(() => {
    if (user) {
      if (user.phoneNumber && !phoneNumber) setPhoneNumber(user.phoneNumber);
      if (user.companyName && !companyName) setCompanyName(user.companyName);
    }
  }, [user]);

  // Adjust conditions and category defaults when itemType changes
  const handleItemTypeChange = (type: "MACHINE" | "NEW_INSTRUMENT" | "SPARE_PART") => {
    setItemType(type);
    if (type === "SPARE_PART") {
      setCondition(SPARE_CONDITIONS[0]);
      setCategory("Spare Parts & Consumables");
    } else if (type === "NEW_INSTRUMENT") {
      setCondition(NEW_INSTRUMENT_CONDITIONS[0]);
      if (category === "Spare Parts & Consumables") setCategory(CATEGORIES[0]);
    } else {
      setCondition(MACHINE_CONDITIONS[1]);
      if (category === "Spare Parts & Consumables") setCategory(CATEGORIES[0]);
    }
  };

  const currentConditions =
    itemType === "SPARE_PART"
      ? SPARE_CONDITIONS
      : itemType === "NEW_INSTRUMENT"
      ? NEW_INSTRUMENT_CONDITIONS
      : MACHINE_CONDITIONS;

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow photo library access to upload photos of your laboratory equipment."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 10 - photos.length,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        for (const asset of result.assets) {
          await uploadImage(asset.uri);
        }
      }
    } catch (err) {
      console.error("Image pick error:", err);
      Alert.alert("Error", "Could not pick image.");
    }
  };

  const uploadImage = async (uri: string) => {
    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      const filename = uri.split("/").pop() || "upload.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      // @ts-ignore: FormData in React Native accepts uri object
      formData.append("file", {
        uri: Platform.OS === "ios" ? uri.replace("file://", "") : uri,
        name: filename,
        type,
      });

      const res = await api.post("/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.url) {
        setPhotos((prev) => [...prev, res.data.url]);
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      Alert.alert("Upload Failed", error.response?.data?.error || "Could not upload photo.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim() || title.trim().length < 3) {
      Alert.alert("Validation Error", "Please provide a valid equipment title (at least 3 characters).");
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      Alert.alert("Validation Error", "Please provide detailed specifications (at least 10 characters).");
      return;
    }
    if (!minPrice.trim() || !maxPrice.trim()) {
      Alert.alert("Validation Error", "Please provide your expected price range (Min and Max price).");
      return;
    }
    if (parseFloat(minPrice) > parseFloat(maxPrice)) {
      Alert.alert("Validation Error", "Minimum price cannot be greater than maximum price.");
      return;
    }
    if (!phoneNumber.trim()) {
      Alert.alert(
        "Contact Required",
        "Your mobile/WhatsApp number is required for deal notifications and buyer verification."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        title: title.trim(),
        category,
        itemType,
        condition,
        location: location.trim() || "India",
        minPrice: parseFloat(minPrice),
        maxPrice: parseFloat(maxPrice),
        quantity: Math.max(1, parseInt(quantity, 10) || 1),
        description: description.trim(),
        photos,
        phoneNumber: phoneNumber.trim(),
        companyName: companyName.trim() || undefined,
      };

      if (itemType === "SPARE_PART") {
        if (partNumber.trim()) payload.partNumber = partNumber.trim();
        if (compatibleWith.trim()) payload.compatibleWith = compatibleWith.trim();
      }

      const res = await api.post("/api/listings", payload);

      setSubmittedData({
        id: res.data?.listingId || "success",
        title: title.trim(),
        itemType,
      });
    } catch (error: any) {
      console.error("Submit listing error:", error);
      Alert.alert("Submission Failed", error.response?.data?.error || "Could not create listing.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auth Guard Screen
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.safeArea, isDark && styles.safeAreaDark]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={styles.topBar}>
          <Image
            source={require("@/assets/images/logo.png")}
            style={styles.logoImg}
            resizeMode="contain"
          />
        </View>

        <View style={styles.authRequiredContainer}>
          <View style={styles.authLockCircle}>
            <Lock size={36} color="#033a7d" />
          </View>
          <Text style={[styles.authTitle, isDark && styles.authTitleDark]}>
            Sign In Required to List Items
          </Text>
          <Text style={styles.authSubtitle}>
            Please sign in with your LabMatrix account or register your facility to list analytical
            instruments and spare parts.
          </Text>
          <TouchableOpacity
            style={styles.signInButton}
            activeOpacity={0.85}
            onPress={() => router.push("/(auth)/login" as any)}
          >
            <Text style={styles.signInButtonText}>Proceed to Sign In</Text>
            <ArrowRight size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Submitted Success Confirmation Screen
  if (submittedData) {
    return (
      <SafeAreaView style={[styles.safeArea, isDark && styles.safeAreaDark]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={styles.topBar}>
          <Image
            source={require("@/assets/images/logo.png")}
            style={styles.logoImg}
            resizeMode="contain"
          />
        </View>

        <ScrollView contentContainerStyle={styles.successContainer}>
          <View style={styles.successIconCircle}>
            <Clock size={40} color="#b45309" />
          </View>

          <View style={styles.pendingBadge}>
            <Clock size={12} color="#b45309" />
            <Text style={styles.pendingBadgeText}>Pending Admin Review</Text>
          </View>

          <Text style={[styles.successTitle, isDark && styles.successTitleDark]}>
            Entry Submitted for Approval!
          </Text>
          <Text style={styles.successSubtitle}>
            Your listing for <Text style={{ fontWeight: "800", color: "#0f172a" }}>"{submittedData.title}"</Text> has
            been created and sent to our admin team for verification.
          </Text>

          <View style={[styles.successInfoCard, isDark && styles.successInfoCardDark]}>
            <View style={styles.successInfoRow}>
              <CheckCircle2 size={16} color="#15803d" style={{ marginTop: 2 }} />
              <Text style={styles.successInfoText}>
                <Text style={{ fontWeight: "700" }}>Next Step: </Text>
                Our engineering team will verify specifications and activate it in the catalog.
              </Text>
            </View>
            <View style={styles.successInfoRow}>
              <CheckCircle2 size={16} color="#15803d" style={{ marginTop: 2 }} />
              <Text style={styles.successInfoText}>
                <Text style={{ fontWeight: "700" }}>Notification: </Text>
                You will receive an in-app alert (bell icon) the moment your item is live.
              </Text>
            </View>
          </View>

          <View style={styles.successActionCol}>
            <TouchableOpacity
              style={styles.goToMarketplaceBtn}
              activeOpacity={0.85}
              onPress={() => {
                setSubmittedData(null);
                router.push("/(tabs)");
              }}
            >
              <Text style={styles.goToMarketplaceBtnText}>Go to Marketplace</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.postAnotherBtn}
              activeOpacity={0.85}
              onPress={() => {
                setSubmittedData(null);
                setTitle("");
                setDescription("");
                setMinPrice("");
                setMaxPrice("");
                setPhotos([]);
                setPartNumber("");
                setCompatibleWith("");
              }}
            >
              <Text style={styles.postAnotherBtnText}>List Another Item</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const publishButtonLabel =
    itemType === "SPARE_PART"
      ? "Publish Spare Part Listing →"
      : itemType === "NEW_INSTRUMENT"
      ? "Publish Instrument Listing →"
      : "Publish Machine Listing →";

  return (
    <SafeAreaView style={[styles.safeArea, isDark && styles.safeAreaDark]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* 1. Top Branding Header Bar */}
      <View style={[styles.topBar, isDark && styles.topBarDark]}>
        <View style={styles.logoRow}>
          <Image
            source={require("@/assets/images/logo.png")}
            style={styles.logoImg}
            resizeMode="contain"
          />
        </View>

        <View style={styles.topRightIcons}>
          <TouchableOpacity
            style={styles.iconBtn}
            activeOpacity={0.7}
            onPress={() => router.push("/notifications" as any)}
          >
            <Bell size={20} color={isDark ? "#f8fafc" : "#0f172a"} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.avatarCircle}
            activeOpacity={0.7}
            onPress={() => router.push("/profile" as any)}
          >
            <User size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Page Title & Privacy Note */}
        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, isDark && styles.pageTitleDark]}>
            List Equipment or Spare Parts
          </Text>
          <Text style={styles.pageSubtitle}>
            Your contact details remain completely private. Inquiries and proposals are coordinated securely.
          </Text>
        </View>

        {/* Card 0: Item Type Selector Cards */}
        <View style={[styles.sectionCard, isDark && styles.sectionCardDark]}>
          <Text style={[styles.sectionHeading, isDark && styles.sectionHeadingDark]}>
            What are you listing for sale? *
          </Text>

          <View style={styles.itemTypeCardsRow}>
            {/* Machine */}
            <TouchableOpacity
              style={[
                styles.itemTypeCard,
                itemType === "MACHINE" && styles.itemTypeCardActive,
              ]}
              activeOpacity={0.85}
              onPress={() => handleItemTypeChange("MACHINE")}
            >
              <View style={[styles.typeIconBox, itemType === "MACHINE" && styles.typeIconBoxActive]}>
                <Microscope size={20} color={itemType === "MACHINE" ? "#ffffff" : "#033a7d"} />
              </View>
              <Text style={styles.typeCardTitle}>Pre-Owned Machine</Text>
              <Text style={styles.typeCardSub}>Refurbished / Used instruments</Text>
            </TouchableOpacity>

            {/* Brand New */}
            <TouchableOpacity
              style={[
                styles.itemTypeCard,
                itemType === "NEW_INSTRUMENT" && styles.itemTypeCardActive,
              ]}
              activeOpacity={0.85}
              onPress={() => handleItemTypeChange("NEW_INSTRUMENT")}
            >
              <View
                style={[
                  styles.typeIconBox,
                  itemType === "NEW_INSTRUMENT" && { backgroundColor: "#15803d" },
                ]}
              >
                <Sparkles size={20} color={itemType === "NEW_INSTRUMENT" ? "#ffffff" : "#15803d"} />
              </View>
              <Text style={styles.typeCardTitle}>Brand New Instrument</Text>
              <Text style={styles.typeCardSub}>Factory sealed with OEM warranty</Text>
            </TouchableOpacity>

            {/* Spare Part */}
            <TouchableOpacity
              style={[
                styles.itemTypeCard,
                itemType === "SPARE_PART" && styles.itemTypeCardActive,
              ]}
              activeOpacity={0.85}
              onPress={() => handleItemTypeChange("SPARE_PART")}
            >
              <View style={[styles.typeIconBox, itemType === "SPARE_PART" && styles.typeIconBoxActive]}>
                <Wrench size={20} color={itemType === "SPARE_PART" ? "#ffffff" : "#033a7d"} />
              </View>
              <Text style={styles.typeCardTitle}>Spare Part / Consumable</Text>
              <Text style={styles.typeCardSub}>Lamps, columns, modules, valves...</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Card 1: Specifications */}
        <View style={[styles.sectionCard, isDark && styles.sectionCardDark]}>
          <Text style={[styles.sectionHeading, isDark && styles.sectionHeadingDark]}>
            {itemType === "SPARE_PART"
              ? "1. Spare Part Specifications"
              : itemType === "NEW_INSTRUMENT"
              ? "1. New Instrument Specifications"
              : "1. Machine Specifications"}
          </Text>

          {/* Title */}
          <Text style={styles.inputLabel}>
            {itemType === "SPARE_PART"
              ? "Part / Consumable Title & Name *"
              : "Equipment Title & Model *"}
          </Text>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            placeholder={
              itemType === "SPARE_PART"
                ? "e.g. Agilent 1260 DAD Deuterium Lamp (OEM Sealed) or Waters 2695 Pump Seal Kit"
                : "e.g. Waters Acquity UPLC System with PDA Detector & Sample Manager"
            }
            placeholderTextColor="#94a3b8"
            value={title}
            onChangeText={setTitle}
          />

          {/* Spare Part Specific Fields */}
          {itemType === "SPARE_PART" && (
            <>
              <Text style={styles.inputLabel}>Compatible Instrument / OEM Model</Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                placeholder="e.g. Agilent 1100 / 1200 / 1260 Series, Waters Alliance"
                placeholderTextColor="#94a3b8"
                value={compatibleWith}
                onChangeText={setCompatibleWith}
              />

              <Text style={styles.inputLabel}>Part Number / Catalog Number (Optional)</Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                placeholder="e.g. G1315-60012, 5063-6589"
                placeholderTextColor="#94a3b8"
                value={partNumber}
                onChangeText={setPartNumber}
              />
            </>
          )}

          {/* Category */}
          <Text style={styles.inputLabel}>Category *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catPill, category === cat && styles.catPillActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.catPillText, category === cat && styles.catPillTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Condition */}
          <Text style={styles.inputLabel}>Condition *</Text>
          <View style={styles.conditionsRow}>
            {currentConditions.map((cond) => {
              const isSelected = condition === cond;
              return (
                <TouchableOpacity
                  key={cond}
                  style={[styles.condChip, isSelected && styles.condChipActive]}
                  onPress={() => setCondition(cond)}
                >
                  <Text style={[styles.condChipText, isSelected && styles.condChipTextActive]}>
                    {cond}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Location & Quantity */}
          <View style={styles.twoColRow}>
            <View style={{ flex: 2 }}>
              <Text style={styles.inputLabel}>Current Location (City / State) *</Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                placeholder="e.g. Hyderabad, Telangana"
                placeholderTextColor="#94a3b8"
                value={location}
                onChangeText={setLocation}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Quantity *</Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                placeholder="1"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={quantity}
                onChangeText={setQuantity}
              />
            </View>
          </View>

          {/* Price Range */}
          <Text style={styles.inputLabel}>Expected Price Range (₹) *</Text>
          <View style={styles.twoColRow}>
            <View style={{ flex: 1 }}>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                placeholder="Min Price (₹)"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={minPrice}
                onChangeText={setMinPrice}
              />
            </View>

            <View style={{ flex: 1 }}>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                placeholder="Max Price (₹)"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={maxPrice}
                onChangeText={setMaxPrice}
              />
            </View>
          </View>

          {/* Detailed Description & Specifications (Matched to Reference Image) */}
          <Text style={styles.inputLabel}>Detailed Description & Specifications *</Text>
          <TextInput
            style={[styles.textArea, isDark && styles.textAreaDark]}
            placeholder={
              itemType === "SPARE_PART"
                ? "Describe part working status, manufacture date or expiry if applicable, original packaging, quantity included, testing verified..."
                : "Include year of manufacture, software version, included modules/detectors, service history, operational status, calibration status..."
            }
            placeholderTextColor="#94a3b8"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Card 2: Photos & Documentation (Matched to Reference Image) */}
        <View style={[styles.sectionCard, isDark && styles.sectionCardDark]}>
          <Text style={[styles.sectionHeading, isDark && styles.sectionHeadingDark]}>
            2. Photos & Documentation
          </Text>
          <Text style={styles.sectionSubheading}>
            High-quality photos of the serial plate, modules, and condition increase buyer interest.
          </Text>

          <View style={styles.photoGrid}>
            {/* Upload Button with Dashed Border */}
            <TouchableOpacity
              style={styles.dashedUploadBox}
              activeOpacity={0.8}
              onPress={pickImage}
              disabled={isUploadingPhoto}
            >
              {isUploadingPhoto ? (
                <ActivityIndicator size="small" color="#033a7d" />
              ) : (
                <>
                  <Upload size={24} color="#64748b" style={{ marginBottom: 4 }} />
                  <Text style={styles.uploadBoxTitle}>Add Photos</Text>
                  <Text style={styles.uploadBoxSub}>PNG, JPG, WEBP</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Thumbnail Grid */}
            {photos.map((p, idx) => (
              <View key={idx} style={styles.photoThumbWrapper}>
                <Image source={{ uri: p }} style={styles.photoThumb} resizeMode="cover" />
                <TouchableOpacity
                  style={styles.photoRemoveBtn}
                  onPress={() => removePhoto(idx)}
                >
                  <X size={12} color="#ffffff" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* Card 3: Contact & Notification Details (Dark Navy Container Matched to Reference Image) */}
        <View style={styles.contactDarkCard}>
          <View style={styles.contactCardHeader}>
            <View style={styles.lockIconBox}>
              <Lock size={18} color="#fbc634" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.contactCardTitle}>3. Contact & Notification Details</Text>
              <Text style={styles.contactCardSub}>
                Your phone number will NEVER be displayed publicly on this listing. It is used strictly for
                deal notifications and verifying interested buyers.
              </Text>
            </View>
          </View>

          {/* Mobile / WhatsApp Number Input */}
          <Text style={styles.darkInputLabel}>Your Mobile / WhatsApp Number *</Text>
          <View style={styles.darkInputWrapper}>
            <Phone size={15} color="#94a3b8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.darkInput}
              placeholder="+91 98765 43210"
              placeholderTextColor="#64748b"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />
          </View>

          {/* Company / Laboratory Name Input */}
          <Text style={styles.darkInputLabel}>Company / Laboratory Name (Optional)</Text>
          <View style={styles.darkInputWrapper}>
            <Building2 size={15} color="#94a3b8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.darkInput}
              placeholder="e.g. Labmatrix"
              placeholderTextColor="#64748b"
              value={companyName}
              onChangeText={setCompanyName}
            />
          </View>

          {/* Phone Verified Note */}
          <View style={styles.phoneVerifiedRow}>
            <CheckCircle2 size={14} color="#fbc634" />
            <Text style={styles.phoneVerifiedText}>
              Phone on file: Verified for inquiry notifications.
            </Text>
          </View>
        </View>

        {/* Bottom Publish Button */}
        <TouchableOpacity
          style={[styles.publishBtn, isSubmitting && styles.publishBtnDisabled]}
          activeOpacity={0.88}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Text style={styles.publishBtnText}>{publishButtonLabel}</Text>
              <ArrowRight size={16} color="#ffffff" />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 10 : 4,
    paddingBottom: 8,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  topBarDark: {
    backgroundColor: "#0b1329",
    borderBottomColor: "#1e293b",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoImg: {
    width: 140,
    height: 32,
  },
  topRightIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconBtn: {
    padding: 4,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#002555",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingBottom: 40,
    backgroundColor: "#f8fafc",
  },
  pageHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: "#ffffff",
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  pageTitleDark: {
    color: "#f8fafc",
  },
  pageSubtitle: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionCardDark: {
    backgroundColor: "#0b1329",
    borderColor: "#1e293b",
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 4,
  },
  sectionHeadingDark: {
    color: "#f8fafc",
  },
  sectionSubheading: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 14,
  },
  itemTypeCardsRow: {
    gap: 10,
    marginTop: 10,
  },
  itemTypeCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    padding: 12,
  },
  itemTypeCardActive: {
    borderColor: "#033a7d",
    backgroundColor: "#eff5fb",
  },
  typeIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#eff5fb",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  typeIconBoxActive: {
    backgroundColor: "#033a7d",
  },
  typeCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 2,
  },
  typeCardSub: {
    fontSize: 11,
    color: "#64748b",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    height: 44,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#0f172a",
  },
  inputDark: {
    backgroundColor: "#16203a",
    borderColor: "#334155",
    color: "#f8fafc",
  },
  textArea: {
    minHeight: 90,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
    textAlignVertical: "top",
    lineHeight: 20,
  },
  textAreaDark: {
    backgroundColor: "#16203a",
    borderColor: "#334155",
    color: "#f8fafc",
  },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  catPillActive: {
    backgroundColor: "#033a7d",
    borderColor: "#033a7d",
  },
  catPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  catPillTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  conditionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  condChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  condChipActive: {
    backgroundColor: "#033a7d",
    borderColor: "#033a7d",
  },
  condChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  condChipTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  twoColRow: {
    flexDirection: "row",
    gap: 10,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  dashedUploadBox: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#94a3b8",
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
  },
  uploadBoxTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  uploadBoxSub: {
    fontSize: 9,
    color: "#94a3b8",
    marginTop: 2,
  },
  photoThumbWrapper: {
    position: "relative",
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  photoThumb: {
    width: "100%",
    height: "100%",
  },
  photoRemoveBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(185, 28, 28, 0.9)",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  contactDarkCard: {
    backgroundColor: "#0b1329",
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  contactCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  lockIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(251, 198, 52, 0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  contactCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 3,
  },
  contactCardSub: {
    fontSize: 11,
    color: "#94a3b8",
    lineHeight: 16,
  },
  darkInputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#cbd5e1",
    marginBottom: 5,
    marginTop: 10,
  },
  darkInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    borderRadius: 10,
    backgroundColor: "#16203a",
    borderWidth: 1,
    borderColor: "#334155",
    paddingHorizontal: 12,
  },
  darkInput: {
    flex: 1,
    fontSize: 14,
    color: "#ffffff",
  },
  phoneVerifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  phoneVerifiedText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fbc634",
  },
  publishBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#002555",
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: "#002555",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  publishBtnDisabled: {
    opacity: 0.6,
  },
  publishBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  authRequiredContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f8fafc",
  },
  authLockCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#eff5fb",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#dbeaf7",
  },
  authTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 8,
  },
  authTitleDark: {
    color: "#f8fafc",
  },
  authSubtitle: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
    maxWidth: 300,
  },
  signInButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#033a7d",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  signInButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  successContainer: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  successIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#fef3c7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fef3c7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    marginBottom: 12,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#b45309",
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 8,
  },
  successTitleDark: {
    color: "#f8fafc",
  },
  successSubtitle: {
    fontSize: 13,
    color: "#475569",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
  },
  successInfoCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    width: "100%",
    gap: 10,
    marginBottom: 24,
  },
  successInfoCardDark: {
    backgroundColor: "#16203a",
    borderColor: "#1e293b",
  },
  successInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  successInfoText: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 18,
    flex: 1,
  },
  successActionCol: {
    width: "100%",
    gap: 10,
  },
  goToMarketplaceBtn: {
    backgroundColor: "#033a7d",
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  goToMarketplaceBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  postAnotherBtn: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  postAnotherBtnText: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "700",
  },
});
