import { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Image,
  Alert, KeyboardAvoidingView, Platform, TouchableOpacity, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { patientApi } from "../../../src/api";
import { useRoleGuard } from "../../../src/hooks/useRoleGuard";
import { Input, Button, Card } from "../../../src/components/common/UI";
import { Colors, Spacing, Radius } from "../../../src/theme";

// Must match the backend's strict Patient.diagnosis enum exactly, or Mongoose
// validation will reject the create request.
const DIAGNOSES: { key: string; label: string }[] = [
  { key: "hypertension", label: "Hypertension" },
  { key: "diabetes", label: "Diabetes" },
  { key: "heart_disease", label: "Heart Disease" },
  { key: "other", label: "Other" },
];

export default function CreatePatient() {
  const guard = useRoleGuard(["nurse"]);

  const [form, setForm] = useState({
    name: "", age: "", diagnosisDetails: "",
    contactName: "", contactPhone: "", contactRelation: "",
  });
  const [diagnosis, setDiagnosis] = useState("other");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ qrCode: string; inviteCode?: string; name: string } | null>(null);

  if (guard) return guard;

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleCreate = async () => {
    if (!form.name.trim() || !form.age.trim()) {
      Alert.alert("Required", "Patient name and age are required."); return;
    }
    const age = parseInt(form.age, 10);
    if (isNaN(age) || age <= 0) {
      Alert.alert("Invalid age", "Enter a valid age in years."); return;
    }
    try {
      setLoading(true);
      const emergencyContacts = form.contactName.trim()
        ? [{ name: form.contactName.trim(), phone: form.contactPhone.trim(), relation: form.contactRelation.trim() }]
        : [];
      const { patient, qrCode } = await patientApi.create({
        name: form.name.trim(),
        age,
        diagnosis: diagnosis as any,
        diagnosisDetails: form.diagnosisDetails.trim(),
        emergencyContacts,
      });
      setResult({ qrCode, inviteCode: patient.inviteCode, name: patient.name });
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
            <Input label="Age *" placeholder="e.g. 68" value={form.age} onChangeText={set("age")} keyboardType="number-pad" icon="🎂" />

            <Text style={s.label}>Primary Diagnosis *</Text>
            <View style={s.chipRow}>
              {DIAGNOSES.map(d => (
                <TouchableOpacity
                  key={d.key}
                  style={[s.chip, diagnosis === d.key && { backgroundColor: Colors.nurse, borderColor: Colors.nurse }]}
                  onPress={() => setDiagnosis(d.key)}
                >
                  <Text style={[s.chipText, diagnosis === d.key && { color: "#fff" }]}>{d.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="Diagnosis Details / Notes"
              placeholder="Allergies, past conditions, special instructions…"
              value={form.diagnosisDetails}
              onChangeText={set("diagnosisDetails")}
              multiline
              numberOfLines={4}
              style={{ height: 100, textAlignVertical: "top" } as any}
              icon="📋"
            />
          </Card>

          <Card style={s.card}>
            <Text style={s.section}>Emergency Contact (optional)</Text>
            <Input label="Name" placeholder="e.g. Priya Sharma" value={form.contactName} onChangeText={set("contactName")} icon="👤" />
            <Input label="Phone" placeholder="+91 9XXXXXXXXX" value={form.contactPhone} onChangeText={set("contactPhone")} keyboardType="phone-pad" icon="📞" />
            <Input label="Relation" placeholder="e.g. Daughter" value={form.contactRelation} onChangeText={set("contactRelation")} icon="👨‍👩‍👧" />
          </Card>

          <View style={s.info}>
            <Text style={s.infoText}>
              💡 After saving, you can assign medications and appointments from the patient's profile.
              A QR code and invite code will be generated automatically.
            </Text>
          </View>

          <Button title="Create Patient & Generate QR" onPress={handleCreate} loading={loading} color={Colors.nurse} size="lg" icon="➕" />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={!!result} animationType="slide" presentationStyle="pageSheet">
        {result && (
          <SafeAreaView style={s.resultSafe}>
            <ScrollView contentContainerStyle={s.resultScroll}>
              <Text style={s.resultEmoji}>✅</Text>
              <Text style={s.resultTitle}>{result.name} has been added</Text>
              <Text style={s.resultSub}>Show this QR code to the patient at discharge.</Text>

              <View style={s.qrWrap}>
                <Image source={{ uri: result.qrCode }} style={{ width: 220, height: 220 }} resizeMode="contain" />
              </View>

              {result.inviteCode && (
                <Card style={s.codeCard}>
                  <Text style={s.codeLabel}>Family invite code</Text>
                  <Text style={s.codeValue}>{result.inviteCode}</Text>
                  <Text style={s.codeHint}>Family members enter this code to link their account to this patient.</Text>
                </Card>
              )}

              <Button
                title="Done"
                onPress={() => { setResult(null); router.replace("/(tabs)/nurse/patients"); }}
                color={Colors.nurse}
                size="lg"
                style={{ marginTop: Spacing.lg }}
              />
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: Spacing.lg, gap: Spacing.md },
  header: {},
  title: { fontSize: 26, fontWeight: "900", color: Colors.text },
  sub: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  card: {},
  section: { fontSize: 15, fontWeight: "800", color: Colors.nurse, marginBottom: Spacing.md },
  label: { fontSize: 13, fontWeight: "600", color: Colors.text, marginBottom: 6 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: Spacing.md },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.card },
  chipText: { fontSize: 13, fontWeight: "700", color: Colors.textSecondary },
  info: { backgroundColor: Colors.primaryLight, borderRadius: 12, padding: 14 },
  infoText: { fontSize: 13, color: Colors.primaryDark, lineHeight: 20 },
  resultSafe: { flex: 1, backgroundColor: Colors.bg },
  resultScroll: { padding: Spacing.xl, alignItems: "center", gap: Spacing.sm },
  resultEmoji: { fontSize: 56 },
  resultTitle: { fontSize: 20, fontWeight: "900", color: Colors.text, textAlign: "center" },
  resultSub: { fontSize: 13, color: Colors.textMuted, textAlign: "center" },
  qrWrap: { backgroundColor: "#fff", padding: 16, borderRadius: Radius.lg, marginVertical: Spacing.md, ...Radius },
  codeCard: { width: "100%", alignItems: "center", gap: 4 },
  codeLabel: { fontSize: 12, color: Colors.textMuted },
  codeValue: { fontSize: 28, fontWeight: "900", color: Colors.nurse, letterSpacing: 2 },
  codeHint: { fontSize: 12, color: Colors.textMuted, textAlign: "center", marginTop: 4 },
});
