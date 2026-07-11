import { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Image, Modal, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router, useFocusEffect } from "expo-router";
import {
  patientApi, medicationApi, healthApi, appointmentApi,
  Patient, Medication, HealthLog, Appointment,
} from "../../../src/api";
import { useRoleGuard } from "../../../src/hooks/useRoleGuard";
import { formatDate, formatTime } from "../../../src/utils/date";
import { Card, Row, SectionHeader, EmptyState, LoadingScreen, Badge, Button } from "../../../src/components/common/UI";
import { Colors, Spacing } from "../../../src/theme";

export default function PatientDetail() {
  const guard = useRoleGuard(["nurse"]);
  const params = useLocalSearchParams<{ patientId: string | string[] }>();
  const patientId = Array.isArray(params.patientId) ? params.patientId[0] : params.patientId;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [meds, setMeds] = useState<Medication[]>([]);
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [showQR, setShowQR] = useState(false);

  const load = async () => {
    if (!patientId) return;
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
    } catch {} finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(
    useCallback(() => {
      if (!guard) load();
    }, [guard, patientId])
  );

  if (guard) return guard;
  if (loading) return <LoadingScreen label="Loading patient…" />;
  if (!patient) return <EmptyState emoji="⚠️" title="Patient not found" />;

  const latestLog = logs[0];
  const upcomingAppts = appts.filter(a => !a.completed);
  const pastAppts = appts.filter(a => a.completed);
  const statusColor = patient.healthStatus === "critical" ? Colors.danger
    : patient.healthStatus === "monitor" ? Colors.warning : Colors.success;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.nurse} />}
      >
        <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>{patient.name}</Text>
            <Row style={{ gap: 8, flexWrap: "wrap", marginTop: 6 }}>
              <Badge label={(patient.diagnosis ?? "—").replace("_", " ")} color={Colors.nurse} />
              {patient.age != null && <Badge label={`Age ${patient.age}`} color={Colors.textMuted} />}
              <Badge label={patient.healthStatus ?? "stable"} color={statusColor} />
            </Row>
          </View>
          {patient.qrCode && (
            <TouchableOpacity onPress={() => setShowQR(true)} style={s.qrThumbWrap}>
              <Image source={{ uri: patient.qrCode }} style={s.qrThumb} />
              <Text style={s.qrThumbLabel}>View QR</Text>
            </TouchableOpacity>
          )}
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
            {latestLog.notes ? <Text style={s.metaText}>"{latestLog.notes}"</Text> : null}
          </Card>
        ) : <EmptyState emoji="📊" title="No health logs yet" />}

        {logs.length > 1 && (
          <>
            <SectionHeader title={`Recent Readings (${Math.min(logs.length, 7)})`} />
            {logs.slice(1, 7).map(l => (
              <Card key={l._id} style={s.smallCard}>
                <Row style={{ justifyContent: "space-between" }}>
                  <Text style={s.metaText}>{formatDate(l.date)}</Text>
                  <Row style={{ gap: 10 }}>
                    {l.bp && <Text style={s.smallVital}>🩸{l.bp.systolic}/{l.bp.diastolic}</Text>}
                    {l.pulse != null && <Text style={s.smallVital}>🫀{l.pulse}</Text>}
                    {l.bloodSugar != null && <Text style={s.smallVital}>🍬{l.bloodSugar}</Text>}
                  </Row>
                </Row>
              </Card>
            ))}
          </>
        )}

        <SectionHeader
          title={`Medications (${meds.length})`}
          action="+ Add"
          onAction={() => router.push({ pathname: "/(tabs)/nurse/add-medication", params: { patientId } } as any)}
        />
        {meds.length === 0
          ? <EmptyState emoji="💊" title="No medications assigned" />
          : meds.map(m => (
              <Card key={m._id}>
                <Text style={s.itemName}>{m.name} — {m.dose}{m.unit}</Text>
                <Text style={s.metaText}>{(m.schedule ?? []).map(sl => sl.time).join(", ")}</Text>
                {m.instructions ? <Text style={s.metaText}>ℹ️ {m.instructions}</Text> : null}
                <Text style={s.metaText}>{m.isOngoing ? "Ongoing" : "Fixed course"}</Text>
              </Card>
            ))
        }

        <SectionHeader
          title={`Appointments (${appts.length})`}
          action="+ Add"
          onAction={() => router.push({ pathname: "/(tabs)/nurse/add-appointment", params: { patientId } } as any)}
        />
        {upcomingAppts.length === 0 && pastAppts.length === 0
          ? <EmptyState emoji="📅" title="No appointments scheduled" />
          : [...upcomingAppts, ...pastAppts].map(a => (
              <Card key={a._id} style={a.completed ? { opacity: 0.6 } : undefined}>
                <Text style={s.itemName}>{a.title}</Text>
                <Text style={s.metaText}>{formatDate(a.dateTime)} · {formatTime(a.dateTime)}</Text>
                <Text style={s.metaText}>📍 {a.facilityName}</Text>
                {a.doctorName ? <Text style={s.metaText}>👨‍⚕️ {a.doctorName}</Text> : null}
                {a.completed && <Badge label="Completed" color={Colors.success} />}
              </Card>
            ))
        }

        <SectionHeader
          title="Diet Plan"
          action="Customize"
          onAction={() => router.push({ pathname: "/(tabs)/nurse/edit-diet", params: { patientId } } as any)}
        />
        <Card>
          {patient.customDiet ? (
            <>
              <Text style={s.metaText}>✅ Eat: {patient.customDiet.eat.join(", ") || "—"}</Text>
              <Text style={s.metaText}>❌ Avoid: {patient.customDiet.avoid.join(", ") || "—"}</Text>
              <Text style={s.metaHint}>Custom plan — overrides diagnosis default.</Text>
            </>
          ) : (
            <Text style={s.metaText}>Using default plan for: {(patient.diagnosis ?? "—").replace("_", " ")}. Tap Customize to override.</Text>
          )}
        </Card>
      </ScrollView>

      <Modal visible={showQR} transparent animationType="fade">
        <View style={s.overlay}>
          <Card style={s.qrModalCard}>
            <Text style={s.qrModalTitle}>{patient.name}'s QR Code</Text>
            {patient.qrCode && <Image source={{ uri: patient.qrCode }} style={{ width: 220, height: 220 }} resizeMode="contain" />}
            {patient.inviteCode && (
              <>
                <Text style={s.qrModalLabel}>Family invite code</Text>
                <Text style={s.qrModalCode}>{patient.inviteCode}</Text>
              </>
            )}
            <Button title="Close" onPress={() => setShowQR(false)} color={Colors.nurse} style={{ marginTop: 12 }} />
          </Card>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 60 },
  title: { fontSize: 26, fontWeight: "900", color: Colors.text },
  vital: { fontSize: 13, fontWeight: "700", color: Colors.text },
  smallVital: { fontSize: 11, fontWeight: "700", color: Colors.textSecondary },
  metaDate: { fontSize: 11, color: Colors.textMuted, marginTop: 8 },
  metaText: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  metaHint: { fontSize: 11, color: Colors.nurse, marginTop: 6, fontStyle: "italic" },
  itemName: { fontSize: 15, fontWeight: "700", color: Colors.text },
  smallCard: { paddingVertical: 10 },
  qrThumbWrap: { alignItems: "center", backgroundColor: Colors.card, borderRadius: 12, padding: 8, gap: 4 },
  qrThumb: { width: 56, height: 56 },
  qrThumbLabel: { fontSize: 10, fontWeight: "700", color: Colors.nurse },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: Spacing.lg },
  qrModalCard: { width: "100%", alignItems: "center", gap: 6 },
  qrModalTitle: { fontSize: 17, fontWeight: "800", color: Colors.text, marginBottom: 8 },
  qrModalLabel: { fontSize: 12, color: Colors.textMuted, marginTop: 10 },
  qrModalCode: { fontSize: 24, fontWeight: "900", color: Colors.nurse, letterSpacing: 2 },
});