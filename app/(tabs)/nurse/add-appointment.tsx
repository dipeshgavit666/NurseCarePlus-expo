import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { appointmentApi, Appointment } from "../../../src/api";
import { useRoleGuard } from "../../../src/hooks/useRoleGuard";
import { Input, Button, Card, Row } from "../../../src/components/common/UI";
import { DateTimeField } from "../../../src/components/common/DateTimeField";
import { Colors, Spacing, Radius } from "../../../src/theme";

const TYPES: { key: Appointment["type"]; label: string; emoji: string; color: string }[] = [
  { key: "follow_up", label: "Follow-up", emoji: "🩺", color: Colors.primary },
  { key: "lab_test", label: "Lab Test", emoji: "🧪", color: Colors.warning },
  { key: "hospital_visit", label: "Hospital Visit", emoji: "🏥", color: Colors.danger },
];

export default function NurseAddAppointment() {
  const guard = useRoleGuard(["nurse"]);
  const params = useLocalSearchParams<{ patientId: string | string[] }>();
  const patientId = Array.isArray(params.patientId) ? params.patientId[0] : params.patientId;
  const [type, setType] = useState<Appointment["type"]>("follow_up");
  const [title, setTitle] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [facilityName, setFacilityName] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [dateTime, setDateTime] = useState(new Date());
  const [saving, setSaving] = useState(false);

  if (guard) return guard;

  const submit = async () => {
    if (!title.trim() || !facilityName.trim() || !address.trim()) {
      Alert.alert("Required", "Title, facility, and address are required.");
      return;
    }
    try {
      setSaving(true);
      await appointmentApi.create({
        patientId,
        type,
        title: title.trim(),
        doctorName: doctorName.trim() || undefined,
        facilityName: facilityName.trim(),
        address: address.trim(),
        dateTime: dateTime.toISOString() as any,
        notes: notes.trim() || undefined,
        completed: false,
      });
      Alert.alert("Saved", "Appointment scheduled.");
      router.back();
    } catch (e: any) { Alert.alert("Error", e.message); }
    finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>Add Appointment</Text>
        <Card>
          <Text style={s.label}>Type</Text>
          <Row style={{ gap: 8, marginBottom: Spacing.md, flexWrap: "wrap" }}>
            {TYPES.map(t => (
              <TouchableOpacity key={t.key} style={[s.chip, type === t.key && { backgroundColor: t.color, borderColor: t.color }]} onPress={() => setType(t.key)}>
                <Text style={[s.chipText, type === t.key && { color: "#fff" }]}>{t.emoji} {t.label}</Text>
              </TouchableOpacity>
            ))}
          </Row>

          <Input label="Title *" placeholder="e.g. Cardiology Follow-up" value={title} onChangeText={setTitle} />
          <Input label="Doctor Name" placeholder="e.g. Dr. Mehta" value={doctorName} onChangeText={setDoctorName} />
          <Input label="Facility / Lab Name *" placeholder="e.g. City Hospital" value={facilityName} onChangeText={setFacilityName} />
          <Input label="Address *" placeholder="e.g. 12 MG Road" value={address} onChangeText={setAddress} />

          <DateTimeField label="Date & Time *" value={dateTime} onChange={setDateTime} />

          <Input label="Notes" placeholder="Bring previous reports…" value={notes} onChangeText={setNotes} multiline numberOfLines={3} style={{ height: 80, textAlignVertical: "top" } as any} />
        </Card>
        <Button title="Create Appointment" onPress={submit} loading={saving} color={Colors.nurse} size="lg" />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "900", color: Colors.text },
  label: { fontSize: 13, fontWeight: "600", color: Colors.text, marginBottom: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.card },
  chipText: { fontSize: 12, fontWeight: "700", color: Colors.textSecondary },
});