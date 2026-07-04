import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { patientApi, Patient } from "../../../src/api";
import { useRoleGuard } from "../../../src/hooks/useRoleGuard";
import { getDietPlanForDiagnosis, DietItem } from "../../../src/data/dietPlans";
import { Card, Row, SectionHeader, LoadingScreen } from "../../../src/components/common/UI";
import { Colors, Spacing, Radius } from "../../../src/theme";

export default function Diet() {
  const guard = useRoleGuard(["patient"]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);

  const load = async () => {
    try {
      const { patient: p } = await patientApi.getMe();
      setPatient(p);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { if (!guard) load(); }, [guard]);
  if (guard) return guard;
  if (loading) return <LoadingScreen label="Loading your diet plan…" />;

  const plan = getDietPlanForDiagnosis(patient?.diagnosis);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.warning} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.header}>
          <Text style={s.title}>Diet Plan</Text>
          <View style={s.condBadge}><Text style={s.condText}>{plan.condition}</Text></View>
        </View>
        <Text style={s.sub}>Personalized based on your diagnosis{patient?.diagnosis ? `: ${patient.diagnosis.replace("_", " ")}` : "."}</Text>

        <SectionHeader title="✅ Eat This" />
        <View style={s.grid}>
          {plan.eat.map((item, i) => <FoodCard key={i} item={item} good />)}
        </View>

        <SectionHeader title="❌ Avoid This" />
        <View style={s.grid}>
          {plan.avoid.map((item, i) => <FoodCard key={i} item={item} good={false} />)}
        </View>

        <SectionHeader title="💡 Tips" />
        <Card style={s.tipsCard}>
          {plan.tips.map((tip, i) => (
            <Row key={i} style={s.tipRow}>
              <Text style={s.tipBullet}>•</Text>
              <Text style={s.tipText}>{tip}</Text>
            </Row>
          ))}
        </Card>

        <View style={s.noteCard}>
          <Text style={s.noteText}>ℹ️ This is a general guideline. Your nurse may customize this plan further based on your specific needs.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FoodCard({ item, good }: { item: DietItem; good: boolean }) {
  return (
    <Card style={{ ...s.foodCard, borderColor: good ? Colors.success + "30" : Colors.danger + "30" }}>
      <Text style={s.foodEmoji}>{item.emoji}</Text>
      <Text style={s.foodName}>{item.name}</Text>
      <Text style={[s.foodMark, { color: good ? Colors.success : Colors.danger }]}>{good ? "✓" : "✗"}</Text>
    </Card>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 40 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 26, fontWeight: "900", color: Colors.text },
  condBadge: { backgroundColor: Colors.warningLight, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 6 },
  condText: { fontSize: 12, fontWeight: "800", color: Colors.warning },
  sub: { fontSize: 13, color: Colors.textMuted, marginTop: -8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  foodCard: { width: "47%", alignItems: "center", paddingVertical: 16, gap: 6, borderWidth: 1.5 },
  foodEmoji: { fontSize: 32 },
  foodName: { fontSize: 12, fontWeight: "600", color: Colors.text, textAlign: "center" },
  foodMark: { fontSize: 16, fontWeight: "900", position: "absolute", top: 8, right: 10 },
  tipsCard: { gap: 10 },
  tipRow: { gap: 8, alignItems: "flex-start" },
  tipBullet: { fontSize: 16, color: Colors.warning, fontWeight: "900" },
  tipText: { fontSize: 13, color: Colors.text, flex: 1, lineHeight: 20 },
  noteCard: { backgroundColor: Colors.primaryLight, borderRadius: Radius.md, padding: Spacing.md },
  noteText: { fontSize: 12, color: Colors.primaryDark, lineHeight: 18 },
});
