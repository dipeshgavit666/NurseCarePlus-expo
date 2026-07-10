import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import {
  patientApi, medicationApi, healthApi, appointmentApi,
  Patient, Medication, HealthLog, Appointment,
} from "../../../src/api";
import { useRoleGuard } from "../../../src/hooks/useRoleGuard";
import { Card, Row, SectionHeader, EmptyState, LoadingScreen, Badge, Button } from "../../../src/components/common/UI";
import { formatDate, formatTime } from "../../../src/utils/date";
import { Colors, Spacing, Radius } from "../../../src/theme";

const STATUS_OPTIONS: { key: "stable" | "monitor" | "critical"; label: string; color: string }[] = [
  { key: "stable", label: "Stable", color: Colors.success },
  { key: "monitor", label: "Monitor", color: Colors.warning },
  { key: "critical", label: "Critical", color: Colors.danger },
];

export default function PatientDetail() {
  const guard = useRoleGuard(["nurse"]);
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [meds, setMeds] = useState<Medication[]>([]);
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [statusSaving, setStatusSaving] = useState(false);

  const load = async () => {
    try {
      const { patient: p } = await patientApi.getById(patientId);
      setPatient(p);
      const [{ medications }, { logs: healthLogs }, { appointments }] = await Promise.all([
        medicationApi.getForPatient(patientId),
        healthApi.getForPatient(patientId, 14),
        appointmentApi.getAll(patientId),
      ]);
      setMeds(medications);
      setLogs([...healthLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setAppts(appointments.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()));
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { if (!guard && patientId) load(); }, [guard, patientId]);
  if (guard) return guard;
  if (loading) return <LoadingScreen label="Loading patient…" />;
  if (!patient) return <EmptyState emoji="⚠️" title="Patient not found" />;

  const latestLog = logs[0];
  const now = new Date();
  const upcomingAppts = appts.filter(a => !a.completed && new Date(a.dateTime) >= now);

  const setStatus = async (status: "stable" | "monitor" | "critical") => {
    try {
      setStatusSaving(true);
      const { patient: updated } = await patientApi.updateHealthStatus(patient._id, status);
      setPatient(updated);
    } catch (e: any) { Alert.alert("Error", e.message); }
    finally { setStatusSaving(false); }
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.nurse} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.title}>{patient.name}</Text>
        <Row style={{ gap: 8, flexWrap: "wrap" }}>
          <Badge label={(patient.diagnosis ?? "—").replace("_", " ")} color={Colors.nurse} />
          {patient.age != null && <Badge label={`Age ${patient.age}`} color={Colors.textMuted} />}
          {patient.inviteCode && <Badge label={`Code: ${patient.inviteCode}`} color={Colors.family} />}
          {patient.linkedFamilyIds && <Badge label={`${patient.linkedFamilyIds.length} family linked`} color={Colors.family} />}
        </Row>

        <SectionHeader title="Health Status" />
        <Row style={{ gap: 8 }}>
          {STATUS_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => setStatus(opt.key)}
              disabled={statusSaving}
              style={[s.statusChip, { borderColor: opt.color }, patient.healthStatus === opt.key && { backgroundColor: opt.color }]}
            >
              <Text style={[s.statusChipText, { color: patient.healthStatus === opt.key ? "#fff" : opt.color }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </Row>

        <SectionHeader title="Latest Health Reading" />
        {latestLog ? (
          <Card>
            <Row style={{ flexWrap: "wrap", gap: 14 }}>
              {latestLog.bp && <Text style={s.vital}>🩸 {latestLog.bp.systolic}/{latestLog.bp.diastolic} mmHg</Text>}
              {latestLog.pulse != null && <Text style={s.vital}>🫀 {latestLog.pulse} bpm</Text>}
              {latestLog.bloodSugar != null && <Text style={s.vital}>🍬 {latestLog.bloodSugar} mg/dL</Text>}
              {latestLog.weight != null && <Text style={s.vital}>⚖️ {latestLog.weight} kg</Text>}
            </Row>
            <Text style={s.metaDate}>{formatDate(latestLog.date)} · {formatTime(latestLog.date)}</Text>
          </Card>
        ) : <EmptyState emoji="📊" title="No health logs yet" />}

        {logs.length > 1 && (
          <>
            <SectionHeader title="Recent Readings" />
            {logs.slice(0, 5).map(log => (
              <Card key={log._id} style={s.compactCard}>
                <Row style={{ justifyContent: "space-between" }}>
                  <Text style={s.metaText}>{formatDate(log.date)}</Text>
                  <Row style={{ gap: 10 }}>
                    {log.bp && <Text style={s.metaText}>🩸{log.bp.systolic}/{log.bp.diastolic}</Text>}
                    {log.pulse != null && <Text style={s.metaText}>🫀{log.pulse}</Text>}
                    {log.bloodSugar != null && <Text style={s.metaText}>🍬{log.bloodSugar}</Text>}
                  </Row>
                </Row>
              </Card>
            ))}
          </>
        )}

        <SectionHeader
          title={`Medications (${meds.length})`}
          action="+ Add"
          onAction={() => router.push({ pathname: "/(tabs)/nurse/add-medication", params: { patientId: patient._id } })}
        />
        {meds.length === 0
          ? <EmptyState emoji="💊" title="No medications assigned" />
          : meds.map(m => (
              <Card key={m._id}>
                <Text style={s.itemName}>{m.name} — {m.dose}{m.unit}</Text>
                <Text style={s.metaText}>{(m.schedule ?? []).map(sl => sl.time).join(", ")}</Text>
                {m.instructions ? <Text style={s.metaText}>ℹ️ {m.instructions}</Text> : null}
                {!m.active && <Badge label="Inactive" color={Colors.textMuted} />}
              </Card>
            ))
        }

        <SectionHeader
          title={`Appointments (${upcomingAppts.length} upcoming)`}
          action="+ Add"
          onAction={() => router.push({ pathname: "/(tabs)/nurse/add-appointment", params: { patientId: patient._id } })}
        />
        {appts.length === 0
          ? <EmptyState emoji="📅" title="No appointments scheduled" />
          : appts.slice(0, 6).map(a => (
              <Card key={a._id}>
                <Row style={{ justifyContent: "space-between" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemName}>{a.title}</Text>
                    <Text style={s.metaText}>{formatDate(a.dateTime)} · {formatTime(a.dateTime)}</Text>
                    <Text style={s.metaText}>📍 {a.facilityName}</Text>
                  </View>
                  {a.completed && <Badge label="Done" color={Colors.success} />}
                </Row>
              </Card>
            ))
        }

        <SectionHeader
          title="Diet Plan"
          action="Customize"
          onAction={() => router.push({ pathname: "/(tabs)/nurse/edit-diet", params: { patientId: patient._id } })}
        />
        <Card>
          <Text style={s.metaText}>
            Base plan from diagnosis: {(patient.diagnosis ?? "—").replace("_", " ")}.
          </Text>
          {patient.customDiet?.eat?.length ? (
            <Text style={s.metaText}>+ {patient.customDiet.eat.length} custom "eat" item(s)</Text>
          ) : null}
          {patient.customDiet?.avoid?.length ? (
            <Text style={s.metaText}>+ {patient.customDiet.avoid.length} custom "avoid" item(s)</Text>
          ) : null}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 60 },
  title: { fontSize: 26, fontWeight: "900", color: Colors.text },
  statusChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1.5 },
  statusChipText: { fontSize: 12, fontWeight: "800" },
  vital: { fontSize: 13, fontWeight: "700", color: Colors.text },
  metaDate: { fontSize: 11, color: Colors.textMuted, marginTop: 8 },
  compactCard: { paddingVertical: 10 },
  itemName: { fontSize: 15, fontWeight: "700", color: Colors.text },
  metaText: { fontSize: 12, color: Colors.textMuted, marginTop: 3 },
});