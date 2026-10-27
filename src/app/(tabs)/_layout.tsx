import { Tabs } from "expo-router";
import { useColorScheme } from "react-native";
import { Store, ClipboardList, PlusCircle, MessageSquare, User } from "lucide-react-native";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const activeColor = "#0284c7"; // LabMatrix Primary Blue
  const inactiveColor = isDark ? "#94a3b8" : "#64748b";
  const bgColor = isDark ? "#0f172a" : "#ffffff";
  const borderColor = isDark ? "#1e293b" : "#e2e8f0";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          backgroundColor: bgColor,
          borderTopColor: borderColor,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        headerStyle: {
          backgroundColor: bgColor,
        },
        headerTitleStyle: {
          fontWeight: "600",
          color: isDark ? "#f8fafc" : "#0f172a",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Marketplace",
          headerTitle: "LabMatrix Market",
          tabBarIcon: ({ color, size }) => <Store color={color} size={size || 22} />,
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: "Requests",
          headerTitle: "Equipment Needs",
          tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size || 22} />,
        }}
      />
      <Tabs.Screen
        name="sell"
        options={{
          title: "Sell",
          headerTitle: "List Instrument / Part",
          tabBarIcon: ({ color, size }) => <PlusCircle color={color} size={size || 24} />,
        }}
      />
      <Tabs.Screen
        name="inquiries"
        options={{
          title: "Inquiries",
          headerTitle: "My Inquiries",
          tabBarIcon: ({ color, size }) => <MessageSquare color={color} size={size || 22} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerTitle: "My Account",
          tabBarIcon: ({ color, size }) => <User color={color} size={size || 22} />,
        }}
      />
    </Tabs>
  );
}
