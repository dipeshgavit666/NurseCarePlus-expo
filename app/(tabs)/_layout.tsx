import { Tabs, Redirect } from "expo-router";
import { Text, Platform } from "react-native";
import { useAuth } from "../../src/context/AuthContext";
import { Colors } from "../../src/theme";
import { LoadingScreen } from "../../src/components/common/UI";

function Icon({ e, focused }: { e: string; focused: boolean }) {
  return <Text style={{ fontSize: focused ? 23 : 20, opacity: focused ? 1 : 0.4 }}>{e}</Text>;
}

export default function TabsLayout() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Redirect href="/(auth)/login" />;

  const roleColor =
    user.role === "nurse" ? Colors.nurse :
    user.role === "family" ? Colors.family :
    Colors.patient;

  const isNurse  = user.role === "nurse";
  const isFamily = user.role === "family";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: roleColor,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopColor: Colors.border,
          height: Platform.OS === "ios" ? 84 : 64,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "700", marginBottom: Platform.OS === "ios" ? 0 : 6 },
      }}
    >
      <Tabs.Screen name="home"            options={{ title: "Home",       tabBarIcon: ({ focused }) => <Icon e="🏠" focused={focused} /> }} />
      <Tabs.Screen name="nurse/patients"  options={{ title: "Patients",   tabBarIcon: ({ focused }) => <Icon e="🧑‍🦽" focused={focused} />, href: isNurse ? undefined : null }} />
      <Tabs.Screen name="nurse/create-patient" options={{ title: "New Patient", tabBarIcon: ({ focused }) => <Icon e="➕" focused={focused} />, href: isNurse ? undefined : null }} />
      <Tabs.Screen name="patient/medications"  options={{ title: "Medicines",  tabBarIcon: ({ focused }) => <Icon e="💊" focused={focused} />, href: isNurse ? null : undefined }} />
      <Tabs.Screen name="patient/health"       options={{ title: "Health",     tabBarIcon: ({ focused }) => <Icon e="❤️" focused={focused} />, href: isNurse ? null : undefined }} />
      <Tabs.Screen name="family/dashboard"     options={{ title: "Dashboard",  tabBarIcon: ({ focused }) => <Icon e="👨‍👩‍👧" focused={focused} />, href: isFamily ? undefined : null }} />
      <Tabs.Screen name="profile"              options={{ title: "Profile",    tabBarIcon: ({ focused }) => <Icon e="👤" focused={focused} /> }} />
    </Tabs>
  );
}
