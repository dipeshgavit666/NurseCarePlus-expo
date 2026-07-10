import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { patientApi, Patient } from "../../../src/api";
import { useRoleGuard } from "../../../src/hooks/useRoleGuard";
import { getDietPlanForDiagnosis } from "../../../src/data/dietPlans";
import { Input, Button, Card, LoadingScreen, Row, SectionHeader } from "../../../src/components/common/UI";
import { Colors, Spacing, Radius } from "../../../src/theme";

export default function EditDiet() {
  const guard = useRoleGuard(["nurse"]);
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [eatText, setEatText] = useState("");
  const [avoidText, setAvoidText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (guard || !patientId) return;
    (async () => {
      try {
        const { patient: p } = await patientApi.getById(patientId);
        setPatient(p);
        setEatText((p.customDiet?.eat ?? []).join(", "));
        setAvoidText((p.customDiet?.avoid ?? []).join(", "));
      } catch (e: any) { Alert.alert("Error", e.message); }
      finally { setLoading(false); }
    })();
  }, [guard, patientId]);

  if (guard) return guard;
  if (loading) return <LoadingScreen label="Loading diet plan…" />;
  if (!patient) return null;

  const basePlan = getDietPlanForDiagnosis(patient.diagnosis);

  const submit = async () => {
    const eat = eatText.split(",").map(s => s.trim()).filter(Boolean);
    const avoid = avoidText.split(",").map(s => s.trim()).filter(Boolean);
    try {
      setSaving(true);
      await patientApi.updateDiet(patient._id, { eat, avoid });
      Alert.alert("Saved", "Diet plan updated.");
      router.back();
    } catch (e: any) { Alert.alert("Error", e.message); }
    finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>Customize Diet Plan</Text>
        <Text style={s.sub}>Base plan for {patient.diagnosis?.replace("_", " ") ?? "—"} is applied automatically. Add extra items below — they're added on top, not a replacement.</Text>

        <SectionHeader title="Base plan (read-only reference)" />
        <Card>
          <Text style={s.baseLabel}>✅ Eat: {basePlan.eat.map(i => i.name).join(", ")}</Text>
          <Text style={[s.baseLabel, { marginTop: 8 }]}>❌ Avoid: {basePlan.avoid.map(i => i.name).join(", ")}</Text>
        </Card>

        <SectionHeader title="Additional items for this patient" />
        <Card>
          <Input
            label="Extra foods to EAT (comma separated)"
            placeholder="e.g. Papaya, Ragi porridge"
            value={eatText}
            onChangeText={setEatText}
            multiline
            numberOfLines={3}
            style={{ height: 80, textAlignVertical: "top" } as any}
          />
          <Input
            label="Extra foods to AVOID (comma separated)"
            placeholder="e.g. Pickles, Papad"
            value={avoidText}
            onChangeText={setAvoidText}
            multiline
            numberOfLines={3}
            style={{ height: 80, textAlignVertical: "top" } as any}
          />
        </Card>

        <Button title="Save Diet Plan" onPress={submit} loading={saving} color={Colors.nurse} size="lg" />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "900", color: Colors.text },
  sub: { fontSize: 13, color: Colors.textMuted, lineHeight: 20 },
  baseLabel: { fontSize: 13, color: Colors.text, lineHeight: 20 },
});