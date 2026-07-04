import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Alert, RefreshControl, Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { patientApi, healthApi, HealthLog } from "../../../src/api";
import { useRoleGuard } from "../../../src/hooks/useRoleGuard";
import {
  Card, Row, SectionHeader, EmptyState, LoadingScreen,
  Button, Input,
} from "../../../src/components/common/UI";
import { Colors, Spacing, Radius } from "../../../src/theme";

const W = Dimensions.get("window").width;
const CHART_W = W - 80;
const CHART_H = 120;

export default function Health() {
  const guard = useRoleGuard(["patient"]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "history">("overview");
  const [form, setForm] = useState({ systolic: "", diastolic: "", pulse: "", bloodSugar: "", weight: "", notes: "" });

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const init = async () => {
    try {
      const { patient } = await patientApi.getMe();
      setPatientId(patient._id);
      const { logs: list } = await healthApi.getForPatient(patient._id, 30);
      setLogs([...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch {} finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { if (!guard) init(); }, [guard]);
  if (guard) return guard;
  if (loading) return <LoadingScreen label="Loading health data…" />;

  const submitLog = async () => {
    if (!form.systolic && !form.pulse && !form.bloodSugar && !form.weight) {
      Alert.alert("Required", "Enter at least one health metric."); return;
    }
    try {
      setSaving(true);
      const { alerts } = await healthApi.log({
        patientId: patientId!,
        bp: (form.systolic && form.diastolic)
          ? { systolic: Number(form.systolic), diastolic: Number(form.diastolic) }
          : undefined,
        pulse: form.pulse ? Number(form.pulse) : undefined,
        bloodSugar: form.bloodSugar ? Number(form.bloodSugar) : undefined,
        weight: form.weight ? Number(form.weight) : undefined,
        notes: form.notes || undefined,
      });
      setShowModal(false);
      setForm({ systolic: "", diastolic: "", pulse: "", bloodSugar: "", weight: "", notes: "" });
      await init();
      if (alerts?.length) {
        Alert.alert("⚠️ Reading Out of Range", alerts.join("\n") + "\n\nYour nurse has been notified.");
      } else {
        Alert.alert("✅ Logged", "Health data saved successfully.");
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally { setSaving(false); }
  };

  const today = logs.find(l => new Date(l.date).toDateString() === new Date().toDateString());
  const last7 = [...logs].slice(0, 7).reverse();
  const pulseData = last7.map(l => l.pulse ?? 0);
  const bsData = last7.map(l => l.bloodSugar ?? 0);
  const wtData = last7.map(l => l.weight ?? 0);

  const getStatus = () => {
    if (!today) return { label: "Not Logged", color: Colors.textMuted };
    if (today.pulse && (today.pulse > 100 || today.pulse < 60)) return { label: "Monitor ⚠️", color: Colors.warning };
    if (today.bloodSugar && today.bloodSugar > 180) return { label: "High Sugar ⚠️", color: Colors.warning };
    if (today.bp && (today.bp.systolic > 140 || today.bp.diastolic > 90)) return { label: "High BP ⚠️", color: Colors.warning };
    return { label: "Stable ✓", color: Colors.success };
  };
  const status = getStatus();

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Health Log</Text>
        <Button title="+ Log Now" onPress={() => setShowModal(true)} size="sm" color={Colors.success} />
      </View>

      <View style={s.tabs}>
        {(["overview", "history"] as const).map(tab => (
          <TouchableOpacity key={tab} style={[s.tab, activeTab === tab && s.tabActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>{tab === "overview" ? "Overview" : "History"}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); init(); }} tintColor={Colors.success} />}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "overview" ? (
          <>
            <Card style={{ ...s.statusCard, borderLeftColor: status.color, borderLeftWidth: 5 }}>
              <Row style={{ gap: 12 }}>
                <Text style={{ fontSize: 32 }}>{status.label.includes("Stable") ? "💚" : status.label.includes("Not") ? "📋" : "⚠️"}</Text>
                <View>
                  <Text style={s.statusLabel}>Today's Status</Text>
                  <Text style={[s.statusValue, { color: status.color }]}>{status.label}</Text>
                </View>
              </Row>
            </Card>

            <SectionHeader title="Today's Vitals" />
            {today ? (
              <View style={s.vitalsGrid}>
                <VitalCard emoji="🩸" label="Blood Pressure" value={today.bp ? `${today.bp.systolic}/${today.bp.diastolic}` : "—"} unit="mmHg" color={Colors.danger} />
                <VitalCard emoji="🫀" label="Pulse" value={today.pulse?.toString() ?? "—"} unit="bpm" color={Colors.primary} />
                <VitalCard emoji="🍬" label="Blood Sugar" value={today.bloodSugar?.toString() ?? "—"} unit="mg/dL" color={Colors.warning} />
                <VitalCard emoji="⚖️" label="Weight" value={today.weight?.toString() ?? "—"} unit="kg" color={Colors.success} />
              </View>
            ) : (
              <Card style={s.noLogCard}>
                <Text style={s.noLogEmoji}>📋</Text>
                <Text style={s.noLogTitle}>No log for today</Text>
                <Text style={s.noLogSub}>Tap "Log Now" to record your vitals</Text>
                <Button title="Log Vitals Now" onPress={() => setShowModal(true)} color={Colors.success} style={{ marginTop: 12 }} />
              </Card>
            )}

            {last7.length >= 2 && (
              <>
                <SectionHeader title="7-Day Trends" />
                <Card style={s.chartCard}><Text style={s.chartLabel}>🫀  Pulse (bpm)</Text><LineChart data={pulseData} color={Colors.primary} /></Card>
                <Card style={s.chartCard}><Text style={s.chartLabel}>🍬  Blood Sugar (mg/dL)</Text><LineChart data={bsData} color={Colors.warning} /></Card>
                <Card style={s.chartCard}><Text style={s.chartLabel}>⚖️  Weight (kg)</Text><LineChart data={wtData} color={Colors.success} /></Card>
              </>
            )}
          </>
        ) : (
          <>
            {logs.length === 0
              ? <EmptyState emoji="📊" title="No health logs yet" subtitle="Your logged vitals will appear here." />
              : logs.map(log => (
                  <Card key={log._id} style={s.histCard}>
                    <Text style={s.histDate}>
                      {new Date(log.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                    </Text>
                    <View style={s.histVitals}>
                      {log.bp && <HistVital emoji="🩸" value={`${log.bp.systolic}/${log.bp.diastolic}`} unit="" />}
                      {log.pulse != null && <HistVital emoji="🫀" value={`${log.pulse}`} unit="bpm" />}
                      {log.bloodSugar != null && <HistVital emoji="🍬" value={`${log.bloodSugar}`} unit="mg/dL" />}
                      {log.weight != null && <HistVital emoji="⚖️" value={`${log.weight}`} unit="kg" />}
                    </View>
                    {log.notes && <Text style={s.histNotes}>"{log.notes}"</Text>}
                  </Card>
                ))
            }
          </>
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Log Health Data</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}><Text style={s.closeBtn}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={s.modalSub}>Enter one or more vitals below.</Text>
            <Row style={{ gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Input label="🩸 Systolic" placeholder="120" value={form.systolic} onChangeText={set("systolic")} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Input label="Diastolic" placeholder="80" value={form.diastolic} onChangeText={set("diastolic")} keyboardType="numeric" />
              </View>
            </Row>
            <Input label="🫀 Pulse (bpm)" placeholder="e.g. 72" value={form.pulse} onChangeText={set("pulse")} keyboardType="numeric" />
            <Input label="🍬 Blood Sugar (mg/dL)" placeholder="e.g. 110" value={form.bloodSugar} onChangeText={set("bloodSugar")} keyboardType="numeric" />
            <Input label="⚖️ Weight (kg)" placeholder="e.g. 68" value={form.weight} onChangeText={set("weight")} keyboardType="decimal-pad" />
            <Input label="📝 Notes" placeholder="Any symptoms, observations…" value={form.notes} onChangeText={set("notes")} multiline numberOfLines={3} style={{ height: 80, textAlignVertical: "top" } as any} />
            <Button title="Save Health Log" onPress={submitLog} loading={saving} color={Colors.success} size="lg" icon="💾" />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function VitalCard({ emoji, label, value, unit, color }: { emoji: string; label: string; value: string; unit: string; color: string }) {
  return (
    <Card style={{ ...s.vitalCard, borderTopColor: color, borderTopWidth: 3 }}>
      <Text style={s.vitalEmoji}>{emoji}</Text>
      <Text style={[s.vitalValue, { color }]}>{value}</Text>
      {unit ? <Text style={s.vitalUnit}>{unit}</Text> : null}
      <Text style={s.vitalLabel}>{label}</Text>
    </Card>
  );
}

function HistVital({ emoji, value, unit }: { emoji: string; value: string; unit: string }) {
  return <View style={s.hv}><Text style={s.hvText}>{emoji} {value}{unit ? ` ${unit}` : ""}</Text></View>;
}

function LineChart({ data, color }: { data: number[]; color: string }) {
  const nonZero = data.filter(d => d > 0);
  if (nonZero.length < 2) {
    return <Text style={{ color: Colors.textMuted, fontSize: 12, textAlign: "center", paddingVertical: 12 }}>Not enough data yet</Text>;
  }
  const min = Math.min(...nonZero);
  const max = Math.max(...nonZero);
  const range = max - min || 1;
  const pts = data.map(v => v > 0 ? 1 - (v - min) / range : 0.5);

  return (
    <View style={{ marginTop: 8 }}>
      <View style={{ height: CHART_H, position: "relative" }}>
        {pts.map((pt, i) => {
          if (i === 0) return null;
          const prev = pts[i - 1];
          const x1 = ((i - 1) / (pts.length - 1)) * CHART_W;
          const x2 = (i / (pts.length - 1)) * CHART_W;
          const y1 = prev * (CHART_H - 20) + 10;
          const y2 = pt * (CHART_H - 20) + 10;
          const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
          const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
          return (
            <View key={i} style={{ position: "absolute", left: x1, top: y1, width: len, height: 2.5, backgroundColor: color, borderRadius: 2, transform: [{ rotate: `${angle}deg` }, { translateY: -1 }], transformOrigin: "0 50%" }} />
          );
        })}
        {pts.map((pt, i) => (
          <View key={`dot-${i}`} style={{ position: "absolute", left: (i / (pts.length - 1)) * CHART_W - 5, top: pt * (CHART_H - 20) + 10 - 5, width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
        {data.map((v, i) => (
          <Text key={i} style={{ fontSize: 10, color: Colors.textMuted, width: CHART_W / data.length, textAlign: "center" }}>{v > 0 ? v : "—"}</Text>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: Spacing.lg, paddingBottom: 0 },
  title: { fontSize: 26, fontWeight: "900", color: Colors.text },
  tabs: { flexDirection: "row", margin: Spacing.md, backgroundColor: Colors.divider, borderRadius: Radius.md, padding: 3 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: Radius.sm - 2, alignItems: "center" },
  tabActive: { backgroundColor: Colors.card },
  tabText: { fontSize: 13, fontWeight: "600", color: Colors.textMuted },
  tabTextActive: { color: Colors.text, fontWeight: "800" },
  scroll: { padding: Spacing.md, gap: Spacing.md, paddingBottom: 40 },
  statusCard: {},
  statusLabel: { fontSize: 12, color: Colors.textMuted, fontWeight: "600" },
  statusValue: { fontSize: 18, fontWeight: "900" },
  vitalsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  vitalCard: { width: "47%", alignItems: "center", paddingVertical: 16, gap: 4 },
  vitalEmoji: { fontSize: 26 },
  vitalValue: { fontSize: 20, fontWeight: "900" },
  vitalUnit: { fontSize: 11, color: Colors.textMuted },
  vitalLabel: { fontSize: 11, color: Colors.textMuted, textAlign: "center" },
  noLogCard: { alignItems: "center", paddingVertical: Spacing.xl },
  noLogEmoji: { fontSize: 48, marginBottom: 8 },
  noLogTitle: { fontSize: 18, fontWeight: "800", color: Colors.text },
  noLogSub: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  chartCard: {},
  chartLabel: { fontSize: 13, fontWeight: "700", color: Colors.text, marginBottom: 4 },
  histCard: {},
  histDate: { fontSize: 13, fontWeight: "800", color: Colors.text, marginBottom: 8 },
  histVitals: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  hv: { backgroundColor: Colors.bg, borderRadius: Radius.sm, paddingHorizontal: 10, paddingVertical: 5 },
  hvText: { fontSize: 12, fontWeight: "600", color: Colors.text },
  histNotes: { fontSize: 12, color: Colors.textMuted, fontStyle: "italic", marginTop: 8 },
  modal: { flex: 1, backgroundColor: Colors.bg },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 20, fontWeight: "900", color: Colors.text },
  closeBtn: { fontSize: 20, color: Colors.textMuted, padding: 4 },
  modalBody: { padding: Spacing.lg, gap: 4, paddingBottom: 40 },
  modalSub: { fontSize: 13, color: Colors.textMuted, marginBottom: Spacing.sm },
});
