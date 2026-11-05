import { useColorScheme } from "@/hooks/use-color-scheme";
import React, { useState, useEffect, useRef } from "react";
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
  Platform,
  StatusBar,
  Linking,
  Modal,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { prepareImageForUpload, type PickedImage } from "@/lib/upload-image";
import * as DocumentPicker from "expo-document-picker";
import { uploadDocument } from "@/lib/upload-document";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { EscrowPolicyModal } from "@/components/EscrowPolicyModal";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { saveSellDraft, getSellDraft, clearSellDraft } from "@/lib/storage";

import Upload from "lucide-react-native/icons/upload";
import FileText from "lucide-react-native/icons/file-text";
import X from "lucide-react-native/icons/x";
import Lock from "lucide-react-native/icons/lock";
import Phone from "lucide-react-native/icons/phone";
import Building2 from "lucide-react-native/icons/building-complex";
import ArrowRight from "lucide-react-native/icons/arrow-right";
import Eye from "lucide-react-native/icons/eye";
import * as WebBrowser from "expo-web-browser";
import ArrowLeft from "lucide-react-native/icons/arrow-left";
import Clock from "lucide-react-native/icons/clock";
import CheckCircle2 from "lucide-react-native/icons/circle-check";
import Bell from "lucide-react-native/icons/bell";
import Sparkles from "lucide-react-native/icons/sparkles";
import Wrench from "lucide-react-native/icons/wrench";
import Microscope from "lucide-react-native/icons/microscope";
import MapPin from "lucide-react-native/icons/map-pin";
import ChevronDown from "lucide-react-native/icons/chevron-down";
import Plus from "lucide-react-native/icons/plus";
import Minus from "lucide-react-native/icons/minus";
import Camera from "lucide-react-native/icons/camera";
import ShieldCheck from "lucide-react-native/icons/shield-check";
import Check from "lucide-react-native/icons/check";
import Tag from "lucide-react-native/icons/tag";

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

const STEP_TITLES = {
  1: "STEP 1 OF 4 · BASICS",
  2: "STEP 2 OF 4 · PHOTOS",
  3: "STEP 3 OF 4 · PRICING & LOCATION",
  4: "STEP 4 OF 4 · REVIEW & CONTACT",
};

