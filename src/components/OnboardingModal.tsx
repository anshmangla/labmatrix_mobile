import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  StyleSheet,
  useColorScheme,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Check from "lucide-react-native/icons/check";
import ArrowLeft from "lucide-react-native/icons/arrow-left";
import {
  hasSeenOnboarding,
  setOnboardingCompleted,
  saveUserPreferences,
  getUserPreferences,
  UserPreferences,
} from "@/lib/storage";

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

interface OnboardingModalProps {
  forceVisible?: boolean;
  onClose?: () => void;
}

export function OnboardingModal({ forceVisible, onClose }: OnboardingModalProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedRole, setSelectedRole] = useState<"SOURCING" | "SELLING" | "BOTH">("SOURCING");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  useEffect(() => {
    if (forceVisible !== undefined) {
      setVisible(forceVisible);
      if (forceVisible) {
        getUserPreferences().then((prefs) => {
          if (prefs.role) setSelectedRole(prefs.role);
          if (prefs.categories.length > 0) setSelectedCategories(prefs.categories);
        });
      }
      return;
    }

    // Auto check if user has seen onboarding
    hasSeenOnboarding().then((seen) => {
      if (!seen) {
        setVisible(true);
      }
    });
  }, [forceVisible]);

  const handleSkip = async () => {
    await setOnboardingCompleted(true);
    setVisible(false);
    if (onClose) onClose();
  };

  const handleToggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSelectAllCategories = () => {
    if (selectedCategories.length === CATEGORIES.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories([...CATEGORIES]);
    }
  };

  const handleFinish = async () => {
    const prefs: UserPreferences = {
      role: selectedRole,
      categories: selectedCategories,
    };
    await saveUserPreferences(prefs);
    await setOnboardingCompleted(true);
    setVisible(false);
    if (onClose) onClose();

    // If user is purely a seller, take them to the sell tab
    if (selectedRole === "SELLING") {
      router.push("/(tabs)/sell" as any);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={handleSkip}
    >
      <View
        style={[
          styles.container,
          isDark && styles.containerDark,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

        {/* Top Header */}
        <View style={styles.topHeader}>
          {step === 2 ? (
            <TouchableOpacity
              style={styles.backBtn}
              activeOpacity={0.7}
              onPress={() => setStep(1)}
            >
              <ArrowLeft size={18} color={isDark ? "#cbd5e1" : "#475569"} />
              <Text style={[styles.backBtnText, isDark && styles.backBtnTextDark]}>Back</Text>
            </TouchableOpacity>
          ) : (
            <Image
              source={require("@/assets/images/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          )}

          <TouchableOpacity
            style={styles.skipBtn}
            activeOpacity={0.7}
            onPress={handleSkip}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Content Body */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {step === 1 ? (
            // ==========================================
            // STEP 1: CHOOSE YOUR ROLE
            // ==========================================
            <View style={styles.stepContainer}>
              <View style={styles.titleBlock}>
                <Text style={[styles.mainTitle, isDark && styles.mainTitleDark]}>
                  What brings you to LabMatrix?
                </Text>
                <Text style={styles.subTitle}>
                  We&apos;ll set up the app around it. You can change this later in your profile.
                </Text>
              </View>

              <View style={styles.cardsCol}>
                {/* 1. Sourcing */}
                <TouchableOpacity
                  style={[
                    styles.roleCard,
                    isDark && styles.roleCardDark,
                    selectedRole === "SOURCING" && styles.roleCardActive,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => setSelectedRole("SOURCING")}
                >
                  <View style={styles.roleCardTextCol}>
                    <Text
                      style={[
                        styles.roleCardTitle,
                        isDark && styles.roleCardTitleDark,
                        selectedRole === "SOURCING" && styles.roleCardTitleActive,
                      ]}
                    >
                      I&apos;m sourcing equipment
                    </Text>
                    <Text style={styles.roleCardDesc}>
                      Find verified pre-owned analytical instruments and spare parts
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.radioCircle,
                      selectedRole === "SOURCING" && styles.radioCircleActive,
                    ]}
                  >
                    {selectedRole === "SOURCING" && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>

                {/* 2. Surplus to sell */}
                <TouchableOpacity
                  style={[
                    styles.roleCard,
                    isDark && styles.roleCardDark,
                    selectedRole === "SELLING" && styles.roleCardActive,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => setSelectedRole("SELLING")}
                >
                  <View style={styles.roleCardTextCol}>
                    <Text
                      style={[
                        styles.roleCardTitle,
                        isDark && styles.roleCardTitleDark,
                        selectedRole === "SELLING" && styles.roleCardTitleActive,
                      ]}
                    >
                      I have surplus to sell
                    </Text>
                    <Text style={styles.roleCardDesc}>
                      List surplus machines and fulfill verified buyer requests
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.radioCircle,
                      selectedRole === "SELLING" && styles.radioCircleActive,
                    ]}
                  >
                    {selectedRole === "SELLING" && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>

                {/* 3. Both */}
                <TouchableOpacity
                  style={[
                    styles.roleCard,
                    isDark && styles.roleCardDark,
                    selectedRole === "BOTH" && styles.roleCardActive,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => setSelectedRole("BOTH")}
                >
                  <View style={styles.roleCardTextCol}>
                    <Text
                      style={[
                        styles.roleCardTitle,
                        isDark && styles.roleCardTitleDark,
                        selectedRole === "BOTH" && styles.roleCardTitleActive,
                      ]}
                    >
                      Both
                    </Text>
                    <Text style={styles.roleCardDesc}>
                      Buy and sell equipment seamlessly from a single facility account
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.radioCircle,
                      selectedRole === "BOTH" && styles.radioCircleActive,
                    ]}
                  >
                    {selectedRole === "BOTH" && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // ==========================================
            // STEP 2: INSTRUMENT CATEGORIES
            // ==========================================
            <View style={styles.stepContainer}>
              <View style={styles.titleBlock}>
                <Text style={[styles.mainTitle, isDark && styles.mainTitleDark]}>
                  Which instruments do you work with?
                </Text>
                <Text style={styles.subTitle}>
                  Select your primary techniques to personalize marketplace search and sourcing alerts.
                </Text>
              </View>

              {/* Select all toggle */}
              <TouchableOpacity
                style={styles.selectAllBtn}
                activeOpacity={0.75}
                onPress={handleSelectAllCategories}
              >
                <Text style={styles.selectAllText}>
                  {selectedCategories.length === CATEGORIES.length
                    ? "Clear all selections"
                    : "Select all categories"}
                </Text>
              </TouchableOpacity>

              <View style={styles.chipsWrap}>
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedCategories.includes(cat);
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryChip,
                        isDark && styles.categoryChipDark,
                        isSelected && styles.categoryChipActive,
                      ]}
                      activeOpacity={0.8}
                      onPress={() => handleToggleCategory(cat)}
                    >
                      {isSelected && (
                        <Check size={14} color="#ffffff" style={{ marginRight: 6 }} />
                      )}
                      <Text
                        style={[
                          styles.categoryChipText,
                          isDark && styles.categoryChipTextDark,
                          isSelected && styles.categoryChipTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Bottom Pinned Action Bar */}
        <View style={[styles.bottomBar, isDark && styles.bottomBarDark]}>
          {/* Step Dots Indicator */}
          <View style={styles.dotsRow}>
            <View
              style={[
                styles.stepDot,
                step === 1 ? styles.stepDotActive : styles.stepDotInactive,
              ]}
            />
            <View
              style={[
                styles.stepDot,
                step === 2 ? styles.stepDotActive : styles.stepDotInactive,
              ]}
            />
          </View>

          {/* Action CTA */}
          {step === 1 ? (
            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.85}
              onPress={() => setStep(2)}
            >
              <Text style={styles.primaryBtnText}>Continue</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.finishBtn}
              activeOpacity={0.85}
              onPress={handleFinish}
            >
              <Text style={styles.finishBtnText}>Explore Marketplace</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  containerDark: {
    backgroundColor: "#0b1220",
  },
  topHeader: {
    height: 54,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: {
    width: 120,
    height: 28,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
  },
  backBtnTextDark: {
    color: "#cbd5e1",
  },
  skipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  skipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  stepContainer: {
    gap: 18,
  },
  titleBlock: {
    gap: 6,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a",
    lineHeight: 30,
    letterSpacing: -0.4,
  },
  mainTitleDark: {
    color: "#f8fafc",
  },
  subTitle: {
    fontSize: 13.5,
    color: "#475569",
    lineHeight: 19,
  },
  cardsCol: {
    gap: 12,
    marginTop: 6,
  },
  roleCard: {
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    padding: 16,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  roleCardDark: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
  },
  roleCardActive: {
    borderColor: "#033a7d",
    backgroundColor: "#eff5fb",
  },
  roleCardTextCol: {
    flex: 1,
    gap: 3,
  },
  roleCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
  },
  roleCardTitleDark: {
    color: "#f8fafc",
  },
  roleCardTitleActive: {
    color: "#002555",
  },
  roleCardDesc: {
    fontSize: 12.5,
    color: "#64748b",
    lineHeight: 17,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleActive: {
    borderColor: "#033a7d",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#033a7d",
  },
  selectAllBtn: {
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  selectAllText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#033a7d",
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  categoryChipDark: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
  },
  categoryChipActive: {
    backgroundColor: "#002555",
    borderColor: "#002555",
  },
  categoryChipText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#334155",
  },
  categoryChipTextDark: {
    color: "#f8fafc",
  },
  categoryChipTextActive: {
    color: "#ffffff",
    fontWeight: "800",
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    gap: 14,
  },
  bottomBarDark: {
    backgroundColor: "#0b1220",
    borderColor: "#1e293b",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stepDot: {
    height: 6,
    borderRadius: 3,
  },
  stepDotActive: {
    width: 18,
    backgroundColor: "#033a7d",
  },
  stepDotInactive: {
    width: 6,
    backgroundColor: "#cbd5e1",
  },
  primaryBtn: {
    width: "100%",
    height: 48,
    borderRadius: 12,
    backgroundColor: "#033a7d",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#033a7d",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#ffffff",
  },
  finishBtn: {
    width: "100%",
    height: 48,
    borderRadius: 12,
    backgroundColor: "#fbc634",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#fbc634",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  finishBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#002555",
  },
});
