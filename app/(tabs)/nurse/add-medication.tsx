import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { medicationApi } from "../../../src/api";
import { useRoleGuard } from "../../../src/hooks/useRoleGuard";
import { Input, Button, Card } from "../../../src/components/common/UI";
import { Colors, Spacing, Radius } from "../../../src/theme";

const PRESETS = [
  { label: "Morning", time: "08:00" },
  { label: "Afternoon", time: "14:00" },
  { label: "Evening", time: "18:00" },
  { label: "Night", time: "21:00" },
];

export default function AddMedication() {
  const guard = useRoleGuard(["nurse"]);
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [unit, setUnit] = useState("mg");
  const [instructions, setInstructions] = useState("");
  const [times, setTimes] = useState<string[]>([]);
  const [customTime, setCustomTime] = useState("");
  const [ongoing, setOngoing] = useState(true);
  const [saving, setSaving] = useState(false);

  if (guard) return guard;

  const toggleTime = (t: string) =>
    setTimes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t].sort());

  const addCustomTime = () => {
    const m = customTime.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    if (!m) { Alert.alert("Invalid time", "Use HH:MM, e.g. 09:30"); return; }
    const normalized = `${m[1].padStart(2, "0")}:${m[2]}`;
    if (!times.includes(normalized)) setTimes(prev => [...prev, normalized].sort());
    setCustomTime("");
  };

  const submit = async () => {
    if (!name.trim() || !dose.trim() || times.length === 0) {
      Alert.alert("Required", "Name, dose, and at least one time slot are required.");
      return;
    }
    try {
      setSaving(true);
      await medicationApi.create({
        patientId,
        name: name.trim(),
        dose: dose.trim(),
        unit,
        instructions: instructions.trim(),
        schedule: times.map(time => ({ time, taken: false })),
        isOngoing: ongoing,
        active: true,
      });
      Alert.alert("Saved", `${name} has been assigned.`);
      router.back();
    } catch (e: any) { Alert.alert("Error", e.message); }
    finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>Add Medication</Text>
        <Card>
          <Input label="Medicine Name *" value={name} onChangeText={setName} placeholder="e.g. Amlodipine" icon="💊" />
          <Input label="Dose *" value={dose} onChangeText={setDose} placeholder="e.g. 5" keyboardType="numeric" icon="⚖️" />

          <Text style={s.label}>Unit</Text>
          <View style={s.chipRow}>
            {["mg", "ml", "tab"].map(u => (
              <TouchableOpacity key={u} style={[s.chip, unit === u && s.chipActive]} onPress={() => setUnit(u)}>
                <Text style={[s.chipText, unit === u && s.chipTextActive]}>{u}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>Schedule *</Text>
          <View style={s.chipRow}>
            {PRESETS.map(p => (
              <TouchableOpacity key={p.time} style={[s.chip, times.includes(p.time) && s.chipActive]} onPress={() => toggleTime(p.time)}>
                <Text style={[s.chipText, times.includes(p.time) && s.chipTextActive]}>{p.label} ({p.time})</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Row style={{ gap: 8, alignItems: "flex-end" }}>
            <View style={{ flex: 1 }}>
              <Input label="Custom time (HH:MM)" value={customTime} onChangeText={setCustomTime} placeholder="e.g. 09:30" keyboardType="numbers-and-punctuation" />
            </View>
            <Button title="Add" onPress={addCustomTime} variant="outline" color={Colors.nurse} size="sm" style={{ marginBottom: Spacing.md }} />
          </Row>

          {times.length > 0 && (
            <View style={s.chipRow}>
              {times.map(t => (
                <TouchableOpacity key={t} style={[s.chip, s.chipActive]} onPress={() => toggleTime(t)}>
                  <Text style={[s.chipText, s.chipTextActive]}>{t} ✕</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Input label="Instructions" value={instructions} onChangeText={setInstructions} placeholder="e.g. Take after food" multiline numberOfLines={3} style={{ height: 80, textAlignVertical: "top" } as any} />

          <Button
            title={ongoing ? "Ongoing ✓  (tap to switch to fixed course)" : "Fixed course  (tap to switch to ongoing)"}
            variant="ghost"
            onPress={() => setOngoing(o => !o)}
          />
        </Card>
        <Button title="Save Medication" onPress={submit} loading={saving} color={Colors.nurse} size="lg" icon="💾" />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[{ flexDirection: "row" }, style]}>{children}</View>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "900", color: Colors.text },
  label: { fontSize: 13, fontWeight: "600", color: Colors.text, marginBottom: 6 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: Spacing.md },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.card },
  chipActive: { backgroundColor: Colors.nurse, borderColor: Colors.nurse },
  chipText: { fontSize: 12, fontWeight: "700", color: Colors.textSecondary },
  chipTextActive: { color: "#fff" },
});