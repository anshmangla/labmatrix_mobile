import React from "react";
import { Tabs } from "expo-router";
import { useColorScheme, View, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Store, ClipboardList, Plus, MessageSquare, User } from "lucide-react-native";
import { LabMatrixTokens } from "@/constants/theme";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();

  const { colors } = LabMatrixTokens;
  const activeColor = colors.primaryContainer; // #033a7d
  const inactiveColor = isDark ? "#94a3b8" : colors.textMuted; // #64748b
  const bgColor = isDark ? colors.brandBlue950 : colors.surface; // #ffffff
  const borderColor = isDark ? "#1e293b" : colors.border; // #e2e8f0

  // Calculate safe bottom padding for Android (navigation bar) and iOS (home indicator)
  const bottomInset = Math.max(insets.bottom, Platform.OS === "android" ? 10 : 8);
  const tabHeight = 56 + bottomInset;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          backgroundColor: bgColor,
          borderTopColor: borderColor,
          height: tabHeight,
          paddingBottom: bottomInset,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
        headerStyle: {
          backgroundColor: bgColor,
          borderBottomColor: borderColor,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
        headerTitleStyle: {
          fontWeight: "700",
          fontSize: 18,
          color: isDark ? "#f8fafc" : colors.primaryContainer,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
          title: "Marketplace",
          tabBarIcon: ({ color, size }) => <Store color={color} size={size || 22} />,
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          headerShown: false,
          title: "Requests",
          tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size || 22} />,
        }}
      />
      <Tabs.Screen
        name="sell"
        options={{
          headerShown: false,
          title: "Sell",
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "700",
            color: isDark ? "#fbc634" : "#775a00",
          },
          tabBarIcon: () => (
            <View style={styles.sellButtonContainer}>
              <Plus size={22} color="#0f172a" strokeWidth={2.8} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="inquiries"
        options={{
          headerShown: false,
          title: "Inquiries",
          tabBarIcon: ({ color, size }) => <MessageSquare color={color} size={size || 22} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          headerShown: false,
          title: "Profile",
          tabBarIcon: ({ color, size }) => <User color={color} size={size || 22} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  sellButtonContainer: {
    width: 44,
    height: 38,
    borderRadius: 12,
    backgroundColor: LabMatrixTokens.colors.goldAccent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
    shadowColor: LabMatrixTokens.colors.goldAccent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
});
