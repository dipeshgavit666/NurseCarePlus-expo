import { Tabs, Redirect } from "expo-router";
import { Text, Platform } from "react-native";
import { useAuth } from "../../src/context/AuthContext";
import { Colors } from "../../src/theme";
import { LoadingScreen } from "../../src/components/common/UI";

function Icon({ e, focused }: { e: string; focused: boolean }) {
  return <Text style={{ fontSize: focused ? 22 : 19, opacity: focused ? 1 : 0.4 }}>{e}</Text>;
}

export default function TabsLayout() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Redirect href="/(auth)/login" />;

  const roleColor =
    user.role === "nurse" ? Colors.nurse :
    user.role === "family" ? Colors.family :
    Colors.patient;

  const isNurse = user.role === "nurse";
  const isFamily = user.role === "family";
  const isPatient = user.role === "patient";

  
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
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 9, fontWeight: "700", marginBottom: Platform.OS === "ios" ? 0 : 6 },
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home", tabBarIcon: ({ focused }) => <Icon e="🏠" focused={focused} /> }} />

      <Tabs.Screen name="nurse/home" options={{ href: null }} />
      <Tabs.Screen name="patient/home" options={{ href: null }} />

      <Tabs.Screen name="nurse/patients" options={{ title: "Patients", tabBarIcon: ({ focused }) => <Icon e="🧑‍🦽" focused={focused} />, href: isNurse ? undefined : null }} />
      <Tabs.Screen name="nurse/create-patient" options={{ title: "New", tabBarIcon: ({ focused }) => <Icon e="➕" focused={focused} />, href: isNurse ? undefined : null }} />
      <Tabs.Screen name="nurse/patient-detail" options={{ href: null }} />
      <Tabs.Screen name="nurse/add-medication" options={{ href: null }} />
      <Tabs.Screen name="nurse/add-appointment" options={{ href: null }} />
      <Tabs.Screen name="nurse/edit-diet" options={{ href: null }} />

      <Tabs.Screen name="patient/medications" options={{ title: "Meds", tabBarIcon: ({ focused }) => <Icon e="💊" focused={focused} />, href: isPatient ? undefined : null }} />
      <Tabs.Screen name="patient/health" options={{ title: "Health", tabBarIcon: ({ focused }) => <Icon e="❤️" focused={focused} />, href: isPatient ? undefined : null }} />
      <Tabs.Screen name="patient/diet" options={{ title: "Diet", tabBarIcon: ({ focused }) => <Icon e="🥗" focused={focused} />, href: isPatient ? undefined : null }} />
      <Tabs.Screen name="patient/appointments" options={{ title: "Calendar", tabBarIcon: ({ focused }) => <Icon e="📅" focused={focused} />, href: (isPatient || isNurse) ? undefined : null }} />
      <Tabs.Screen name="patient/sos" options={{ title: "SOS", tabBarIcon: ({ focused }) => <Icon e="🆘" focused={focused} />, href: isPatient ? undefined : null }} />

      <Tabs.Screen name="family/dashboard" options={{ title: "Dashboard", tabBarIcon: ({ focused }) => <Icon e="👨‍👩‍👧" focused={focused} />, href: isFamily ? undefined : null }} />
      <Tabs.Screen name="family/home" options={{ href: null }} />

      <Tabs.Screen name="nurse/add-medication" options={{ href: null }} />

      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ focused }) => <Icon e="👤" focused={focused} /> }} />
    </Tabs>
  );
}
