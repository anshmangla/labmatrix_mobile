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
  StatusBar,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  Upload,
  X,
  Lock,
  Phone,
  Building2,
  ArrowRight,
  ArrowLeft,
  Clock,
  CheckCircle2,
  Bell,
  User,
  Search,
  Sparkles,
  Wrench,
  Microscope,
  MapPin,
  ChevronDown,
  Plus,
  Minus,
  Camera,
  ShieldCheck,
  Check,
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

  // Modals for Category & Condition Dropdowns
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [isConditionModalVisible, setIsConditionModalVisible] = useState(false);

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

  const handleQuantityMinus = () => {
    const q = parseInt(quantity, 10) || 1;
    if (q > 1) {
      setQuantity(String(q - 1));
    }
  };

  const handleQuantityPlus = () => {
    const q = parseInt(quantity, 10) || 1;
    setQuantity(String(q + 1));
  };

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
    if (parseFloat(minPrice.replace(/[^0-9.]/g, "")) > parseFloat(maxPrice.replace(/[^0-9.]/g, ""))) {
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
        minPrice: parseFloat(minPrice.replace(/[^0-9.]/g, "")),
        maxPrice: parseFloat(maxPrice.replace(/[^0-9.]/g, "")),
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
      <SafeAreaView edges={["top"]} style={[styles.safeArea, isDark && styles.safeAreaDark]}>
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
      <SafeAreaView edges={["top"]} style={[styles.safeArea, isDark && styles.safeAreaDark]}>
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

  const section1Title =
    itemType === "SPARE_PART"
      ? "1. Spare Part Specifications"
      : itemType === "NEW_INSTRUMENT"
      ? "1. New Instrument Specifications"
      : "1. Machine Specifications";

  return (
    <SafeAreaView edges={["top"]} style={[styles.safeArea, isDark && styles.safeAreaDark]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* 1. Top Branding Header Bar with Search, Bell, Profile */}
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
            onPress={() => router.push("/(tabs)")}
          >
            <Search size={20} color={isDark ? "#f8fafc" : "#0f172a"} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            activeOpacity={0.7}
            onPress={() => router.push("/notifications" as any)}
          >
            <Bell size={20} color={isDark ? "#f8fafc" : "#0f172a"} />
            <View style={styles.redBadgeDot} />
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
        {/* Back Link & Title */}
        <TouchableOpacity
          style={styles.backLinkRow}
          activeOpacity={0.7}
          onPress={() => router.push("/(tabs)")}
        >
          <ArrowLeft size={16} color="#033a7d" />
          <Text style={styles.backLinkText}>Back to All Listings</Text>
        </TouchableOpacity>

        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, isDark && styles.pageTitleDark]}>
            List Equipment or Spare Parts
          </Text>
          <Text style={styles.pageSubtitle}>
            Your contact details remain completely private. Inquiries and proposals are coordinated securely.
          </Text>
        </View>

        {/* What are you listing for sale? Selector Cards */}
        <View style={styles.itemTypeSection}>
          <Text style={[styles.sectionHeadingTitle, isDark && styles.sectionHeadingTitleDark]}>
            What are you listing for sale? <Text style={{ color: "#ba1a1a" }}>*</Text>
          </Text>

          <View style={styles.itemTypeCardsCol}>
            {/* Card 1: Pre-Owned Machine */}
            <TouchableOpacity
              style={[
                styles.itemTypeCard,
                itemType === "MACHINE" && styles.itemTypeCardActive,
                isDark && styles.itemTypeCardDark,
              ]}
              activeOpacity={0.85}
              onPress={() => handleItemTypeChange("MACHINE")}
            >
              <View style={[styles.typeIconBox, { backgroundColor: "#011936" }]}>
                <Microscope size={22} color="#ffffff" />
              </View>
              <View style={styles.typeTextCol}>
                <Text style={[styles.typeCardTitle, isDark && styles.typeCardTitleDark]}>
                  Pre-Owned Machine
                </Text>
                <Text style={styles.typeCardSub}>Refurbished / Used instruments</Text>
              </View>
              {itemType === "MACHINE" && (
                <CheckCircle2 size={22} color="#033a7d" />
              )}
            </TouchableOpacity>

            {/* Card 2: Brand New Instrument */}
            <TouchableOpacity
              style={[
                styles.itemTypeCard,
                itemType === "NEW_INSTRUMENT" && styles.itemTypeCardActive,
                isDark && styles.itemTypeCardDark,
              ]}
              activeOpacity={0.85}
              onPress={() => handleItemTypeChange("NEW_INSTRUMENT")}
            >
              <View style={[styles.typeIconBox, { backgroundColor: "#eff5fb" }]}>
                <Sparkles size={22} color="#1d4ed8" />
              </View>
              <View style={styles.typeTextCol}>
                <Text style={[styles.typeCardTitle, isDark && styles.typeCardTitleDark]}>
                  Brand New Instrument
                </Text>
                <Text style={styles.typeCardSub}>Factory sealed with OEM warranty</Text>
              </View>
              {itemType === "NEW_INSTRUMENT" && (
                <CheckCircle2 size={22} color="#033a7d" />
              )}
            </TouchableOpacity>

            {/* Card 3: Spare Part / Consumable */}
            <TouchableOpacity
              style={[
                styles.itemTypeCard,
                itemType === "SPARE_PART" && styles.itemTypeCardActive,
                isDark && styles.itemTypeCardDark,
              ]}
              activeOpacity={0.85}
              onPress={() => handleItemTypeChange("SPARE_PART")}
            >
              <View style={[styles.typeIconBox, { backgroundColor: "#eff5fb" }]}>
                <Wrench size={22} color="#334155" />
              </View>
              <View style={styles.typeTextCol}>
                <Text style={[styles.typeCardTitle, isDark && styles.typeCardTitleDark]}>
                  Spare Part / Consumable
                </Text>
                <Text style={styles.typeCardSub}>Lamps, columns, modules, valves...</Text>
              </View>
              {itemType === "SPARE_PART" && (
                <CheckCircle2 size={22} color="#033a7d" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 1: Specifications Card */}
        <View style={[styles.sectionCard, isDark && styles.sectionCardDark]}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionBarIndicator} />
            <Text style={[styles.sectionHeading, isDark && styles.sectionHeadingDark]}>
              {section1Title}
            </Text>
          </View>

          {/* Equipment Title & Model */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {itemType === "SPARE_PART"
                ? "Part / Consumable Title & Name"
                : "Equipment Title & Model"}{" "}
              <Text style={{ color: "#ba1a1a" }}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, isDark && styles.inputDark]}
              placeholder="Waters Acquity UPLC System with PDA Detector"
              placeholderTextColor="#94a3b8"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Spare Part Specific Fields */}
          {itemType === "SPARE_PART" && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Compatible Instrument / OEM Model</Text>
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  placeholder="e.g. Agilent 1100 / 1200 / 1260 Series, Waters Alliance"
                  placeholderTextColor="#94a3b8"
                  value={compatibleWith}
                  onChangeText={setCompatibleWith}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Part Number / Catalog Number (Optional)</Text>
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  placeholder="e.g. G1315-60012, 5063-6589"
                  placeholderTextColor="#94a3b8"
                  value={partNumber}
                  onChangeText={setPartNumber}
                />
              </View>
            </>
          )}

          {/* 2-Column Row: Category & Condition Dropdown Pickers */}
          <View style={styles.twoColRow}>
            <View style={styles.col}>
              <Text style={styles.inputLabel}>
                Category <Text style={{ color: "#ba1a1a" }}>*</Text>
              </Text>
              <TouchableOpacity
                style={[styles.dropdownPickerBox, isDark && styles.dropdownPickerBoxDark]}
                activeOpacity={0.8}
                onPress={() => setIsCategoryModalVisible(true)}
              >
                <Text style={[styles.dropdownPickerText, isDark && styles.dropdownPickerTextDark]} numberOfLines={1}>
                  {category}
                </Text>
                <ChevronDown size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.col}>
              <Text style={styles.inputLabel}>
                Condition <Text style={{ color: "#ba1a1a" }}>*</Text>
              </Text>
              <TouchableOpacity
                style={[styles.dropdownPickerBox, isDark && styles.dropdownPickerBoxDark]}
                activeOpacity={0.8}
                onPress={() => setIsConditionModalVisible(true)}
              >
                <Text style={[styles.dropdownPickerText, isDark && styles.dropdownPickerTextDark]} numberOfLines={1}>
                  {condition}
                </Text>
                <ChevronDown size={16} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>

          {/* 2-Column Row: Location & Quantity Available Stepper */}
          <View style={styles.twoColRow}>
            <View style={styles.col}>
              <Text style={styles.inputLabel}>
                Current Location <Text style={{ color: "#ba1a1a" }}>*</Text>
              </Text>
              <View style={[styles.iconInputBox, isDark && styles.iconInputBoxDark]}>
                <MapPin size={16} color="#033a7d" style={{ marginLeft: 10 }} />
                <TextInput
                  style={[styles.iconInputField, isDark && styles.iconInputFieldDark]}
                  placeholder="Hyderabad, Telangana"
                  placeholderTextColor="#94a3b8"
                  value={location}
                  onChangeText={setLocation}
                />
              </View>
            </View>

            <View style={styles.col}>
              <Text style={styles.inputLabel}>
                Quantity Available <Text style={{ color: "#ba1a1a" }}>*</Text>
              </Text>
              <View style={[styles.stepperContainer, isDark && styles.stepperContainerDark]}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  activeOpacity={0.7}
                  onPress={handleQuantityMinus}
                >
                  <Minus size={16} color="#033a7d" />
                </TouchableOpacity>

                <Text style={[styles.stepperValueText, isDark && styles.stepperValueTextDark]}>
                  {quantity}
                </Text>

                <TouchableOpacity
                  style={styles.stepperBtn}
                  activeOpacity={0.7}
                  onPress={handleQuantityPlus}
                >
                  <Plus size={16} color="#033a7d" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Price Expectation Row with Target Bidding Range */}
          <View style={styles.inputGroup}>
            <View style={styles.priceHeaderRow}>
              <Text style={styles.inputLabel}>
                Price Expectation (₹) <Text style={{ color: "#ba1a1a" }}>*</Text>
              </Text>
              <Text style={styles.priceTargetSubtitle}>Target Bidding Range</Text>
            </View>

            <View style={styles.twoColRow}>
              <View style={styles.col}>
                <View style={[styles.iconInputBox, isDark && styles.iconInputBoxDark]}>
                  <Text style={styles.rupeePrefix}>₹</Text>
                  <TextInput
                    style={[styles.iconInputField, isDark && styles.iconInputFieldDark]}
                    placeholder="280,000"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={minPrice}
                    onChangeText={setMinPrice}
                  />
                </View>
              </View>

              <View style={styles.col}>
                <View style={[styles.iconInputBox, isDark && styles.iconInputBoxDark]}>
                  <Text style={styles.rupeePrefix}>₹</Text>
                  <TextInput
                    style={[styles.iconInputField, isDark && styles.iconInputFieldDark]}
                    placeholder="340,000"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={maxPrice}
                    onChangeText={setMaxPrice}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Detailed Description & Specifications */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Detailed Description & Specifications <Text style={{ color: "#ba1a1a" }}>*</Text>
            </Text>
            <TextInput
              style={[styles.textArea, isDark && styles.textAreaDark]}
              placeholder="Waters Acquity UPLC H-Class configured with Sample Manager FTN, Quaternary Solvent Manager (QSM), and PDA detector. Decommissioned directly from pharma analytical laboratory. Last calibrated October..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
            />
          </View>
        </View>

        {/* Section 2: Photos & Documentation */}
        <View style={[styles.sectionCard, isDark && styles.sectionCardDark]}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionBarIndicator} />
            <Text style={[styles.sectionHeading, isDark && styles.sectionHeadingDark]}>
              2. Photos & Documentation
            </Text>
          </View>

          <Text style={styles.sectionSubtext}>
            High-quality photos of the serial plate, modules, and condition increase buyer interest.
          </Text>

          {/* Dashed Upload Box */}
          <TouchableOpacity
            style={[styles.dashedUploadBox, isDark && styles.dashedUploadBoxDark]}
            activeOpacity={0.8}
            onPress={pickImage}
            disabled={isUploadingPhoto}
          >
            {isUploadingPhoto ? (
              <ActivityIndicator size="large" color="#033a7d" />
            ) : (
              <>
                <View style={styles.cloudIconCircle}>
                  <Upload size={22} color="#033a7d" />
                </View>
                <Text style={styles.uploadBoxTitle}>Add Photos & Specs</Text>
                <Text style={styles.uploadBoxSub}>PNG, JPG, WEBP or PDF (Max 5MB each)</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Photo Thumbnails Gallery */}
          {photos.length > 0 && (
            <View style={styles.thumbnailsContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnailsRow}>
                {photos.map((uri, index) => (
                  <View key={index} style={styles.thumbnailWrapper}>
                    <Image source={{ uri }} style={styles.thumbnailImage} />
                    {index === 0 && (
                      <View style={styles.primaryBadge}>
                        <Text style={styles.primaryBadgeText}>Primary</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.removePhotoBtn}
                      activeOpacity={0.8}
                      onPress={() => removePhoto(index)}
                    >
                      <X size={12} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Add More Squircle */}
                <TouchableOpacity
                  style={styles.addMoreSquircle}
                  activeOpacity={0.8}
                  onPress={pickImage}
                  disabled={isUploadingPhoto}
                >
                  <Camera size={20} color="#033a7d" />
                  <Text style={styles.addMoreText}>Add More</Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Verified Status Line */}
              <View style={styles.verifiedPhotosLine}>
                <CheckCircle2 size={15} color="#15803d" />
                <Text style={styles.verifiedPhotosText}>
                  {photos.length} photo{photos.length > 1 ? "s" : ""} added • Serial plate verified
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Section 3: Contact & Notification Details (Dark Navy Container) */}
        <View style={styles.darkNavyCard}>
          <View style={styles.darkCardHeaderRow}>
            <Lock size={20} color="#fdc836" />
            <Text style={styles.darkCardTitle}>3. Contact & Notification Details</Text>
          </View>

          <Text style={styles.darkCardSubtitle}>
            Your phone number will <Text style={{ fontWeight: "800", color: "#ffffff" }}>NEVER</Text> be displayed
            publicly on this listing. It is used strictly for deal notifications and verifying interested buyers.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.darkCardLabel}>
              Your Mobile / WhatsApp Number <Text style={{ color: "#fdc836" }}>*</Text>
            </Text>
            <View style={styles.darkCardInputBox}>
              <Phone size={16} color="#033a7d" style={{ marginLeft: 12 }} />
              <TextInput
                style={styles.darkCardInputField}
                placeholder="+91 8920798971"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.darkCardLabel}>Company / Laboratory Name (Optional)</Text>
            <View style={styles.darkCardInputBox}>
              <Building2 size={16} color="#033a7d" style={{ marginLeft: 12 }} />
              <TextInput
                style={styles.darkCardInputField}
                placeholder="Labmatrix Analytical Lab"
                placeholderTextColor="#94a3b8"
                value={companyName}
                onChangeText={setCompanyName}
              />
            </View>
          </View>

          {/* Verification Badge Footer */}
          <View style={styles.darkCardFooter}>
            <ShieldCheck size={16} color="#fdc836" />
            <Text style={styles.darkCardFooterText}>
              Phone on file: Verified for instant RFQ alerts
            </Text>
          </View>
        </View>

        {/* Big Yellow CTA Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          activeOpacity={0.85}
          disabled={isSubmitting}
          onPress={handleSubmit}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#0f172a" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>Submit Listing for Verification →</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Assurance Text Below Button */}
        <View style={styles.reassuranceRow}>
          <CheckCircle2 size={16} color="#033a7d" style={{ marginTop: 1 }} />
          <Text style={styles.reassuranceText}>
            Listing is verified by LabMatrix Technical Desk within 2-4 business hours before appearing live to verified buyers.
          </Text>
        </View>
      </ScrollView>

      {/* Category Selection Modal */}
      <Modal
        visible={isCategoryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsCategoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentCard, isDark && styles.modalContentCardDark]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDark && styles.modalTitleDark]}>Select Category</Text>
              <TouchableOpacity onPress={() => setIsCategoryModalVisible(false)}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.modalItemRow, category === cat && styles.modalItemRowSelected]}
                  onPress={() => {
                    setCategory(cat);
                    setIsCategoryModalVisible(false);
                  }}
                >
                  <Text style={[styles.modalItemText, category === cat && styles.modalItemTextSelected]}>
                    {cat}
                  </Text>
                  {category === cat && <Check size={18} color="#033a7d" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Condition Selection Modal */}
      <Modal
        visible={isConditionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsConditionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentCard, isDark && styles.modalContentCardDark]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDark && styles.modalTitleDark]}>Select Condition</Text>
              <TouchableOpacity onPress={() => setIsConditionModalVisible(false)}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              {currentConditions.map((cond) => (
                <TouchableOpacity
                  key={cond}
                  style={[styles.modalItemRow, condition === cond && styles.modalItemRowSelected]}
                  onPress={() => {
                    setCondition(cond);
                    setIsConditionModalVisible(false);
                  }}
                >
                  <Text style={[styles.modalItemText, condition === cond && styles.modalItemTextSelected]}>
                    {cond}
                  </Text>
                  {condition === cond && <Check size={18} color="#033a7d" />}
                </TouchableOpacity>
              ))}
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
    backgroundColor: "#f8fafc",
  },
  safeAreaDark: {
    backgroundColor: "#010f22",
  },
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
  topBarDark: {
    backgroundColor: "#011936",
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
    gap: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#eff5fb",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  redBadgeDot: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#ba1a1a",
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#011936",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  backLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  backLinkText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#033a7d",
  },
  pageHeader: {
    gap: 4,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.3,
  },
  pageTitleDark: {
    color: "#f8fafc",
  },
  pageSubtitle: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 18,
  },
  itemTypeSection: {
    gap: 10,
  },
  sectionHeadingTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  sectionHeadingTitleDark: {
    color: "#f8fafc",
  },
  itemTypeCardsCol: {
    gap: 8,
  },
  itemTypeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  itemTypeCardDark: {
    backgroundColor: "#03142e",
    borderColor: "#1e293b",
  },
  itemTypeCardActive: {
    borderColor: "#033a7d",
    backgroundColor: "#f2f7fd",
  },
  typeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  typeTextCol: {
    flex: 1,
  },
  typeCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  typeCardTitleDark: {
    color: "#f8fafc",
  },
  typeCardSub: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 14,
  },
  sectionCardDark: {
    backgroundColor: "#03142e",
    borderColor: "#1e293b",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionBarIndicator: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: "#033a7d",
    marginRight: 8,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
  },
  sectionHeadingDark: {
    color: "#f8fafc",
  },
  sectionSubtext: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  inputDark: {
    backgroundColor: "#020d1c",
    borderColor: "#334155",
    color: "#f8fafc",
  },
  twoColRow: {
    flexDirection: "row",
    gap: 10,
  },
  col: {
    flex: 1,
    gap: 6,
  },
  dropdownPickerBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
  },
  dropdownPickerBoxDark: {
    backgroundColor: "#020d1c",
    borderColor: "#334155",
  },
  dropdownPickerText: {
    fontSize: 13,
    color: "#0f172a",
    fontWeight: "500",
    flex: 1,
    marginRight: 4,
  },
  dropdownPickerTextDark: {
    color: "#f8fafc",
  },
  iconInputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    backgroundColor: "#ffffff",
  },
  iconInputBoxDark: {
    backgroundColor: "#020d1c",
    borderColor: "#334155",
  },
  iconInputField: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 13,
    color: "#0f172a",
  },
  iconInputFieldDark: {
    color: "#f8fafc",
  },
  rupeePrefix: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748b",
    marginLeft: 12,
  },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    padding: 3,
    backgroundColor: "#ffffff",
  },
  stepperContainerDark: {
    backgroundColor: "#020d1c",
    borderColor: "#334155",
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: "#eff5fb",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValueText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  stepperValueTextDark: {
    color: "#f8fafc",
  },
  priceHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  priceTargetSubtitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#0f172a",
    backgroundColor: "#ffffff",
    minHeight: 88,
  },
  textAreaDark: {
    backgroundColor: "#020d1c",
    borderColor: "#334155",
    color: "#f8fafc",
  },
  dashedUploadBox: {
    backgroundColor: "#eff5fb",
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#bfdbfe",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 6,
  },
  dashedUploadBoxDark: {
    backgroundColor: "#021533",
    borderColor: "#1e40af",
  },
  cloudIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#dbeaf7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  uploadBoxTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#033a7d",
  },
  uploadBoxSub: {
    fontSize: 12,
    color: "#64748b",
  },
  thumbnailsContainer: {
    gap: 10,
    marginTop: 4,
  },
  thumbnailsRow: {
    gap: 10,
    alignItems: "center",
  },
  thumbnailWrapper: {
    width: 82,
    height: 82,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  primaryBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  primaryBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#ffffff",
  },
  removePhotoBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  addMoreSquircle: {
    width: 82,
    height: 82,
    borderRadius: 8,
    backgroundColor: "#eff5fb",
    borderWidth: 1,
    borderColor: "#dbeaf7",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  addMoreText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#033a7d",
  },
  verifiedPhotosLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  verifiedPhotosText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#15803d",
  },
  darkNavyCard: {
    backgroundColor: "#01142f",
    borderRadius: 14,
    padding: 18,
    gap: 14,
  },
  darkCardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  darkCardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
  },
  darkCardSubtitle: {
    fontSize: 12,
    color: "#94a3b8",
    lineHeight: 17,
  },
  darkCardLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff",
  },
  darkCardInputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  darkCardInputField: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#0f172a",
  },
  darkCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 4,
  },
  darkCardFooterText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fdc836",
  },
  submitButton: {
    backgroundColor: "#fbc634",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginTop: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  reassuranceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 4,
  },
  reassuranceText: {
    flex: 1,
    fontSize: 12,
    color: "#475569",
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContentCard: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 18,
    gap: 12,
  },
  modalContentCardDark: {
    backgroundColor: "#011936",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  modalTitleDark: {
    color: "#f8fafc",
  },
  modalItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalItemRowSelected: {
    backgroundColor: "#eff5fb",
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  modalItemText: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "500",
  },
  modalItemTextSelected: {
    color: "#033a7d",
    fontWeight: "700",
  },
  authRequiredContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 14,
  },
  authLockCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#eff5fb",
    alignItems: "center",
    justifyContent: "center",
  },
  authTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
  },
  authTitleDark: {
    color: "#f8fafc",
  },
  authSubtitle: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 320,
  },
  signInButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#033a7d",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  signInButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
  successContainer: {
    padding: 24,
    alignItems: "center",
    gap: 14,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#fef3c7",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#fef3c7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  pendingBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#b45309",
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
  },
  successTitleDark: {
    color: "#f8fafc",
  },
  successSubtitle: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
  },
  successInfoCard: {
    backgroundColor: "#eff5fb",
    borderRadius: 12,
    padding: 16,
    gap: 12,
    width: "100%",
    marginTop: 6,
  },
  successInfoCardDark: {
    backgroundColor: "#03142e",
  },
  successInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  successInfoText: {
    flex: 1,
    fontSize: 13,
    color: "#1e293b",
    lineHeight: 18,
  },
  successActionCol: {
    width: "100%",
    gap: 10,
    marginTop: 14,
  },
  goToMarketplaceBtn: {
    backgroundColor: "#033a7d",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  goToMarketplaceBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
  postAnotherBtn: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  postAnotherBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
});