export default function SellScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { edit, type, duplicate } = useLocalSearchParams<{ edit?: string; type?: string; duplicate?: string }>();
  const isEditMode = !!edit;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();

  // Wizard Step (1: Basics, 2: Photos, 3: Pricing & Location, 4: Review & Contact)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Escrow Policy Modal
  const [escrowModalVisible, setEscrowModalVisible] = useState(false);

  // Fetch unread notifications count
  const { data: notificationsData } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await api.get("/api/notifications");
      return res.data as { notifications: any[]; unreadCount: number };
    },
    enabled: isAuthenticated,
    staleTime: 30000,
  });
  const unreadCount = notificationsData?.unreadCount || 0;

  // Form Fields - Start empty by default (as recommended by UX audit)
  const [itemType, setItemType] = useState<"MACHINE" | "NEW_INSTRUMENT" | "SPARE_PART">("MACHINE");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [compatibleWith, setCompatibleWith] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [location, setLocation] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [isPriceOnRequest, setIsPriceOnRequest] = useState(false);
  const [quantity, setQuantity] = useState("1");
  const [description, setDescription] = useState("");

  // Photos
  const [photos, setPhotos] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // PDF Documents
  const [documents, setDocuments] = useState<string[]>([]);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);

  // Private Contact Details
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [companyName, setCompanyName] = useState(user?.companyName || "");

  // Category Dropdown Modal
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);

  // Draft Autosave state
  const [isDraftSaved, setIsDraftSaved] = useState(false);
  const draftSaveTimeoutRef = useRef<any>(null);

  // Submission & Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  const [submittedData, setSubmittedData] = useState<{ id: string; title: string; itemType: string } | null>(null);

  // Field validation errors
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});

  // Prefill contact details from the profile when it loads
  useEffect(() => {
    if (user) {
      if (user.phoneNumber && !phoneNumber) setPhoneNumber(user.phoneNumber);
      if (user.companyName && !companyName) setCompanyName(user.companyName);
    }
  }, [user]);

  // Load listing for edit or duplicate mode
  useEffect(() => {
    const listingIdToLoad = edit || duplicate;
    if (!listingIdToLoad) return;
    let isMounted = true;
    async function fetchListingData() {
      setIsLoadingEdit(true);
      try {
        const res = await api.get(`/api/listings/${listingIdToLoad}`);
        const listing = res.data?.listing;
        if (listing && isMounted) {
          setTitle(duplicate ? `${listing.title} (Copy)` : listing.title || "");
          setCategory(listing.category || "");
          if (listing.itemType) setItemType(listing.itemType);
          if (listing.condition) setCondition(listing.condition);
          setLocation(listing.location || "");
          if (listing.minPrice === 0 && listing.maxPrice === 0) {
            setIsPriceOnRequest(true);
            setMinPrice("");
            setMaxPrice("");
          } else {
            setIsPriceOnRequest(false);
            setMinPrice(listing.minPrice !== undefined && listing.minPrice !== null ? String(listing.minPrice) : "");
            setMaxPrice(listing.maxPrice !== undefined && listing.maxPrice !== null ? String(listing.maxPrice) : "");
          }
          setQuantity(listing.quantity ? String(listing.quantity) : "1");
          setDescription(listing.description || "");
          setPhotos(listing.photos || []);
          setDocuments(listing.documents || []);
          if (listing.partNumber) setPartNumber(listing.partNumber);
          if (listing.compatibleWith) setCompatibleWith(listing.compatibleWith);
        }
      } catch (err: any) {
        console.error("Failed to load listing details:", err);
        Alert.alert("Error", "Could not load listing details.");
      } finally {
        if (isMounted) setIsLoadingEdit(false);
      }
    }
    fetchListingData();
    return () => {
      isMounted = false;
    };
  }, [edit, duplicate]);

  // Restore draft on mount if not editing or duplicating
  useEffect(() => {
    if (isEditMode || duplicate) return;
    getSellDraft().then((draft) => {
      if (draft && !edit && !duplicate) {
        if (draft.itemType) setItemType(draft.itemType);
        if (draft.title) setTitle(draft.title);
        if (draft.category) setCategory(draft.category);
        if (draft.condition) setCondition(draft.condition);
        if (draft.compatibleWith) setCompatibleWith(draft.compatibleWith);
        if (draft.partNumber) setPartNumber(draft.partNumber);
        if (draft.location) setLocation(draft.location);
        if (draft.minPrice) setMinPrice(draft.minPrice);
        if (draft.maxPrice) setMaxPrice(draft.maxPrice);
        if (draft.isPriceOnRequest !== undefined) setIsPriceOnRequest(draft.isPriceOnRequest);
        if (draft.quantity) setQuantity(draft.quantity);
        if (draft.description) setDescription(draft.description);
        if (draft.photos && Array.isArray(draft.photos)) setPhotos(draft.photos);
        if (draft.documents && Array.isArray(draft.documents)) setDocuments(draft.documents);
        if (draft.phoneNumber) setPhoneNumber(draft.phoneNumber);
        if (draft.companyName) setCompanyName(draft.companyName);
        if (draft.currentStep && draft.currentStep >= 1 && draft.currentStep <= 4) {
          setCurrentStep(draft.currentStep);
        }
        setIsDraftSaved(true);
      }
    });
  }, [isEditMode, edit, duplicate]);

  // Autosave draft on any field change
  useEffect(() => {
    if (isEditMode || duplicate || submittedData) return;
    if (!title && !category && !condition && photos.length === 0 && !description) return;

    if (draftSaveTimeoutRef.current) clearTimeout(draftSaveTimeoutRef.current);
    draftSaveTimeoutRef.current = setTimeout(async () => {
      await saveSellDraft({
        itemType,
        title,
        category,
        condition,
        compatibleWith,
        partNumber,
        location,
        minPrice,
        maxPrice,
        isPriceOnRequest,
        quantity,
        description,
        photos,
        documents,
        phoneNumber,
        companyName,
        currentStep,
      });
      setIsDraftSaved(true);
    }, 600);

    return () => {
      if (draftSaveTimeoutRef.current) clearTimeout(draftSaveTimeoutRef.current);
    };
  }, [
    isEditMode,
    duplicate,
    submittedData,
    itemType,
    title,
    category,
    condition,
    compatibleWith,
    partNumber,
    location,
    minPrice,
    maxPrice,
    isPriceOnRequest,
    quantity,
    description,
    photos,
    documents,
    phoneNumber,
    companyName,
    currentStep,
  ]);

  const handleItemTypeChange = (nextType: "MACHINE" | "NEW_INSTRUMENT" | "SPARE_PART") => {
    setItemType(nextType);
    setCondition(""); // Keep empty so seller actively selects
    if (nextType === "SPARE_PART" && !category) {
      setCategory("Spare Parts & Consumables");
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
    if (q > 1) setQuantity(String(q - 1));
  };

  const handleQuantityPlus = () => {
    const q = parseInt(quantity, 10) || 1;
    setQuantity(String(q + 1));
  };

  // Photo uploading handlers
  const uploadImage = async (image: PickedImage): Promise<string | null> => {
    const uri = await prepareImageForUpload(image);
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

    return res.data?.url || null;
  };

  const uploadImages = async (images: PickedImage[]) => {
    const CONCURRENCY = 3;
    const results: (string | null | undefined)[] = new Array(images.length).fill(undefined);
    let nextToStart = 0;
    let nextToAdd = 0;
    let firstError: any = null;

    const addFinishedInOrder = () => {
      const ready: string[] = [];
      while (nextToAdd < images.length && results[nextToAdd] !== undefined) {
        const url = results[nextToAdd++];
        if (url) ready.push(url);
      }
      if (ready.length > 0) setPhotos((prev) => [...prev, ...ready]);
    };

    const worker = async () => {
      while (nextToStart < images.length) {
        const index = nextToStart++;
        try {
          results[index] = await uploadImage(images[index]);
        } catch (error: any) {
          console.error("Upload error:", error);
          firstError = firstError ?? error;
          results[index] = null;
        }
        addFinishedInOrder();
      }
    };

    setIsUploadingPhoto(true);
    try {
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, images.length) }, worker));
    } finally {
      setIsUploadingPhoto(false);
    }

    if (firstError) {
      Alert.alert("Upload Failed", firstError.response?.data?.error || "Could not upload photo.");
    }
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "Please allow photo library access to upload photos.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 10 - photos.length,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadImages(result.assets);
      }
    } catch (err) {
      console.error("Image pick error:", err);
      Alert.alert("Error", "Could not pick image.");
    }
  };

  const takePhotoWithCamera = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "Please allow camera access to take benchmark photos.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: false });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadImages(result.assets);
      }
    } catch (err) {
      console.error("Camera capture error:", err);
      Alert.alert("Error", "Could not capture photo.");
    }
  };

  const handleSelectPhotoOption = () => {
    if (photos.length >= 10) {
      Alert.alert("Limit Reached", "A maximum of 10 photos is allowed per listing.");
      return;
    }
    Alert.alert("Add Equipment Photos", "Take live photos or select from your gallery", [
      { text: "Take Photo (Camera)", onPress: takePhotoWithCamera },
      { text: "Choose from Gallery", onPress: pickImage },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePickDocument = async () => {
    if (documents.length >= 5) {
      Alert.alert("Limit Reached", "A maximum of 5 documents can be attached per listing.");
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const asset = result.assets[0];
      if (asset.size && asset.size > 10 * 1024 * 1024) {
        Alert.alert("File Too Large", "PDF document must be under 10MB.");
        return;
      }

      setIsUploadingDocument(true);
      const url = await uploadDocument(asset);
      if (url) {
        setDocuments((prev) => [...prev, url]);
      }
    } catch (err: any) {
      console.error("Document upload error:", err);
      Alert.alert(
        "Upload Failed",
        err?.response?.data?.error || "Could not upload document. Please ensure it is a valid PDF under 10MB."
      );
    } finally {
      setIsUploadingDocument(false);
    }
  };

  const removeDocument = (index: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  // Step Validation & Navigation
  const handleStep1Next = () => {
    const errors: Record<string, string> = {};
    if (!title.trim() || title.trim().length < 3) {
      errors.title = "Please enter an equipment title of at least 3 characters.";
    }
    if (!category.trim()) {
      errors.category = "Please select an instrument category.";
    }
    if (!condition.trim()) {
      errors.condition = "Please select the condition of your equipment.";
    }
    setStepErrors(errors);
    if (Object.keys(errors).length === 0) {
      setCurrentStep(2);
    }
  };

  const handleStep2Next = () => {
    const errors: Record<string, string> = {};
    if (photos.length === 0) {
      errors.photos = "Please add at least 1 photo of your equipment.";
    }
    setStepErrors(errors);
    if (Object.keys(errors).length === 0) {
      setCurrentStep(3);
    }
  };

  const handleStep3Next = () => {
    const errors: Record<string, string> = {};
    if (!isPriceOnRequest) {
      if (!minPrice.trim() || !maxPrice.trim()) {
        errors.price = "Enter both a minimum and maximum price, or choose 'Price on request'.";
      } else {
        const min = parseFloat(minPrice.replace(/[^0-9.]/g, ""));
        const max = parseFloat(maxPrice.replace(/[^0-9.]/g, ""));
        if (isNaN(min) || isNaN(max)) {
          errors.price = "Enter valid price numbers.";
        } else if (min > max) {
          errors.price = "Minimum price cannot be greater than maximum price.";
        }
      }
    }
    if (!location.trim() || location.trim().length < 2) {
      errors.location = "Please enter facility location or city.";
    }
    if (!description.trim() || description.trim().length < 10) {
      errors.description = "Provide at least 10 characters describing the instrument.";
    }
    setStepErrors(errors);
    if (Object.keys(errors).length === 0) {
      setCurrentStep(4);
    }
  };

  const handlePrevStep = () => {
    setStepErrors({});
    if (currentStep === 4) setCurrentStep(3);
    else if (currentStep === 3) setCurrentStep(2);
    else if (currentStep === 2) setCurrentStep(1);
  };

  const handleCloseOrReset = () => {
    if (title || photos.length > 0 || description) {
      Alert.alert(
        "Discard listing draft?",
        "You have unsaved changes. Discarding will clear your draft.",
        [
          { text: "Keep Editing", style: "cancel" },
          {
            text: "Discard Draft",
            style: "destructive",
            onPress: async () => {
              await clearSellDraft();
              setTitle("");
              setCategory("");
              setCondition("");
              setPhotos([]);
              setDocuments([]);
              setDescription("");
              setMinPrice("");
              setMaxPrice("");
              setIsPriceOnRequest(false);
              setLocation("");
              setPartNumber("");
              setCompatibleWith("");
              setCurrentStep(1);
              setIsDraftSaved(false);
              if (isEditMode) router.back();
            },
          },
        ]
      );
    } else {
      if (isEditMode) router.back();
    }
  };

  const handleSubmit = async () => {
    if (!phoneNumber.trim()) {
      setStepErrors({ phone: "Enter your mobile / WhatsApp number for deal notifications." });
      return;
    }

    setIsSubmitting(true);
    try {
      const minPriceVal = isPriceOnRequest ? 0 : parseFloat(minPrice.replace(/[^0-9.]/g, ""));
      const maxPriceVal = isPriceOnRequest ? 0 : parseFloat(maxPrice.replace(/[^0-9.]/g, ""));

      const payload: any = {
        title: title.trim(),
        category,
        itemType,
        condition,
        location: location.trim() || undefined,
        minPrice: minPriceVal,
        maxPrice: maxPriceVal,
        quantity: Math.max(1, parseInt(quantity, 10) || 1),
        description: description.trim(),
        photos,
        documents,
        phoneNumber: phoneNumber.trim(),
        companyName: companyName.trim() || undefined,
      };

      if (itemType === "SPARE_PART") {
        if (partNumber.trim()) payload.partNumber = partNumber.trim();
        if (compatibleWith.trim()) payload.compatibleWith = compatibleWith.trim();
      }

      if (isEditMode) {
        await api.patch(`/api/listings/${edit}`, payload);
        await queryClient.invalidateQueries({ queryKey: ["myItems"] });
        await queryClient.invalidateQueries({ queryKey: ["listings"] });
        await clearSellDraft();
        setIsSubmitting(false);
        Alert.alert("Listing Updated", "Your equipment changes have been saved.", [
          {
            text: "Done",
            onPress: () => router.push("/(tabs)/profile" as any),
          },
        ]);
        return;
      }

      const res = await api.post("/api/listings", payload);
      await queryClient.invalidateQueries({ queryKey: ["myItems"] });
      await queryClient.invalidateQueries({ queryKey: ["listings"] });
      await clearSellDraft();
      setIsDraftSaved(false);

      setSubmittedData({
        id: res.data?.listingId || "success",
        title: title.trim(),
        itemType,
      });
    } catch (error: any) {
      console.error("Submit error:", error);
      Alert.alert(
        "Submission Failed",
        error.response?.data?.error || "Could not submit listing. Please check your inputs."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auth Guard
  if (!isAuthenticated) {
    return (
      <SafeAreaView edges={["top"]} style={[styles.safeArea, isDark && styles.safeAreaDark]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={styles.topBar}>
          <Image source={require("@/assets/images/logo.png")} style={styles.logoImg} resizeMode="contain" />
        </View>

        <View style={styles.authRequiredContainer}>
          <View style={styles.authLockCircle}>
            <Lock size={36} color="#033a7d" />
          </View>
          <Text style={[styles.authTitle, isDark && styles.authTitleDark]}>
            Sign In Required to List Items
          </Text>
          <Text style={styles.authSubtitle}>
            Please sign in with your LabMatrix account or register your laboratory facility to list instruments and spare parts.
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

  // Submitted Confirmation Screen
  if (submittedData) {
    return (
      <SafeAreaView edges={["top"]} style={[styles.safeArea, isDark && styles.safeAreaDark]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={styles.topBar}>
          <Image source={require("@/assets/images/logo.png")} style={styles.logoImg} resizeMode="contain" />
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
            Your listing for <Text style={{ fontWeight: "800", color: "#0f172a" }}>&quot;{submittedData.title}&quot;</Text> has been created and sent to our admin team for verification.
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
                setCategory("");
                setCondition("");
                setDescription("");
                setMinPrice("");
                setMaxPrice("");
                setIsPriceOnRequest(false);
                setPhotos([]);
              setDocuments([]);
                setPartNumber("");
                setCompatibleWith("");
                setCurrentStep(1);
              }}
            >
              <Text style={styles.postAnotherBtnText}>List Another Item</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={[styles.safeArea, isDark && styles.safeAreaDark]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* 1. Direction A Wizard Header */}
      <View style={[styles.wizardHeader, isDark && styles.wizardHeaderDark]}>
        <View style={styles.wizardTopRow}>
          <TouchableOpacity
            style={styles.wizardNavBtn}
            onPress={currentStep > 1 ? handlePrevStep : handleCloseOrReset}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {currentStep > 1 ? (
              <ArrowLeft size={20} color={isDark ? "#f8fafc" : "#0f172a"} />
            ) : (
              <X size={20} color={isDark ? "#94a3b8" : "#475569"} />
            )}
          </TouchableOpacity>

          <Text style={[styles.wizardHeaderTitle, isDark && styles.wizardHeaderTitleDark]}>
            {isEditMode ? "Edit Listing" : duplicate ? "Duplicate Listing" : "New Listing"}
          </Text>

          <View style={styles.draftBadgeContainer}>
            {isDraftSaved && !isEditMode && !duplicate ? (
              <View style={styles.draftBadge}>
                <Check size={11} color="#15803d" strokeWidth={3} />
                <Text style={styles.draftBadgeText}>Draft saved</Text>
              </View>
            ) : (
              <View style={{ width: 70 }} />
            )}
          </View>
        </View>

        {/* 4 Step Progress Indicators */}
        <View style={styles.progressBarRow}>
          {[1, 2, 3, 4].map((step) => (
            <View
              key={step}
              style={[
                styles.progressBarSegment,
                step <= currentStep && styles.progressBarSegmentActive,
              ]}
            />
          ))}
        </View>

        <Text style={styles.stepSubtitleText}>{STEP_TITLES[currentStep]}</Text>
      </View>

      {/* Form Content per Step */}
      {isLoadingEdit ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#033a7d" />
          <Text style={styles.loadingText}>Loading listing specifications...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollFlex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* STEP 1: BASICS */}
          {currentStep === 1 && (
            <View style={styles.stepContainer}>
              {/* Item Type 3-card Row */}
              <View style={styles.fieldBlock}>
                <Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>
                  What are you listing? <Text style={{ color: "#ba1a1a" }}>*</Text>
                </Text>
                <View style={styles.itemTypeRow}>
                  <TouchableOpacity
                    style={[
                      styles.itemTypePill,
                      itemType === "MACHINE" && styles.itemTypePillActive,
                      isDark && styles.itemTypePillDark,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => handleItemTypeChange("MACHINE")}
                  >
                    <Text
                      style={[
                        styles.itemTypePillText,
                        itemType === "MACHINE" && styles.itemTypePillTextActive,
                        isDark && styles.itemTypePillTextDark,
                      ]}
                    >
                      Pre-owned machine
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.itemTypePill,
                      itemType === "NEW_INSTRUMENT" && styles.itemTypePillActive,
                      isDark && styles.itemTypePillDark,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => handleItemTypeChange("NEW_INSTRUMENT")}
                  >
                    <Text
                      style={[
                        styles.itemTypePillText,
                        itemType === "NEW_INSTRUMENT" && styles.itemTypePillTextActive,
                        isDark && styles.itemTypePillTextDark,
                      ]}
                    >
                      Brand new
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.itemTypePill,
                      itemType === "SPARE_PART" && styles.itemTypePillActive,
                      isDark && styles.itemTypePillDark,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => handleItemTypeChange("SPARE_PART")}
                  >
                    <Text
                      style={[
                        styles.itemTypePillText,
                        itemType === "SPARE_PART" && styles.itemTypePillTextActive,
                        isDark && styles.itemTypePillTextDark,
                      ]}
                    >
                      Spare part
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Title & Model */}
              <View style={styles.fieldBlock}>
                <Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>
                  {itemType === "SPARE_PART" ? "Part Title & OEM Model" : "Instrument Name & Model"}{" "}
                  <Text style={{ color: "#ba1a1a" }}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    isDark && styles.textInputDark,
                    stepErrors.title && styles.textInputError,
                  ]}
                  placeholder={
                    itemType === "SPARE_PART"
                      ? "e.g. Deuterium Lamp for Agilent 1100/1200 DAD"
                      : "e.g. Agilent 1260 Infinity II Quaternary LC"
                  }
                  placeholderTextColor="#94a3b8"
                  value={title}
                  onChangeText={(val) => {
                    setTitle(val);
                    if (stepErrors.title) setStepErrors((prev) => ({ ...prev, title: "" }));
                  }}
                />
                {stepErrors.title ? <Text style={styles.errorText}>{stepErrors.title}</Text> : null}
              </View>

              {/* Category Dropdown Picker */}
              <View style={styles.fieldBlock}>
                <Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>
                  Category <Text style={{ color: "#ba1a1a" }}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[
                    styles.selectorCard,
                    isDark && styles.selectorCardDark,
                    stepErrors.category && styles.textInputError,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setIsCategoryModalVisible(true)}
                >
                  <Text
                    style={[
                      styles.selectorCardText,
                      !category && styles.selectorCardPlaceholder,
                      isDark && styles.selectorCardTextDark,
                    ]}
                  >
                    {category || "Select category"}
                  </Text>
                  <ChevronDown size={18} color="#64748b" />
                </TouchableOpacity>
                {stepErrors.category ? <Text style={styles.errorText}>{stepErrors.category}</Text> : null}
              </View>

              {/* Condition Options Radio List */}
              <View style={styles.fieldBlock}>
                <Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>
                  Condition <Text style={{ color: "#ba1a1a" }}>*</Text>
                </Text>
                <View style={styles.conditionOptionsCol}>
                  {currentConditions.map((cond) => {
                    const isSelected = condition === cond;
                    return (
                      <TouchableOpacity
                        key={cond}
                        style={[
                          styles.conditionRadioCard,
                          isSelected && styles.conditionRadioCardActive,
                          isDark && styles.conditionRadioCardDark,
                        ]}
                        activeOpacity={0.8}
                        onPress={() => {
                          setCondition(cond);
                          if (stepErrors.condition) setStepErrors((prev) => ({ ...prev, condition: "" }));
                        }}
                      >
                        <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                          {isSelected && <View style={styles.radioDot} />}
                        </View>
                        <Text
                          style={[
                            styles.conditionRadioText,
                            isSelected && styles.conditionRadioTextActive,
                            isDark && styles.conditionRadioTextDark,
                          ]}
                        >
                          {cond}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {stepErrors.condition ? <Text style={styles.errorText}>{stepErrors.condition}</Text> : null}
              </View>

              {/* Spare Part Specific Fields */}
              {itemType === "SPARE_PART" && (
                <>
                  <View style={styles.fieldBlock}>
                    <Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>
                      Part Number / Catalog No.
                    </Text>
                    <TextInput
                      style={[styles.textInput, isDark && styles.textInputDark]}
                      placeholder="e.g. 2140-0590, G1315-60012"
                      placeholderTextColor="#94a3b8"
                      value={partNumber}
                      onChangeText={setPartNumber}
                    />
                  </View>

                  <View style={styles.fieldBlock}>
                    <Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>
                      Compatible Instrument Model
                    </Text>
                    <TextInput
                      style={[styles.textInput, isDark && styles.textInputDark]}
                      placeholder="e.g. Agilent 1100 / 1200 / 1260 Series"
                      placeholderTextColor="#94a3b8"
                      value={compatibleWith}
                      onChangeText={setCompatibleWith}
                    />
                  </View>

                  <View style={styles.fieldBlock}>
                    <Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>
                      Available Quantity in Stock
                    </Text>
                    <View style={styles.stepperRow}>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={handleQuantityMinus}
                        activeOpacity={0.7}
                      >
                        <Minus size={18} color="#0f172a" />
                      </TouchableOpacity>
                      <Text style={[styles.stepperValueText, isDark && styles.fieldLabelDark]}>
                        {quantity}
                      </Text>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={handleQuantityPlus}
                        activeOpacity={0.7}
                      >
                        <Plus size={18} color="#0f172a" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}
            </View>
          )}

          {/* STEP 2: PHOTOS */}
          {currentStep === 2 && (
            <View style={styles.stepContainer}>
              <View style={styles.photosHeaderRow}>
                <View>
                  <Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>
                    Equipment Photos <Text style={{ color: "#ba1a1a" }}>*</Text>
                  </Text>
                  <Text style={styles.photosSubHint}>
                    The first photo is your listing cover. Add nameplate & module photos for faster buyer quotes.
                  </Text>
                </View>
                <View style={styles.photoCountBadge}>
                  <Text style={styles.photoCountBadgeText}>{photos.length} / 10</Text>
                </View>
              </View>

              {/* Photo Upload Slots Grid */}
              <View style={styles.photoGrid}>
                {photos.map((photoUrl, index) => (
                  <View key={index} style={styles.photoSlot}>
                    <Image source={{ uri: photoUrl }} style={styles.uploadedPhotoImg} resizeMode="cover" />
                    {index === 0 && (
                      <View style={styles.coverBadge}>
                        <Text style={styles.coverBadgeText}>COVER</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.removePhotoBtn}
                      activeOpacity={0.8}
                      onPress={() => removePhoto(index)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <X size={12} color="#ffffff" strokeWidth={3} />
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Next available slot prompts */}
                {photos.length < 10 && (
                  <TouchableOpacity
                    style={[styles.addSlotCard, isDark && styles.addSlotCardDark]}
                    activeOpacity={0.8}
                    onPress={handleSelectPhotoOption}
                    disabled={isUploadingPhoto}
                  >
                    {isUploadingPhoto ? (
                      <ActivityIndicator size="small" color="#033a7d" />
                    ) : (
                      <>
                        <Camera size={22} color="#033a7d" />
                        <Text style={styles.addSlotCardText}>
                          {photos.length === 0
                            ? "+ Cover Photo"
                            : photos.length === 1
                            ? "+ Nameplate"
                            : photos.length === 2
                            ? "+ Modules"
                            : "+ More Photos"}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {stepErrors.photos ? <Text style={styles.errorText}>{stepErrors.photos}</Text> : null}

              {/* Photo Upload Guidance Box */}
              <View style={[styles.guidanceCard, isDark && styles.guidanceCardDark]}>
                <ShieldCheck size={20} color="#033a7d" style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.guidanceCardTitle, isDark && styles.fieldLabelDark]}>
                    Engineering Review Tip
                  </Text>
                  <Text style={styles.guidanceCardText}>
                    Listings with clear photos of the serial number nameplate and detector modules receive quote inquiries 3x faster.
                  </Text>
                </View>
              </View>

              {/* Technical Documents (PDF) */}
              <View style={[styles.fieldCard, { marginTop: 14 }]}>
                <View style={styles.photosHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>
                      Technical Documents (PDF)
                    </Text>
                    <Text style={styles.photosSubHint}>
                      Attach specification sheets, calibration certificates, or user manuals (Optional, max 10MB per file).
                    </Text>
                  </View>
                  <View style={styles.photoCountBadge}>
                    <Text style={styles.photoCountBadgeText}>{documents.length} / 5</Text>
                  </View>
                </View>

                {/* Attached Document List */}
                {documents.map((docUrl, index) => {
                  const rawName = docUrl.split("/").pop()?.split("?")[0] || `Document_${index + 1}.pdf`;
                  const displayName = decodeURIComponent(rawName);
                  return (
                    <View key={index} style={styles.docRowItem}>
                      <View style={styles.docIconPill}>
                        <FileText size={16} color="#dc2626" />
                      </View>
                      <Text style={styles.docRowTitle} numberOfLines={1}>
                        {displayName}
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                        <TouchableOpacity
                          style={{ padding: 6 }}
                          onPress={async () => {
                            try {
                              const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(docUrl)}`;
                              await WebBrowser.openBrowserAsync(viewerUrl);
                            } catch {
                              Linking.openURL(docUrl);
                            }
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          accessibilityLabel="Preview document"
                        >
                          <Eye size={16} color="#033a7d" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.docRemoveBtn}
                          onPress={() => removeDocument(index)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <X size={15} color="#64748b" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}

                {/* Add Document Button */}
                {documents.length < 5 && (
                  <TouchableOpacity
                    style={[styles.addDocBtn, isUploadingDocument && { opacity: 0.6 }]}
                    onPress={handlePickDocument}
                    disabled={isUploadingDocument}
                    activeOpacity={0.8}
                  >
                    {isUploadingDocument ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <ActivityIndicator size="small" color="#033a7d" />
                        <Text style={styles.addDocBtnText}>Uploading document...</Text>
                      </View>
                    ) : (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <FileText size={16} color="#033a7d" />
                        <Text style={styles.addDocBtnText}>
                          {documents.length === 0 ? "+ Attach PDF Document" : "+ Add Another PDF"}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* STEP 3: PRICING & LOCATION */}
          {currentStep === 3 && (
            <View style={styles.stepContainer}>
              {/* Expected Price Box */}
              <View style={[styles.pricingCard, isDark && styles.pricingCardDark]}>
                <View style={styles.pricingCardHeader}>
                  <Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>Expected Price</Text>
                  <TouchableOpacity
                    style={styles.priceOnRequestToggle}
                    activeOpacity={0.8}
                    onPress={() => {
                      setIsPriceOnRequest((prev) => !prev);
                      if (stepErrors.price) setStepErrors((prev) => ({ ...prev, price: "" }));
                    }}
                  >
                    <Text style={styles.toggleLabel}>Show &quot;Price on request&quot;</Text>
                    <View
                      style={[
                        styles.toggleTrack,
                        isPriceOnRequest && styles.toggleTrackActive,
                      ]}
                    >
                      <View
                        style={[
                          styles.toggleThumb,
                          isPriceOnRequest && styles.toggleThumbActive,
                        ]}
                      />
                    </View>
                  </TouchableOpacity>
                </View>

                {!isPriceOnRequest ? (
                  <View style={styles.twoInputsRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputSubLabel}>Min Price (₹)</Text>
                      <TextInput
                        style={[
                          styles.textInput,
                          isDark && styles.textInputDark,
                          stepErrors.price && styles.textInputError,
                        ]}
                        placeholder="e.g. 850000"
                        placeholderTextColor="#94a3b8"
                        keyboardType="numeric"
                        value={minPrice}
                        onChangeText={(val) => {
                          setMinPrice(val);
                          if (stepErrors.price) setStepErrors((prev) => ({ ...prev, price: "" }));
                        }}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputSubLabel}>Max Price (₹)</Text>
                      <TextInput
                        style={[
                          styles.textInput,
                          isDark && styles.textInputDark,
                          stepErrors.price && styles.textInputError,
                        ]}
                        placeholder="e.g. 1000000"
                        placeholderTextColor="#94a3b8"
                        keyboardType="numeric"
                        value={maxPrice}
                        onChangeText={(val) => {
                          setMaxPrice(val);
                          if (stepErrors.price) setStepErrors((prev) => ({ ...prev, price: "" }));
                        }}
                      />
                    </View>
                  </View>
                ) : (
                  <View style={styles.priceOnRequestNotice}>
                    <Text style={styles.priceOnRequestNoticeText}>
                      ✓ Buyers will see &quot;Price on request&quot; and negotiate directly through verified proposals.
                    </Text>
                  </View>
                )}

                {stepErrors.price ? <Text style={styles.errorText}>{stepErrors.price}</Text> : null}
              </View>

              {/* Facility Location */}
              <View style={styles.fieldBlock}>
                <Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>
                  Facility Location / City <Text style={{ color: "#ba1a1a" }}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    isDark && styles.textInputDark,
                    stepErrors.location && styles.textInputError,
                  ]}
                  placeholder="e.g. Hyderabad, Telangana"
                  placeholderTextColor="#94a3b8"
                  value={location}
                  onChangeText={(val) => {
                    setLocation(val);
                    if (stepErrors.location) setStepErrors((prev) => ({ ...prev, location: "" }));
                  }}
                />
                {stepErrors.location ? <Text style={styles.errorText}>{stepErrors.location}</Text> : null}
              </View>

              {/* Technical Description */}
              <View style={styles.fieldBlock}>
                <View style={styles.descriptionHeaderRow}>
                  <Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>
                    Technical Description & Maintenance History <Text style={{ color: "#ba1a1a" }}>*</Text>
                  </Text>
                  <Text style={styles.charCountText}>
                    {description.trim().length} chars (min 10)
                  </Text>
                </View>
                <TextInput
                  style={[
                    styles.textAreaInput,
                    isDark && styles.textInputDark,
                    stepErrors.description && styles.textInputError,
                  ]}
                  placeholder="Describe operational status, installed modules, detector type, calibration history, and included accessories..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  value={description}
                  onChangeText={(val) => {
                    setDescription(val);
                    if (stepErrors.description) setStepErrors((prev) => ({ ...prev, description: "" }));
                  }}
                />
                {stepErrors.description ? (
                  <Text style={styles.errorText}>{stepErrors.description}</Text>
                ) : null}
              </View>
            </View>
          )}

          {/* STEP 4: REVIEW & CONTACT */}
          {currentStep === 4 && (
            <View style={styles.stepContainer}>
              <Text style={[styles.sectionHeadingTitle, isDark && styles.fieldLabelDark]}>
                Review Your Listing
              </Text>

              {/* Preview Card */}
              <View style={[styles.previewCard, isDark && styles.previewCardDark]}>
                <View style={styles.previewThumbContainer}>
                  {photos.length > 0 ? (
                    <Image source={{ uri: photos[0] }} style={styles.previewThumbImg} resizeMode="cover" />
                  ) : (
                    <View style={styles.previewThumbPlaceholder}>
                      <Tag size={24} color="#94a3b8" />
                    </View>
                  )}
                </View>
                <View style={styles.previewInfoCol}>
                  <View style={styles.previewBadgeRow}>
                    <View style={styles.previewPill}>
                      <Text style={styles.previewPillText}>{category || "Equipment"}</Text>
                    </View>
                    <Text style={styles.previewConditionText}>
                      {condition || "Pre-Owned"}
                    </Text>
                  </View>

                  <Text style={[styles.previewTitle, isDark && styles.fieldLabelDark]} numberOfLines={2}>
                    {title || "Untitled Equipment"}
                  </Text>

                  <Text style={styles.previewLocationText}>
                    <MapPin size={11} color="#64748b" /> {location || "India"}
                  </Text>

                  <Text style={styles.previewPriceText}>
                    {isPriceOnRequest
                      ? "Price on request"
                      : minPrice && maxPrice
                      ? `₹${parseFloat(minPrice).toLocaleString("en-IN")} - ₹${parseFloat(maxPrice).toLocaleString("en-IN")}`
                      : minPrice
                      ? `₹${parseFloat(minPrice).toLocaleString("en-IN")}`
                      : "Price on request"}
                  </Text>
                </View>
              </View>

              {/* Verified Seller Contact Box */}
              <View style={[styles.contactCard, isDark && styles.contactCardDark]}>
                <Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>
                  Private Contact Information
                </Text>
                <Text style={styles.contactNoticeText}>
                  The buyer never sees your phone number or email. All proposals are verified by LabMatrix engineers before introduction.
                </Text>

                <View style={{ marginTop: 10 }}>
                  <Text style={styles.inputSubLabel}>WhatsApp / Mobile Phone *</Text>
                  <TextInput
                    style={[styles.textInput, isDark && styles.textInputDark, stepErrors.phone && styles.textInputError]}
                    placeholder="+91 98765 43210"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                    value={phoneNumber}
                    onChangeText={(val) => {
                      setPhoneNumber(val);
                      if (stepErrors.phone) setStepErrors((prev) => ({ ...prev, phone: "" }));
                    }}
                  />
                  {stepErrors.phone ? <Text style={styles.errorText}>{stepErrors.phone}</Text> : null}
                </View>

                <View style={{ marginTop: 10 }}>
                  <Text style={styles.inputSubLabel}>Facility / Laboratory Name (Optional)</Text>
                  <TextInput
                    style={[styles.textInput, isDark && styles.textInputDark]}
                    placeholder="e.g. Apex Pharma Labs Ltd."
                    placeholderTextColor="#94a3b8"
                    value={companyName}
                    onChangeText={setCompanyName}
                  />
                </View>
              </View>

              {/* Escrow Guarantee Policy */}
              <TouchableOpacity
                style={styles.escrowLinkCard}
                activeOpacity={0.8}
                onPress={() => setEscrowModalVisible(true)}
              >
                <ShieldCheck size={20} color="#15803d" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.escrowLinkTitle}>Protected by LabMatrix Escrow Protocol</Text>
                  <Text style={styles.escrowLinkSub}>
                    Payout is securely released to you once technical inspection and delivery are accepted.
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* Direction A Fixed Bottom Action Bar */}
      <View style={[styles.bottomActionBar, { paddingBottom: Math.max(insets.bottom + 10, 16) }]}>
        {currentStep === 1 ? (
          <TouchableOpacity
            style={styles.fullWidthNextBtn}
            activeOpacity={0.85}
            onPress={handleStep1Next}
          >
            <Text style={styles.fullWidthNextBtnText}>Continue to photos</Text>
          </TouchableOpacity>
        ) : currentStep === 2 ? (
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity style={styles.actionBackBtn} activeOpacity={0.8} onPress={handlePrevStep}>
              <Text style={styles.actionBackBtnText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionNextBtn} activeOpacity={0.85} onPress={handleStep2Next}>
              <Text style={styles.actionNextBtnText}>Continue to pricing</Text>
            </TouchableOpacity>
          </View>
        ) : currentStep === 3 ? (
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity style={styles.actionBackBtn} activeOpacity={0.8} onPress={handlePrevStep}>
              <Text style={styles.actionBackBtnText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionNextBtn} activeOpacity={0.85} onPress={handleStep3Next}>
              <Text style={styles.actionNextBtnText}>Review listing</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity style={styles.actionBackBtn} activeOpacity={0.8} onPress={handlePrevStep}>
              <Text style={styles.actionBackBtnText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitFinalBtn, isSubmitting && { opacity: 0.7 }]}
              activeOpacity={0.85}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#002555" />
              ) : (
                <Text style={styles.submitFinalBtnText}>
                  {isEditMode ? "Save changes" : "Submit for review"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Category Dropdown Picker Modal */}
      <Modal
        visible={isCategoryModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCategoryModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { paddingTop: insets.top }]}>
          <View style={[styles.modalSheet, isDark && styles.modalSheetDark, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalSheetHeader}>
              <Text style={[styles.modalSheetTitle, isDark && styles.fieldLabelDark]}>
                Select Category
              </Text>
              <TouchableOpacity onPress={() => setIsCategoryModalVisible(false)} style={styles.modalCloseBtn}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryOptionItem, isSelected && styles.categoryOptionItemActive]}
                    activeOpacity={0.7}
                    onPress={() => {
                      setCategory(cat);
                      setIsCategoryModalVisible(false);
                      if (stepErrors.category) setStepErrors((prev) => ({ ...prev, category: "" }));
                    }}
                  >
                    <Text
                      style={[
                        styles.categoryOptionText,
                        isSelected && styles.categoryOptionTextActive,
                        isDark && styles.fieldLabelDark,
                      ]}
                    >
                      {cat}
                    </Text>
                    {isSelected && <Check size={18} color="#033a7d" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Escrow Policy Modal */}
      <EscrowPolicyModal
        visible={escrowModalVisible}
        onClose={() => setEscrowModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  safeAreaDark: {
    backgroundColor: "#010f22",
  },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  logoImg: {
    width: 130,
    height: 30,
  },

  // Direction A Wizard Header
  wizardHeader: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  wizardHeaderDark: {
    backgroundColor: "#0b1329",
    borderBottomColor: "#1e293b",
  },
  wizardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  wizardNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
  },
  wizardHeaderTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  wizardHeaderTitleDark: {
    color: "#f8fafc",
  },
  draftBadgeContainer: {
    alignItems: "flex-end",
  },
  draftBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  draftBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803d",
  },
  progressBarRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 6,
  },
  progressBarSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e2e8f0",
  },
  progressBarSegmentActive: {
    backgroundColor: "#033a7d",
  },
  stepSubtitleText: {
    fontFamily: Platform.select({ ios: "Courier", android: "monospace" }),
    fontSize: 10.5,
    fontWeight: "700",
    color: "#64748b",
    letterSpacing: 0.5,
  },

  // Scroll Content
  scrollFlex: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  stepContainer: {
    gap: 16,
  },
  fieldBlock: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0f172a",
  },
  fieldLabelDark: {
    color: "#f8fafc",
  },
  inputSubLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 4,
  },

  // Item Type 3-pill Row
  itemTypeRow: {
    flexDirection: "row",
    gap: 8,
  },
  itemTypePill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  itemTypePillDark: {
    backgroundColor: "#0b1329",
    borderColor: "#1e293b",
  },
  itemTypePillActive: {
    borderColor: "#033a7d",
    backgroundColor: "#eff5fb",
    borderWidth: 2,
  },
  itemTypePillText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#475569",
    textAlign: "center",
  },
  itemTypePillTextDark: {
    color: "#94a3b8",
  },
  itemTypePillTextActive: {
    color: "#033a7d",
    fontWeight: "800",
  },

  // Inputs & Cards
  textInput: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: "#0f172a",
  },
  textInputDark: {
    backgroundColor: "#0b1329",
    borderColor: "#1e293b",
    color: "#f8fafc",
  },
  textInputError: {
    borderColor: "#dc2626",
    backgroundColor: "#fff5f5",
  },
  textAreaInput: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: "#0f172a",
    minHeight: 100,
  },
  selectorCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectorCardDark: {
    backgroundColor: "#0b1329",
    borderColor: "#1e293b",
  },
  selectorCardText: {
    fontSize: 13.5,
    fontWeight: "600",
    color: "#0f172a",
  },
  selectorCardTextDark: {
    color: "#f8fafc",
  },
  selectorCardPlaceholder: {
    color: "#94a3b8",
    fontWeight: "400",
  },
  errorText: {
    fontSize: 11.5,
    color: "#dc2626",
    fontWeight: "600",
    marginTop: 2,
  },

  // Condition Radio Cards
  conditionOptionsCol: {
    gap: 8,
  },
  conditionRadioCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  conditionRadioCardDark: {
    backgroundColor: "#0b1329",
    borderColor: "#1e293b",
  },
  conditionRadioCardActive: {
    borderColor: "#033a7d",
    backgroundColor: "#eff5fb",
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#94a3b8",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleActive: {
    borderColor: "#033a7d",
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#033a7d",
  },
  conditionRadioText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#334155",
    flex: 1,
  },
  conditionRadioTextDark: {
    color: "#cbd5e1",
  },
  conditionRadioTextActive: {
    color: "#033a7d",
    fontWeight: "700",
  },

  // Stepper
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepperBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValueText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    minWidth: 28,
    textAlign: "center",
  },

  // Photos
  photosHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  photosSubHint: {
    fontSize: 11.5,
    color: "#64748b",
    marginTop: 2,
    maxWidth: 240,
  },
  photoCountBadge: {
    backgroundColor: "#eff5fb",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  photoCountBadgeText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#033a7d",
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  photoSlot: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#f1f5f9",
  },
  uploadedPhotoImg: {
    width: "100%",
    height: "100%",
  },
  coverBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    backgroundColor: "#033a7d",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  coverBadgeText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "900",
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
  addSlotCard: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#94a3b8",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: 4,
    backgroundColor: "#ffffff",
  },
  addSlotCardDark: {
    backgroundColor: "#0b1329",
    borderColor: "#475569",
  },
  addSlotCardText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#033a7d",
    textAlign: "center",
  },
  guidanceCard: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbeaf7",
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginTop: 6,
  },
  guidanceCardDark: {
    backgroundColor: "#0b1329",
    borderColor: "#1e293b",
  },
  guidanceCardTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#033a7d",
    marginBottom: 2,
  },
  guidanceCardText: {
    fontSize: 11.5,
    lineHeight: 16,
    color: "#475569",
  },

  // Step 3 Pricing
  pricingCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  pricingCardDark: {
    backgroundColor: "#0b1329",
    borderColor: "#1e293b",
  },
  pricingCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceOnRequestToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  toggleLabel: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },
  toggleTrack: {
    width: 36,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#cbd5e1",
    padding: 2,
    justifyContent: "center",
  },
  toggleTrackActive: {
    backgroundColor: "#033a7d",
  },
  toggleThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#ffffff",
  },
  toggleThumbActive: {
    alignSelf: "flex-end",
  },
  twoInputsRow: {
    flexDirection: "row",
    gap: 10,
  },
  priceOnRequestNotice: {
    backgroundColor: "#eff5fb",
    padding: 10,
    borderRadius: 8,
  },
  priceOnRequestNoticeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#033a7d",
  },
  descriptionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  charCountText: {
    fontSize: 11,
    color: "#94a3b8",
  },

  // Step 4 Review
  sectionHeadingTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  previewCard: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 10,
    gap: 12,
  },
  previewCardDark: {
    backgroundColor: "#0b1329",
    borderColor: "#1e293b",
  },
  previewThumbContainer: {
    width: 90,
    height: 90,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    overflow: "hidden",
  },
  previewThumbImg: {
    width: "100%",
    height: "100%",
  },
  previewThumbPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  previewInfoCol: {
    flex: 1,
    justifyContent: "space-between",
  },
  previewBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  previewPill: {
    backgroundColor: "#eff5fb",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  previewPillText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#033a7d",
  },
  previewConditionText: {
    fontSize: 10.5,
    color: "#64748b",
  },
  previewTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0f172a",
  },
  previewLocationText: {
    fontSize: 11,
    color: "#64748b",
  },
  previewPriceText: {
    fontSize: 14.5,
    fontWeight: "900",
    color: "#002555",
  },
  contactCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 14,
  },
  contactCardDark: {
    backgroundColor: "#0b1329",
    borderColor: "#1e293b",
  },
  contactNoticeText: {
    fontSize: 11.5,
    color: "#64748b",
    lineHeight: 16,
    marginTop: 4,
  },
  escrowLinkCard: {
    flexDirection: "row",
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 12,
    padding: 12,
    gap: 10,
    alignItems: "center",
  },
  escrowLinkTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#166534",
  },
  escrowLinkSub: {
    fontSize: 11,
    color: "#15803d",
    lineHeight: 15,
  },

  // Fixed Bottom Bar
  bottomActionBar: {
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  fullWidthNextBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: "#033a7d",
    alignItems: "center",
    justifyContent: "center",
  },
  fullWidthNextBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#ffffff",
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionBackBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  actionBackBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
  },
  actionNextBtn: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#033a7d",
    alignItems: "center",
    justifyContent: "center",
  },
  actionNextBtnText: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#ffffff",
  },
  submitFinalBtn: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#fbc634",
    alignItems: "center",
    justifyContent: "center",
  },
  submitFinalBtnText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#002555",
  },

  // Category Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    maxHeight: "80%",
  },
  modalSheetDark: {
    backgroundColor: "#0b1329",
  },
  modalSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalSheetTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  modalCloseBtn: {
    padding: 4,
  },
  categoryOptionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
  },
  categoryOptionItemActive: {
    backgroundColor: "#eff5fb",
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  categoryOptionText: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "600",
  },
  categoryOptionTextActive: {
    color: "#033a7d",
    fontWeight: "800",
  },

  // Auth Guard
  authRequiredContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 14,
  },
  authLockCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#eff5fb",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  authTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
  },
  authTitleDark: {
    color: "#f8fafc",
  },
  authSubtitle: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 18,
  },
  signInButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#033a7d",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  signInButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },

  // Success Confirmation Screen
  successContainer: {
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fef3c7",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#fef3c7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#b45309",
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
  },
  successTitleDark: {
    color: "#f8fafc",
  },
  successSubtitle: {
    fontSize: 13.5,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 19,
  },
  successInfoCard: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 14,
    gap: 10,
    width: "100%",
    marginTop: 8,
  },
  successInfoCardDark: {
    backgroundColor: "#0b1329",
    borderColor: "#1e293b",
  },
  successInfoRow: {
    flexDirection: "row",
    gap: 8,
  },
  successInfoText: {
    fontSize: 12,
    color: "#475569",
    flex: 1,
    lineHeight: 16,
  },
  successActionCol: {
    width: "100%",
    gap: 10,
    marginTop: 16,
  },
  goToMarketplaceBtn: {
    backgroundColor: "#033a7d",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  goToMarketplaceBtnText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 14,
  },
  postAnotherBtn: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  postAnotherBtnText: {
    color: "#0f172a",
    fontWeight: "700",
    fontSize: 14,
  },

  centerLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  fieldCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
  },
  fieldCardDark: {
    backgroundColor: "#0b1329",
    borderColor: "#1e293b",
  },
  docRowItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  docIconPill: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  docRowTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#1e293b",
  },
  docRemoveBtn: {
    padding: 4,
  },
  addDocBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    borderStyle: "dashed",
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 10,
    backgroundColor: "#ffffff",
  },
  addDocBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#033a7d",
  },
});
