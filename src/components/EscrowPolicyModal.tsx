import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  useColorScheme,
  ScrollView,
  Linking,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  X,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Truck,
  Phone,
  FileCheck2,
  BadgeCheck,
} from "lucide-react-native";

interface EscrowPolicyModalProps {
  visible: boolean;
  onClose: () => void;
}

export function EscrowPolicyModal({ visible, onClose }: EscrowPolicyModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  const handleCallSupport = () => {
    Linking.openURL("tel:+917303040804").catch(() => {
      Alert.alert(
        "Escrow Desk Helpline",
        "Helpline: +91 73030 40804\nEmail: escrow@labmatrixindia.com"
      );
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View
              style={[
                styles.sheetContainer,
                isDark && styles.sheetContainerDark,
                { paddingBottom: Math.max(insets.bottom, 20) },
              ]}
            >
              {/* Handle Bar */}
              <View style={styles.dragHandle} />

              {/* Header */}
              <View style={styles.headerRow}>
                <View style={styles.headerTitleCol}>
                  <View style={styles.badgeRow}>
                    <ShieldCheck size={14} color="#033a7d" />
                    <Text style={styles.badgeText}>GUARANTEED TRUST PROTOCOL</Text>
                  </View>
                  <Text style={[styles.sheetTitle, isDark && styles.sheetTitleDark]}>
                    Escrow & Verification Policy
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.closeBtn, isDark && styles.closeBtnDark]}
                  activeOpacity={0.7}
                  onPress={onClose}
                  accessibilityLabel="Close Escrow Policy"
                >
                  <X size={18} color={isDark ? "#cbd5e1" : "#475569"} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.scrollList}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {/* Intro summary */}
                <Text style={[styles.introText, isDark && styles.introTextDark]}>
                  LabMatrix eliminates counterparty fraud in pre-owned laboratory instrumentation through our 3-stage audited escrow protocol.
                </Text>

                {/* Step 1 */}
                <View style={[styles.stepCard, isDark && styles.stepCardDark]}>
                  <View style={styles.stepHeader}>
                    <View style={[styles.stepNumCircle, { backgroundColor: "#eff6ff" }]}>
                      <FileCheck2 size={16} color="#033a7d" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.stepTitle, isDark && styles.stepTitleDark]}>
                        1. Diagnostic Bench Verification
                      </Text>
                      <Text style={styles.stepSubtitle}>
                        Pre-dispatch technical validation
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.stepBody}>
                    Before any payment is released, certified biomedical & analytical engineers conduct physical leak checks, baseline optical calibrations, and power-train audits on the instrument.
                  </Text>
                </View>

                {/* Step 2 */}
                <View style={[styles.stepCard, isDark && styles.stepCardDark]}>
                  <View style={styles.stepHeader}>
                    <View style={[styles.stepNumCircle, { backgroundColor: "#fef3c7" }]}>
                      <Lock size={16} color="#b45309" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.stepTitle, isDark && styles.stepTitleDark]}>
                        2. Milestone Escrow Custody
                      </Text>
                      <Text style={styles.stepSubtitle}>
                        Zero direct prepayment risk
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.stepBody}>
                    Buyer funds are held in a ring-fenced bank escrow account. Sellers are guaranteed payment upon verified dispatch, while buyers are protected from unverified or damaged shipments.
                  </Text>
                </View>

                {/* Step 3 */}
                <View style={[styles.stepCard, isDark && styles.stepCardDark]}>
                  <View style={styles.stepHeader}>
                    <View style={[styles.stepNumCircle, { backgroundColor: "#ecfdf5" }]}>
                      <Truck size={16} color="#059669" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.stepTitle, isDark && styles.stepTitleDark]}>
                        3. Acceptance & Settlement
                      </Text>
                      <Text style={styles.stepSubtitle}>
                        48-hour bench trial period
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.stepBody}>
                    Upon receipt, the buyer has a standard 48-hour inspection window to confirm operation against bench test reports. Once signed off, funds settle to the seller immediately.
                  </Text>
                </View>

                {/* Direct Hotline Box */}
                <View style={[styles.hotlineBox, isDark && styles.hotlineBoxDark]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.hotlineTitle, isDark && styles.hotlineTitleDark]}>
                      Have questions about Escrow?
                    </Text>
                    <Text style={styles.hotlineSub}>
                      Speak with our deal desk coordinator directly.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.hotlineBtn}
                    activeOpacity={0.85}
                    onPress={handleCallSupport}
                  >
                    <Phone size={14} color="#ffffff" />
                    <Text style={styles.hotlineBtnText}>Call Desk</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "82%",
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  sheetContainerDark: {
    backgroundColor: "#0d1829",
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#cbd5e1",
    alignSelf: "center",
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  headerTitleCol: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#033a7d",
    letterSpacing: 0.6,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: -0.3,
  },
  sheetTitleDark: {
    color: "#f8fafc",
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnDark: {
    backgroundColor: "#1e293b",
  },
  scrollList: {
    marginTop: 14,
  },
  introText: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 19,
    marginBottom: 14,
  },
  introTextDark: {
    color: "#94a3b8",
  },
  stepCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 10,
  },
  stepCardDark: {
    backgroundColor: "#132137",
    borderColor: "#1e293b",
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  stepNumCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  stepTitleDark: {
    color: "#f8fafc",
  },
  stepSubtitle: {
    fontSize: 11,
    color: "#64748b",
  },
  stepBody: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 18,
  },
  hotlineBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 14,
    padding: 14,
    marginTop: 6,
    marginBottom: 16,
  },
  hotlineBoxDark: {
    backgroundColor: "#0d2818",
    borderColor: "#14532d",
  },
  hotlineTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#166534",
  },
  hotlineTitleDark: {
    color: "#86efac",
  },
  hotlineSub: {
    fontSize: 11,
    color: "#15803d",
    marginTop: 2,
  },
  hotlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#166534",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 10,
  },
  hotlineBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
});
