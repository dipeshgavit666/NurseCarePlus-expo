import { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { patientApi } from "../../../src/api";
import { Input, Button, Card } from "../../../src/components/common/UI";
import { Colors, Spacing } from "../../../src/theme";

export default function CreatePatient() {
  const [form, setForm] = useState({
    name: "", dob: "", diagnosis: "", medicalHistory: "",
  });
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleCreate = async () => {
    if (!form.name.trim()) { Alert.alert("Required", "Patient name is required."); return; }
    try {
      setLoading(true);
      const { patient } = await patientApi.create(form);
      Alert.alert(
        "✅ Patient Created",
        `${patient.name} has been added.\n\nInvite Code: ${patient.inviteCode ?? "—"}\nQR Token: ${patient.qrToken ?? "—"}`,
        [{ text: "Done", onPress: () => router.replace("/(tabs)/nurse/patients") }]
      );
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          <View style={s.header}>
            <Text style={s.title}>New Patient</Text>
            <Text style={s.sub}>Fill in discharge details — a QR code will be generated.</Text>
          </View>

          <Card style={s.card}>
            <Text style={s.section}>Patient Info</Text>
            <Input label="Full Name *" placeholder="e.g. Ravi Sharma" value={form.name} onChangeText={set("name")} icon="👤" />
            <Input label="Date of Birth" placeholder="YYYY-MM-DD" value={form.dob} onChangeText={set("dob")} icon="🎂" />
            <Input
              label="Primary Diagnosis"
              placeholder="e.g. Hypertension, Type 2 Diabetes"
              value={form.diagnosis}
              onChangeText={set("diagnosis")}
              icon="🩺"
            />
            <Input
              label="Medical History / Notes"
              placeholder="Allergies, past conditions, special instructions…"
              value={form.medicalHistory}
              onChangeText={set("medicalHistory")}
              multiline
              numberOfLines={4}
              style={{ height: 100, textAlignVertical: "top" } as any}
              icon="📋"
            />
          </Card>

          <View style={s.info}>
            <Text style={s.infoText}>
              💡 After saving, you can assign medications, diet plans, and appointments from the patient's profile.
              A QR code and 6-digit invite code will be generated automatically.
            </Text>
          </View>

          <Button title="Create Patient & Generate QR" onPress={handleCreate} loading={loading} color={Colors.nurse} size="lg" icon="➕" />

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.bg },
  scroll:  { padding: Spacing.lg, gap: Spacing.md },
  header:  { },
  title:   { fontSize: 26, fontWeight: "900", color: Colors.text },
  sub:     { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  card:    { },
  section: { fontSize: 15, fontWeight: "800", color: Colors.nurse, marginBottom: Spacing.md },
  info:    { backgroundColor: Colors.primaryLight, borderRadius: 12, padding: 14 },
  infoText:{ fontSize: 13, color: Colors.primaryDark, lineHeight: 20 },
});
