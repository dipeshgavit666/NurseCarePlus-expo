import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { patientApi, medicationApi, appointmentApi, healthApi, sosApi, Patient, Medication, Appointment, HealthLog } from "../../../src/api";
import { useAuth } from "../../../src/context/AuthContext";
import { Card, Row, SectionHeader, LoadingScreen, EmptyState, Button, Badge } from "../../../src/components/common/UI";
import { Colors, Spacing, Radius } from "../../../src/theme";

export default function FamilyHome() {
  const { user } = useAuth();
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [patient, setPatient]       = useState<Patient | null>(null);
  const [meds, setMeds]             = useState<Medication[]>([]);
  const [appointments, setAppts]    = useState<Appointment[]>([]);
  const [todayLog, setTodayLog]     = useState<HealthLog | null>(null);
  const [sosLoading, setSosLoading] = useState(false);

  const load = async () => {
    try {
      const { patient: p } = await patientApi.getLinked();
      setPatient(p);
      const [{ medications }, { appointments: appts }] = await Promise.all([
        medicationApi.getForPatient(p._id),
        appointmentApi.getUpcoming(p._id),
      ]);
      setMeds(medications);
      setAppts(appts);
      try { const { log } = await healthApi.getToday(p._id); setTodayLog(log); } catch {}
    } catch {} finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);
  if (loading) return <LoadingScreen label="Loading patient info…" />;

  if (!patient) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.noLink}>
          <Text style={s.noLinkEmoji}>🔗</Text>
          <Text style={s.noLinkTitle}>No Patient Linked</Text>
          <Text style={s.noLinkSub}>Ask the nurse for the 6-digit invite code to link your account to a patient.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const triggerSOS = async () => {
    Alert.alert("🆘 Confirm SOS", "This will alert the nurse and emergency contacts.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Send SOS", style: "destructive",
        onPress: async () => {
          try {
            setSosLoading(true);
            await sosApi.trigger({ patientId: patient._id, message: "SOS triggered by family caregiver" });
            Alert.alert("SOS Sent", "Emergency alert dispatched to care team.");
          } catch (e: any) { Alert.alert("Error", e.message); }
          finally { setSosLoading(false); }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.family} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>Monitoring 👀</Text>
            <Text style={s.name}>{patient.name}</Text>
          </View>
          <Badge label="Family" color={Colors.family} />
        </View>

        {/* Patient card */}
        <Card style={StyleSheet.flatten([s.patCard, { borderTopColor: Colors.family, borderTopWidth: 4 }])}>
          <Row style={{ gap: 14 }}>
            <View style={s.patAvatar}><Text style={{ fontSize: 32 }}>🧑‍🦽</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.patName}>{patient.name}</Text>
              {patient.diagnosis && <Text style={s.patDx}>🩺 {patient.diagnosis}</Text>}
              {patient.dob && <Text style={s.patMeta}>DOB: {patient.dob}</Text>}
            </View>
          </Row>
        </Card>

        {/* Today's vitals */}
        <SectionHeader title="Today's Health" />
        {todayLog ? (
          <Card style={s.vitalsCard}>
            <View style={s.vitalsGrid}>
              {todayLog.bp         && <Vital emoji="🩸" label="Blood Pressure" value={todayLog.bp} />}
              {todayLog.heartRate  && <Vital emoji="🫀" label="Heart Rate"     value={`${todayLog.heartRate} bpm`} />}
              {todayLog.bloodSugar && <Vital emoji="🍬" label="Blood Sugar"    value={`${todayLog.bloodSugar} mg/dL`} />}
              {todayLog.weight     && <Vital emoji="⚖️" label="Weight"         value={`${todayLog.weight} kg`} />}
            </View>
            <Text style={s.logTime}>
              Logged at {new Date(todayLog.loggedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
          </Card>
        ) : (
          <Card style={s.noLogCard}>
            <Text style={s.noLogText}>⏳ Patient hasn't logged today's health yet</Text>
          </Card>
        )}

        {/* Medications */}
        <SectionHeader title={`Medications (${meds.length})`} />
        {meds.length === 0
          ? <EmptyState emoji="💊" title="No medications assigned" />
          : meds.map(m => (
              <Card key={m._id} style={s.medCard}>
                <Row style={{ gap: 10 }}>
                  <Text style={{ fontSize: 22 }}>💊</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.medName}>{m.name}</Text>
                    <Text style={s.medMeta}>{m.dosage}  ·  {(m.times ?? []).join(", ")}</Text>
                    {m.instructions && <Text style={s.medInstr}>ℹ️ {m.instructions}</Text>}
                  </View>
                </Row>
              </Card>
            ))
        }

        {/* Upcoming appointments */}
        {appointments.length > 0 && (
          <>
            <SectionHeader title="Upcoming Appointments" />
            {appointments.slice(0, 3).map(a => (
              <Card key={a._id} style={s.apptCard}>
                <Row style={{ gap: 12 }}>
                  <Text style={{ fontSize: 22 }}>📅</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.apptTitle}>{a.title}</Text>
                    {a.doctorName && <Text style={s.apptMeta}>Dr. {a.doctorName}</Text>}
                    <Text style={[s.apptMeta, { color: Colors.primary }]}>
                      {new Date(a.dateTime).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      {" · "}
                      {new Date(a.dateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                    {a.location && <Text style={s.apptMeta}>📍 {a.location}</Text>}
                  </View>
                </Row>
              </Card>
            ))}
          </>
        )}

        {/* SOS */}
        <Button
          title="🆘  Emergency SOS"
          onPress={triggerSOS}
          variant="danger"
          loading={sosLoading}
          size="lg"
          style={{ marginTop: 4 }}
        />

        {/* Alerts placeholder */}
        <Card style={s.alertsCard}>
          <Text style={s.alertsTitle}>🔔  Push Alerts</Text>
          <Text style={s.alertsSub}>
            You'll get push notifications when:{"\n"}
            • {patient.name} misses a medication{"\n"}
            • An appointment is tomorrow{"\n"}
            • SOS is triggered
          </Text>
        </Card>

      </ScrollView>
    </SafeAreaView>
  );
}

function Vital({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <View style={s.vital}>
      <Text style={s.vitalEmoji}>{emoji}</Text>
      <Text style={s.vitalValue}>{value}</Text>
      <Text style={s.vitalLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.bg },
  scroll:      { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 40 },
  noLink:      { flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing.xl, gap: Spacing.md },
  noLinkEmoji: { fontSize: 56 },
  noLinkTitle: { fontSize: 22, fontWeight: "800", color: Colors.text },
  noLinkSub:   { fontSize: 14, color: Colors.textMuted, textAlign: "center", lineHeight: 22 },
  header:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  greeting:    { fontSize: 13, color: Colors.textMuted },
  name:        { fontSize: 26, fontWeight: "900", color: Colors.text },
  patCard:     { },
  patAvatar:   { width: 58, height: 58, borderRadius: 29, backgroundColor: Colors.patientLight, alignItems: "center", justifyContent: "center" },
  patName:     { fontSize: 18, fontWeight: "800", color: Colors.text },
  patDx:       { fontSize: 13, color: Colors.nurse, marginTop: 4, fontWeight: "600" },
  patMeta:     { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  vitalsCard:  { },
  vitalsGrid:  { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  vital:       { width: "47%", backgroundColor: Colors.bg, borderRadius: Radius.md, padding: 12, alignItems: "center", gap: 3 },
  vitalEmoji:  { fontSize: 22 },
  vitalValue:  { fontSize: 16, fontWeight: "800", color: Colors.text },
  vitalLabel:  { fontSize: 11, color: Colors.textMuted },
  logTime:     { fontSize: 11, color: Colors.textMuted, marginTop: 10, textAlign: "right" },
  noLogCard:   { alignItems: "center", paddingVertical: 16 },
  noLogText:   { fontSize: 14, color: Colors.textMuted },
  medCard:     { },
  medName:     { fontSize: 14, fontWeight: "700", color: Colors.text },
  medMeta:     { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  medInstr:    { fontSize: 12, color: Colors.warning, marginTop: 3, fontStyle: "italic" },
  apptCard:    { },
  apptTitle:   { fontSize: 14, fontWeight: "700", color: Colors.text },
  apptMeta:    { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  alertsCard:  { backgroundColor: Colors.familyLight, borderRadius: Radius.lg, padding: Spacing.md },
  alertsTitle: { fontSize: 15, fontWeight: "800", color: Colors.family, marginBottom: 8 },
  alertsSub:   { fontSize: 13, color: Colors.family + "BB", lineHeight: 22 },
});
