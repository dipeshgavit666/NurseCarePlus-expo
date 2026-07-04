import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { patientApi, appointmentApi, healthApi, Patient, Appointment, HealthLog } from "../../../src/api";
import { useAuth } from "../../../src/context/AuthContext";
import { useMeds } from "../../../src/context/MedContext";
import { useRoleGuard } from "../../../src/hooks/useRoleGuard";
import { Card, Row, SectionHeader, LoadingScreen } from "../../../src/components/common/UI";
import { Colors, Spacing, Radius } from "../../../src/theme";

export default function PatientHome() {
  const guard = useRoleGuard(["patient"]);
  const { user } = useAuth();
  const { medications, loadMeds, isTakenToday } = useMeds();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppts] = useState<Appointment[]>([]);
  const [todayLog, setTodayLog] = useState<HealthLog | null>(null);

  const load = async () => {
    try {
      const { patient: p } = await patientApi.getMe();
      setPatient(p);
      const [{ appointments: appts }] = await Promise.all([
        appointmentApi.getUpcoming(p._id),
        loadMeds(p._id),
      ]);
      setAppts(appts);
      try { const { log } = await healthApi.getToday(p._id); setTodayLog(log); } catch {}
    } catch {} finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { if (!guard) load(); }, [guard]);
  if (guard) return guard;
  if (loading) return <LoadingScreen label="Loading your care plan…" />;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const nowMins = hour * 60 + new Date().getMinutes();

  // Backend schedule shape: medication.schedule = [{ time: "HH:MM", taken, takenAt }]
  type NextMed = { name: string; dose: string; unit: string; time: string; id: string };
  const nextMed = medications.reduce<NextMed | null>((acc, med) => {
    for (const slot of med.schedule ?? []) {
      if (slot.taken || isTakenToday(med._id, slot.time)) continue;
      const [h, m] = slot.time.split(":").map(Number);
      const mins = h * 60 + (m || 0);
      if (mins < nowMins) continue;
      if (!acc || mins < (Number(acc.time.split(":")[0]) * 60 + Number(acc.time.split(":")[1]))) {
        return { name: med.name, dose: med.dose, unit: med.unit, time: slot.time, id: med._id };
      }
    }
    return acc;
  }, null);

  const totalSlots = medications.reduce((n, m) => n + (m.schedule?.length ?? 0), 0);
  const takenSlots = medications.reduce(
    (n, m) => n + (m.schedule ?? []).filter(sl => sl.taken || isTakenToday(m._id, sl.time)).length, 0
  );

  const healthStatus = !todayLog ? { label: "Not Logged", color: Colors.textMuted }
    : (todayLog.pulse ?? 0) > 100 || (todayLog.bloodSugar ?? 0) > 200
      ? { label: "Monitor ⚠️", color: Colors.warning }
      : { label: "Stable ✓", color: Colors.success };

  const nextAppt = appointments[0];

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.patient} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>{greeting} 👋</Text>
            <Text style={s.name}>{patient?.name ?? user?.name}</Text>
          </View>
          <TouchableOpacity style={[s.statusBadge, { borderColor: healthStatus.color }]}>
            <Text style={[s.statusText, { color: healthStatus.color }]}>{healthStatus.label}</Text>
          </TouchableOpacity>
        </View>

        {patient?.diagnosis && (
          <Card style={{ ...s.dxCard, borderLeftColor: Colors.patient }}>
            <Text style={s.dxLabel}>Diagnosis</Text>
            <Text style={s.dxValue}>{patient.diagnosis.replace("_", " ")}</Text>
          </Card>
        )}

        <View style={s.strip}>
          <StripItem emoji="💊" label="Taken today" value={`${takenSlots}/${totalSlots}`} color={Colors.primary} onPress={() => router.push("/(tabs)/patient/medications")} />
          <StripItem emoji="📅" label="Upcoming" value={String(appointments.length)} color={Colors.warning} onPress={() => router.push("/(tabs)/patient/appointments")} />
          <StripItem emoji="❤️" label="Health" value={todayLog ? "Logged ✓" : "Not yet"} color={Colors.success} onPress={() => router.push("/(tabs)/patient/health")} />
        </View>

        <SectionHeader title="Next Medication" action="See all" onAction={() => router.push("/(tabs)/patient/medications")} />
        {nextMed ? (
          <TouchableOpacity onPress={() => router.push("/(tabs)/patient/medications")} activeOpacity={0.9}>
            <Card style={s.nextMedCard}>
              <Row style={{ gap: 14 }}>
                <View style={s.medIcon}><Text style={{ fontSize: 28 }}>💊</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.medName}>{nextMed.name}</Text>
                  <Text style={s.medDose}>{nextMed.dose}{nextMed.unit}</Text>
                </View>
                <View style={s.timeBox}>
                  <Text style={s.timeText}>{nextMed.time}</Text>
                  <Text style={s.timeLabel}>today</Text>
                </View>
              </Row>
            </Card>
          </TouchableOpacity>
        ) : (
          <Card style={s.allDoneCard}>
            <Text style={s.allDoneText}>✅  All medications taken for today!</Text>
          </Card>
        )}

        {nextAppt && (
          <>
            <SectionHeader title="Next Appointment" />
            <Card style={s.apptCard}>
              <Row style={{ gap: 12 }}>
                <Text style={{ fontSize: 26 }}>📅</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.apptTitle}>{nextAppt.title}</Text>
                  {nextAppt.doctorName && <Text style={s.apptMeta}>Dr. {nextAppt.doctorName}</Text>}
                  <Text style={[s.apptMeta, { color: Colors.primary }]}>
                    {new Date(nextAppt.dateTime).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                    {"  "}
                    {new Date(nextAppt.dateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
              </Row>
            </Card>
          </>
        )}

        <SectionHeader title="Quick Actions" />
        <View style={s.actions}>
          <ActionBtn emoji="❤️" label="Log Health" color={Colors.success} onPress={() => router.push("/(tabs)/patient/health")} />
          <ActionBtn emoji="💊" label="Medications" color={Colors.primary} onPress={() => router.push("/(tabs)/patient/medications")} />
          <ActionBtn emoji="🥗" label="Diet Plan" color={Colors.warning} onPress={() => router.push("/(tabs)/patient/diet")} />
          <ActionBtn emoji="📅" label="Appointments" color={Colors.nurse} onPress={() => router.push("/(tabs)/patient/appointments")} />
        </View>

        <TouchableOpacity style={s.sos} activeOpacity={0.85} onPress={() => router.push("/(tabs)/patient/sos")}>
          <Text style={s.sosEmoji}>🆘</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.sosTitle}>Emergency SOS</Text>
            <Text style={s.sosSub}>Tap to alert your care team immediately</Text>
          </View>
          <Text style={[s.sosArrow, { color: Colors.danger }]}>›</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function StripItem({ emoji, label, value, color, onPress }: { emoji: string; label: string; value: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[s.stripItem, { borderTopColor: color, borderTopWidth: 3 }]} onPress={onPress} activeOpacity={0.8}>
      <Text style={s.stripEmoji}>{emoji}</Text>
      <Text style={[s.stripValue, { color }]}>{value}</Text>
      <Text style={s.stripLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function ActionBtn({ emoji, label, color, onPress }: { emoji: string; label: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[s.actionBtn, { backgroundColor: color + "12" }]} onPress={onPress} activeOpacity={0.8}>
      <Text style={s.actionEmoji}>{emoji}</Text>
      <Text style={[s.actionLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 40 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  greeting: { fontSize: 13, color: Colors.textMuted },
  name: { fontSize: 26, fontWeight: "900", color: Colors.text },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1.5 },
  statusText: { fontSize: 12, fontWeight: "800" },
  dxCard: { borderLeftWidth: 4, paddingLeft: 12 },
  dxLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: "700", textTransform: "uppercase" },
  dxValue: { fontSize: 16, fontWeight: "700", color: Colors.text, marginTop: 2, textTransform: "capitalize" },
  strip: { flexDirection: "row", gap: 8 },
  stripItem: { flex: 1, backgroundColor: Colors.card, borderRadius: Radius.md, padding: 10, alignItems: "center", gap: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  stripEmoji: { fontSize: 18 },
  stripValue: { fontSize: 13, fontWeight: "900" },
  stripLabel: { fontSize: 9, color: Colors.textMuted },
  nextMedCard: {},
  medIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.primaryLight, alignItems: "center", justifyContent: "center" },
  medName: { fontSize: 16, fontWeight: "800", color: Colors.text },
  medDose: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  timeBox: { alignItems: "center" },
  timeText: { fontSize: 18, fontWeight: "900", color: Colors.primary },
  timeLabel: { fontSize: 10, color: Colors.textMuted },
  allDoneCard: { alignItems: "center", paddingVertical: 20 },
  allDoneText: { fontSize: 15, color: Colors.success, fontWeight: "700" },
  apptCard: {},
  apptTitle: { fontSize: 15, fontWeight: "800", color: Colors.text },
  apptMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 3 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  actionBtn: { width: "47%", borderRadius: Radius.md, padding: 16, alignItems: "center", gap: 6 },
  actionEmoji: { fontSize: 26 },
  actionLabel: { fontSize: 12, fontWeight: "700" },
  sos: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.dangerLight, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1.5, borderColor: Colors.danger + "40" },
  sosEmoji: { fontSize: 32 },
  sosTitle: { fontSize: 15, fontWeight: "800", color: Colors.danger },
  sosSub: { fontSize: 12, color: Colors.danger + "99", marginTop: 2 },
  sosArrow: { fontSize: 24 },
});
