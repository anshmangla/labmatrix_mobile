import React, { useState } from "react";
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
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Camera, Image as ImageIcon, X, CheckCircle, LogIn } from "lucide-react-native";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";

const CATEGORIES = [
  "Clinical Chemistry",
  "Hematology",
  "Immunology",
  "Molecular Diagnostics",
  "Microbiology",
  "Histopathology",
  "Centrifuges",
  "Spectrophotometers",
  "Microscopes",
  "General Lab Equipment",
];

const CONDITIONS = [
  { label: "Used (Functional)", value: "USED" },
  { label: "Refurbished", value: "REFURBISHED" },
  { label: "Brand New / Unused", value: "NEW" },
];

export default function SellScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { isAuthenticated } = useAuth();

  const [itemType, setItemType] = useState<"EQUIPMENT" | "SPARE_PART">("EQUIPMENT");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [condition, setCondition] = useState("USED");
  const [partNumber, setPartNumber] = useState("");
  const [compatibleWith, setCompatibleWith] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  const [photos, setPhotos] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthenticated) {
    return (
      <View style={[styles.authRequiredContainer, isDark && styles.authRequiredContainerDark]}>
        <LogIn size={48} color="#0284c7" />
        <Text style={[styles.authTitle, isDark && styles.authTitleDark]}>
          Sign In to List Equipment
        </Text>
        <Text style={styles.authSubtitle}>
          You must be logged in to your LabMatrix account to list laboratory instruments or spare parts.
        </Text>
        <TouchableOpacity
          style={styles.signInButton}
          onPress={() => router.push("/(auth)/login")}
        >
          <Text style={styles.signInButtonText}>Sign In / Register</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "Please allow access to your photos to upload listing images.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadImage(result.assets[0].uri);
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
    if (!title.trim() || title.length < 3) {
      Alert.alert("Validation", "Please enter a title (at least 3 characters).");
      return;
    }
    if (!description.trim() || description.length < 10) {
      Alert.alert("Validation", "Please enter a detailed description (at least 10 characters).");
      return;
    }
    if (!location.trim()) {
      Alert.alert("Validation", "Please specify the item location (e.g. Mumbai, Bangalore).");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        title: title.trim(),
        description: description.trim(),
        category,
        itemType,
        condition,
        location: location.trim(),
        photos,
        quantity: 1,
      };

      if (itemType === "SPARE_PART") {
        if (partNumber.trim()) payload.partNumber = partNumber.trim();
        if (compatibleWith.trim()) payload.compatibleWith = compatibleWith.trim();
      }

      if (minPrice.trim()) payload.minPrice = parseFloat(minPrice);
      if (maxPrice.trim()) payload.maxPrice = parseFloat(maxPrice);

      const res = await api.post("/api/listings", payload);

      Alert.alert(
        "Listing Submitted",
        "Your item has been submitted and will be reviewed by admin before appearing in the marketplace.",
        [{ text: "OK", onPress: () => router.push("/(tabs)") }]
      );
    } catch (error: any) {
      console.error("Submit listing error:", error);
      Alert.alert("Error", error.response?.data?.error || "Failed to create listing.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={[styles.container, isDark && styles.containerDark]} contentContainerStyle={styles.content}>
      {/* Type Selector */}
      <Text style={[styles.sectionLabel, isDark && styles.sectionLabelDark]}>Item Classification</Text>
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentButton, itemType === "EQUIPMENT" && styles.segmentButtonActive]}
          onPress={() => setItemType("EQUIPMENT")}
        >
          <Text style={[styles.segmentText, itemType === "EQUIPMENT" && styles.segmentTextActive]}>
            Laboratory Equipment
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentButton, itemType === "SPARE_PART" && styles.segmentButtonActive]}
          onPress={() => setItemType("SPARE_PART")}
        >
          <Text style={[styles.segmentText, itemType === "SPARE_PART" && styles.segmentTextActive]}>
            Spare Part
          </Text>
        </TouchableOpacity>
      </View>

      {/* Title */}
      <Text style={[styles.inputLabel, isDark && styles.inputLabelDark]}>Item Title *</Text>
      <TextInput
        style={[styles.input, isDark && styles.inputDark]}
        placeholder="e.g. Roche Cobas c311 Chemistry Analyzer"
        placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
        value={title}
        onChangeText={setTitle}
      />

      {/* Category */}
      <Text style={[styles.inputLabel, isDark && styles.inputLabelDark]}>Category *</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        {CATEGORIES.map((cat) => {
          const isSelected = category === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.catChip, isSelected && styles.catChipSelected]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.catChipText, isSelected && styles.catChipTextSelected]}>{cat}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Spare Part Specific Fields */}
      {itemType === "SPARE_PART" && (
        <>
          <Text style={[styles.inputLabel, isDark && styles.inputLabelDark]}>Part Number / OEM Code</Text>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            placeholder="e.g. PN-9482-10"
            placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
            value={partNumber}
            onChangeText={setPartNumber}
          />

          <Text style={[styles.inputLabel, isDark && styles.inputLabelDark]}>Compatible Instruments</Text>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            placeholder="e.g. Beckman Coulter AU480, AU680"
            placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
            value={compatibleWith}
            onChangeText={setCompatibleWith}
          />
        </>
      )}

      {/* Condition */}
      <Text style={[styles.inputLabel, isDark && styles.inputLabelDark]}>Condition *</Text>
      <View style={styles.conditionRow}>
        {CONDITIONS.map((c) => {
          const isSelected = condition === c.value;
          return (
            <TouchableOpacity
              key={c.value}
              style={[styles.conditionChip, isSelected && styles.conditionChipSelected]}
              onPress={() => setCondition(c.value)}
            >
              <Text style={[styles.conditionText, isSelected && styles.conditionTextSelected]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Pricing */}
      <View style={styles.priceRow}>
        <View style={styles.priceCol}>
          <Text style={[styles.inputLabel, isDark && styles.inputLabelDark]}>Min Price (₹)</Text>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            placeholder="Optional"
            placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
            keyboardType="numeric"
            value={minPrice}
            onChangeText={setMinPrice}
          />
        </View>
        <View style={styles.priceCol}>
          <Text style={[styles.inputLabel, isDark && styles.inputLabelDark]}>Max Price (₹)</Text>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            placeholder="Optional"
            placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
            keyboardType="numeric"
            value={maxPrice}
            onChangeText={setMaxPrice}
          />
        </View>
      </View>

      {/* Location */}
      <Text style={[styles.inputLabel, isDark && styles.inputLabelDark]}>Location / City *</Text>
      <TextInput
        style={[styles.input, isDark && styles.inputDark]}
        placeholder="e.g. Mumbai, Maharashtra"
        placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
        value={location}
        onChangeText={setLocation}
      />

      {/* Description */}
      <Text style={[styles.inputLabel, isDark && styles.inputLabelDark]}>Description *</Text>
      <TextInput
        style={[styles.textArea, isDark && styles.textAreaDark]}
        placeholder="Detailed information regarding condition, maintenance history, warranty, included accessories..."
        placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
        multiline
        numberOfLines={4}
        value={description}
        onChangeText={setDescription}
      />

      {/* Photos */}
      <Text style={[styles.inputLabel, isDark && styles.inputLabelDark]}>Photographs</Text>
      <View style={styles.photoGrid}>
        {photos.map((p, idx) => (
          <View key={idx} style={styles.photoThumbWrapper}>
            <Image source={{ uri: p }} style={styles.photoThumb} />
            <TouchableOpacity style={styles.photoRemoveBtn} onPress={() => removePhoto(idx)}>
              <X size={14} color="#ffffff" />
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.addPhotoBtn, isDark && styles.addPhotoBtnDark]}
          onPress={pickImage}
          disabled={isUploadingPhoto}
        >
          {isUploadingPhoto ? (
            <ActivityIndicator size="small" color="#0284c7" />
          ) : (
            <>
              <Camera size={22} color="#0284c7" />
              <Text style={styles.addPhotoText}>Add Photo</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.submitButtonText}>Submit Listing for Review</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  containerDark: {
    backgroundColor: "#090d16",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  authRequiredContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  authRequiredContainerDark: {
    backgroundColor: "#090d16",
  },
  authTitle: {
    fontSize: 20,
    fontWeight: "700",
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
    marginBottom: 10,
  },
  signInButton: {
    backgroundColor: "#0284c7",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  signInButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  sectionLabelDark: {
    color: "#94a3b8",
  },
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  segmentButtonActive: {
    backgroundColor: "#ffffff",
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  segmentTextActive: {
    color: "#0284c7",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
    marginTop: 10,
  },
  inputLabelDark: {
    color: "#cbd5e1",
  },
  input: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 14,
    height: 46,
    fontSize: 15,
    color: "#0f172a",
  },
  inputDark: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    color: "#f8fafc",
  },
  textArea: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 90,
    fontSize: 15,
    color: "#0f172a",
    textAlignVertical: "top",
  },
  textAreaDark: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    color: "#f8fafc",
  },
  categoryScroll: {
    marginBottom: 6,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#e2e8f0",
    marginRight: 8,
  },
  catChipSelected: {
    backgroundColor: "#0284c7",
  },
  catChipText: {
    fontSize: 13,
    color: "#475569",
  },
  catChipTextSelected: {
    color: "#ffffff",
    fontWeight: "600",
  },
  conditionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  conditionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#e2e8f0",
  },
  conditionChipSelected: {
    backgroundColor: "#0284c7",
  },
  conditionText: {
    fontSize: 13,
    color: "#475569",
  },
  conditionTextSelected: {
    color: "#ffffff",
    fontWeight: "600",
  },
  priceRow: {
    flexDirection: "row",
    gap: 12,
  },
  priceCol: {
    flex: 1,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 6,
  },
  photoThumbWrapper: {
    position: "relative",
    width: 90,
    height: 90,
    borderRadius: 10,
    overflow: "hidden",
  },
  photoThumb: {
    width: "100%",
    height: "100%",
  },
  photoRemoveBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoBtn: {
    width: 90,
    height: 90,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#0284c7",
    backgroundColor: "#f0f9ff",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  addPhotoBtnDark: {
    backgroundColor: "#1e293b",
    borderColor: "#0284c7",
  },
  addPhotoText: {
    fontSize: 11,
    color: "#0284c7",
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: "#0284c7",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
});
