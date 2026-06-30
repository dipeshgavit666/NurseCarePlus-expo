import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Alert, RefreshControl, Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { patientApi, healthApi, HealthLog } from "../../../src/api";
import { useAuth } from "../../../src/context/AuthContext";
import {
  Card, Row, SectionHeader, EmptyState, LoadingScreen,
  Button, Input, Badge,
} from "../../../src/components/common/UI";
import { Colors, Spacing, Radius } from "../../../src/theme";

const W = Dimensions.get("window").width;
const CHART_W = W - 80;
const CHART_H = 120;

export default function Health() {
  const { user } = useAuth();
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs]             = useState<HealthLog[]>([]);
  const [patientId, setPatientId]   = useState<string | null>(null);
  const [showModal, setShowModal]   = useState(false);
  const [saving, setSaving]         = useState(false);
  const [activeTab, setActiveTab]   = useState<"overview" | "history">("overview");
  const [form, setForm] = useState({ bp: "", heartRate: "", bloodSugar: "", weight: "", notes: "" });

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const init = async () => {
    try {
      const { patient } = await patientApi.getMe();
      setPatientId(patient._id);
      const { logs: list } = await healthApi.getForPatient(patient._id);
      setLogs(list.slice(0, 30)); // last 30 entries
    } catch {} finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { init(); }, []);

  const submitLog = async () => {
    if (!form.bp && !form.heartRate && !form.bloodSugar && !form.weight) {
      Alert.alert("Required", "Enter at least one health metric."); return;
    }
    try {
      setSaving(true);
      await healthApi.log({
        patientId: patientId!,
        bp:         form.bp || undefined,
        heartRate:  form.heartRate  ? Number(form.heartRate)  : undefined,
        bloodSugar: form.bloodSugar ? Number(form.bloodSugar) : undefined,
        weight:     form.weight     ? Number(form.weight)     : undefined,
        notes:      form.notes || undefined,
      });
      setShowModal(false);
      setForm({ bp: "", heartRate: "", bloodSugar: "", weight: "", notes: "" });
      await init();
      Alert.alert("✅ Logged", "Health data saved successfully.");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally { setSaving(false); }
  };

  if (loading) return <LoadingScreen label="Loading health data…" />;

  const today = logs.find(l => new Date(l.loggedAt).toDateString() === new Date().toDateString());

  // Build chart data (last 7 logs, reversed to show oldest→newest)
  const last7 = [...logs].slice(0, 7).reverse();

  const hrData  = last7.map(l => l.heartRate  ?? 0);
  const bsData  = last7.map(l => l.bloodSugar ?? 0);
  const wtData  = last7.map(l => l.weight     ?? 0);

  // Determine status
  const getStatus = () => {
    if (!today) return { label: "Not Logged", color: Colors.textMuted };
    if (today.heartRate && today.heartRate > 100) return { label: "Monitor ⚠️", color: Colors.warning };
    if (today.bloodSugar && today.bloodSugar > 200) return { label: "High Sugar ⚠️", color: Colors.warning };
    return { label: "Stable ✓", color: Colors.success };
  };
  const status = getStatus();

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Health Log</Text>
        <Button title="+ Log Now" onPress={() => setShowModal(true)} size="sm" color={Colors.success} />
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {(["overview", "history"] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[s.tab, activeTab === tab && s.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
              {tab === "overview" ? "Overview" : "History"}
            </Text>
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
            {/* Today's status */}
            <Card style={StyleSheet.flatten([s.statusCard, { borderLeftColor: status.color, borderLeftWidth: 5 }])}>\
              <Row style={{ gap: 12 }}>
                <Text style={{ fontSize: 32 }}>{status.label.includes("Stable") ? "💚" : status.label.includes("Monitor") ? "⚠️" : "📋"}</Text>
                <View>
                  <Text style={s.statusLabel}>Today's Status</Text>
                  <Text style={[s.statusValue, { color: status.color }]}>{status.label}</Text>
                </View>
              </Row>
            </Card>

            {/* Today's vitals grid */}
            <SectionHeader title="Today's Vitals" />
            {today ? (
              <View style={s.vitalsGrid}>
                <VitalCard emoji="🩸" label="Blood Pressure" value={today.bp ?? "—"}        unit=""        color={Colors.danger}  />
                <VitalCard emoji="🫀" label="Heart Rate"     value={today.heartRate?.toString() ?? "—"} unit="bpm"    color={Colors.primary} />
                <VitalCard emoji="🍬" label="Blood Sugar"    value={today.bloodSugar?.toString() ?? "—"} unit="mg/dL" color={Colors.warning} />
                <VitalCard emoji="⚖️" label="Weight"         value={today.weight?.toString() ?? "—"}     unit="kg"    color={Colors.success} />
              </View>
            ) : (
              <Card style={s.noLogCard}>
                <Text style={s.noLogEmoji}>📋</Text>
                <Text style={s.noLogTitle}>No log for today</Text>
                <Text style={s.noLogSub}>Tap "Log Now" to record your vitals</Text>
                <Button title="Log Vitals Now" onPress={() => setShowModal(true)} color={Colors.success} style={{ marginTop: 12 }} />
              </Card>
            )}

            {/* Trend charts */}
            {last7.length >= 2 && (
              <>
                <SectionHeader title="7-Day Trends" />
                <Card style={s.chartCard}>
                  <Text style={s.chartLabel}>❤️  Heart Rate (bpm)</Text>
                  <LineChart data={hrData} color={Colors.primary} />
                </Card>
                <Card style={s.chartCard}>
                  <Text style={s.chartLabel}>🍬  Blood Sugar (mg/dL)</Text>
                  <LineChart data={bsData} color={Colors.warning} />
                </Card>
                <Card style={s.chartCard}>
                  <Text style={s.chartLabel}>⚖️  Weight (kg)</Text>
                  <LineChart data={wtData} color={Colors.success} />
                </Card>
              </>
            )}

            {/* Danger signs */}
            <DangerSignsCard todayLog={today} />
          </>
        ) : (
          /* History list */
          <>
            {logs.length === 0
              ? <EmptyState emoji="📊" title="No health logs yet" subtitle="Your logged vitals will appear here." />
              : logs.map(log => (
                  <Card key={log._id} style={s.histCard}>
                    <Text style={s.histDate}>
                      {new Date(log.loggedAt).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                      {"  "}
                      <Text style={{ color: Colors.textMuted }}>
                        {new Date(log.loggedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    </Text>
                    <View style={s.histVitals}>
                      {log.bp          && <HistVital emoji="🩸" value={log.bp}          unit="" />}
                      {log.heartRate   && <HistVital emoji="🫀" value={`${log.heartRate}`}   unit="bpm" />}
                      {log.bloodSugar  && <HistVital emoji="🍬" value={`${log.bloodSugar}`}  unit="mg/dL" />}
                      {log.weight      && <HistVital emoji="⚖️" value={`${log.weight}`}      unit="kg" />}
                    </View>
                    {log.notes && <Text style={s.histNotes}>"{log.notes}"</Text>}
                  </Card>
                ))
            }
          </>
        )}
      </ScrollView>

      {/* Log vitals modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Log Health Data</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={s.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={s.modalSub}>Enter one or more vitals below.</Text>
            <Input label="🩸 Blood Pressure" placeholder="e.g. 120/80" value={form.bp} onChangeText={set("bp")} />
            <Input label="🫀 Heart Rate (bpm)" placeholder="e.g. 72" value={form.heartRate} onChangeText={set("heartRate")} keyboardType="numeric" />
            <Input label="🍬 Blood Sugar (mg/dL)" placeholder="e.g. 110" value={form.bloodSugar} onChangeText={set("bloodSugar")} keyboardType="numeric" />
            <Input label="⚖️ Weight (kg)" placeholder="e.g. 68" value={form.weight} onChangeText={set("weight")} keyboardType="decimal-pad" />
            <Input
              label="📝 Notes"
              placeholder="Any symptoms, observations…"
              value={form.notes}
              onChangeText={set("notes")}
              multiline
              numberOfLines={3}
              style={{ height: 80, textAlignVertical: "top" } as any}
            />
            <Button title="Save Health Log" onPress={submitLog} loading={saving} color={Colors.success} size="lg" icon="💾" />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function VitalCard({ emoji, label, value, unit, color }: { emoji: string; label: string; value: string; unit: string; color: string }) {
  return (
    <Card style={StyleSheet.flatten([s.vitalCard, { borderTopColor: color, borderTopWidth: 3 }])}>
      <Text style={s.vitalEmoji}>{emoji}</Text>
      <Text style={[s.vitalValue, { color }]}>{value}</Text>
      {unit ? <Text style={s.vitalUnit}>{unit}</Text> : null}
      <Text style={s.vitalLabel}>{label}</Text>
    </Card>
  );
}

function HistVital({ emoji, value, unit }: { emoji: string; value: string; unit: string }) {
  return (
    <View style={s.hv}>
      <Text style={s.hvText}>{emoji} {value}{unit ? ` ${unit}` : ""}</Text>
    </View>
  );
}

function DangerSignsCard({ todayLog }: { todayLog?: HealthLog }) {
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const signs = [
    { key: "chest",    label: "Chest pain or tightness" },
    { key: "breath",   label: "Shortness of breath" },
    { key: "dizzy",    label: "Dizziness or fainting" },
    { key: "swelling", label: "Sudden swelling in legs/feet" },
    { key: "vision",   label: "Blurred vision" },
    { key: "fever",    label: "High fever (>38.5°C)" },
  ];
  const anyYes = Object.values(answers).some(Boolean);

  return (
    <Card style={StyleSheet.flatten([s.dangerCard, anyYes && { borderColor: Colors.danger, borderWidth: 2 }])}>
      <Text style={s.dangerTitle}>⚠️  Danger Signs Checklist</Text>
      <Text style={s.dangerSub}>Are you experiencing any of the following?</Text>
      {signs.map(sign => (
        <TouchableOpacity
          key={sign.key}
          style={s.signRow}
          onPress={() => setAnswers(a => ({ ...a, [sign.key]: !a[sign.key] }))}
        >
          <View style={[s.signCheck, answers[sign.key] && { backgroundColor: Colors.danger, borderColor: Colors.danger }]}>
            {answers[sign.key] && <Text style={s.signCheckMark}>✓</Text>}
          </View>
          <Text style={[s.signLabel, answers[sign.key] && { color: Colors.danger, fontWeight: "700" }]}>{sign.label}</Text>
        </TouchableOpacity>
      ))}
      {anyYes && (
        <View style={s.dangerAlert}>
          <Text style={s.dangerAlertText}>🚨 Please contact your doctor or press SOS immediately.</Text>
          <Button title="🆘 Emergency SOS" onPress={() => Alert.alert("SOS", "SOS triggered!")} variant="danger" style={{ marginTop: 10 }} />
        </View>
      )}
    </Card>
  );
}

/** Minimal SVG-free sparkline using View widths */
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
            <View
              key={i}
              style={{
                position: "absolute",
                left: x1,
                top: y1,
                width: len,
                height: 2.5,
                backgroundColor: color,
                borderRadius: 2,
                transform: [{ rotate: `${angle}deg` }, { translateY: -1 }],
                transformOrigin: "0 50%",
              }}
            />
          );
        })}
        {pts.map((pt, i) => (
          <View
            key={`dot-${i}`}
            style={{
              position: "absolute",
              left: (i / (pts.length - 1)) * CHART_W - 5,
              top: pt * (CHART_H - 20) + 10 - 5,
              width: 10, height: 10,
              borderRadius: 5,
              backgroundColor: color,
            }}
          />
        ))}
      </View>
      {/* X axis labels */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
        {data.map((v, i) => (
          <Text key={i} style={{ fontSize: 10, color: Colors.textMuted, width: CHART_W / data.length, textAlign: "center" }}>
            {v > 0 ? v : "—"}
          </Text>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: Colors.bg },
  header:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: Spacing.lg, paddingBottom: 0 },
  title:         { fontSize: 26, fontWeight: "900", color: Colors.text },
  tabs:          { flexDirection: "row", margin: Spacing.md, backgroundColor: Colors.divider, borderRadius: Radius.md, padding: 3 },
  tab:           { flex: 1, paddingVertical: 8, borderRadius: Radius.sm - 2, alignItems: "center" },
  tabActive:     { backgroundColor: Colors.card },
  tabText:       { fontSize: 13, fontWeight: "600", color: Colors.textMuted },
  tabTextActive: { color: Colors.text, fontWeight: "800" },
  scroll:        { padding: Spacing.md, gap: Spacing.md, paddingBottom: 40 },
  statusCard:    { },
  statusLabel:   { fontSize: 12, color: Colors.textMuted, fontWeight: "600" },
  statusValue:   { fontSize: 18, fontWeight: "900" },
  vitalsGrid:    { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  vitalCard:     { width: "47%", alignItems: "center", paddingVertical: 16, gap: 4 },
  vitalEmoji:    { fontSize: 26 },
  vitalValue:    { fontSize: 20, fontWeight: "900" },
  vitalUnit:     { fontSize: 11, color: Colors.textMuted },
  vitalLabel:    { fontSize: 11, color: Colors.textMuted, textAlign: "center" },
  noLogCard:     { alignItems: "center", paddingVertical: Spacing.xl },
  noLogEmoji:    { fontSize: 48, marginBottom: 8 },
  noLogTitle:    { fontSize: 18, fontWeight: "800", color: Colors.text },
  noLogSub:      { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  chartCard:     { },
  chartLabel:    { fontSize: 13, fontWeight: "700", color: Colors.text, marginBottom: 4 },
  histCard:      { },
  histDate:      { fontSize: 13, fontWeight: "800", color: Colors.text, marginBottom: 8 },
  histVitals:    { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  hv:            { backgroundColor: Colors.bg, borderRadius: Radius.sm, paddingHorizontal: 10, paddingVertical: 5 },
  hvText:        { fontSize: 12, fontWeight: "600", color: Colors.text },
  histNotes:     { fontSize: 12, color: Colors.textMuted, fontStyle: "italic", marginTop: 8 },
  dangerCard:    { gap: 8 },
  dangerTitle:   { fontSize: 16, fontWeight: "900", color: Colors.text },
  dangerSub:     { fontSize: 12, color: Colors.textMuted, marginBottom: 4 },
  signRow:       { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  signCheck:     { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.border, alignItems: "center", justifyContent: "center" },
  signCheckMark: { color: "#fff", fontSize: 13, fontWeight: "900" },
  signLabel:     { fontSize: 14, color: Colors.text, flex: 1 },
  dangerAlert:   { backgroundColor: Colors.dangerLight, borderRadius: Radius.md, padding: Spacing.md, marginTop: 8 },
  dangerAlertText:{ fontSize: 14, fontWeight: "700", color: Colors.danger },
  modal:         { flex: 1, backgroundColor: Colors.bg },
  modalHeader:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle:    { fontSize: 20, fontWeight: "900", color: Colors.text },
  closeBtn:      { fontSize: 20, color: Colors.textMuted, padding: 4 },
  modalBody:     { padding: Spacing.lg, gap: 4, paddingBottom: 40 },
  modalSub:      { fontSize: 13, color: Colors.textMuted, marginBottom: Spacing.sm },
});
