import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { Card, Avatar, InfoRow, Button, Divider } from "../../src/components/common/UI";
import { Colors, Spacing, Radius } from "../../src/theme";
import { BASE_URL } from "../../src/api/client";

const ROLE_META: Record<string, { emoji: string; color: string; label: string }> = {
  nurse:   { emoji: "👩‍⚕️", color: Colors.nurse,   label: "Nurse / Admin" },
  patient: { emoji: "🧑‍🦽", color: Colors.patient, label: "Patient" },
  family:  { emoji: "👨‍👩‍👧", color: Colors.family,  label: "Family Caregiver" },
};

export default function Profile() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const meta = ROLE_META[user?.role ?? "patient"];

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out", style: "destructive",
        onPress: async () => {
          setLoading(true);
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.title}>Profile</Text>
        <View style={s.avatarSection}>
          <Avatar emoji={meta.emoji} size={96} color={meta.color + "20"} />
          <Text style={s.userName}>{user?.name}</Text>
          <View style={[s.roleTag, { backgroundColor: meta.color + "15", borderColor: meta.color + "40" }]}>
            <Text style={[s.roleTagText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>

        <Card style={s.card}>
          <Text style={s.cardHeading}>Account Details</Text>
          <Divider />
          <InfoRow label="Name" value={user?.name ?? "—"} />
          <InfoRow label="Email" value={user?.email ?? "—"} />
          <InfoRow label="Role" value={meta.label} />
          <InfoRow label="User ID" value={user?._id ?? "—"} mono />
        </Card>

        <Card style={s.card}>
          <Text style={s.cardHeading}>Connection</Text>
          <Divider />
          <InfoRow label="API URL" value={BASE_URL} mono />
        </Card>

        <Button title="Sign Out" onPress={handleLogout} variant="danger" loading={loading} icon="🚪" />
        <Text style={s.version}>NurseCare+ · v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: "900", color: Colors.text },
  avatarSection: { alignItems: "center", paddingVertical: Spacing.md, gap: 10 },
  userName: { fontSize: 22, fontWeight: "800", color: Colors.text },
  roleTag: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1.5 },
  roleTagText: { fontSize: 13, fontWeight: "700" },
  card: { gap: 0 },
  cardHeading: { fontSize: 13, fontWeight: "700", color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: Spacing.sm },
  version: { textAlign: "center", fontSize: 12, color: Colors.textMuted, marginTop: 4 },
});
