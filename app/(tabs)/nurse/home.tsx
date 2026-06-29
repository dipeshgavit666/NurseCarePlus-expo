import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { patientApi, Patient } from "../../../src/api";
import { useAuth } from "../../../src/context/AuthContext";
import { Card, Avatar, SectionHeader, EmptyState, LoadingScreen, Badge, Row } from "../../../src/components/common/UI";
import { Colors, Spacing, Radius } from "../../../src/theme";

export default function NurseHome() {
  const { user } = useAuth();
  const [patients, setPatients]   = useState<Patient[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const { patients: list } = await patientApi.getAll();
      setPatients(list);
    } catch {} finally {
      setLoading(false); setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <LoadingScreen label="Loading patients…" />;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.nurse} />}
      >
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>{greeting} 👋</Text>
            <Text style={s.name}>{user?.name}</Text>
          </View>
          <Badge label="Nurse" color={Colors.nurse} />
        </View>

        {/* Stats row */}
        <View style={s.stats}>
          <StatCard emoji="🧑‍🦽" count={patients.length} label="Patients" color={Colors.nurse} />
          <StatCard emoji="📅" count={0} label="Today's Appts" color={Colors.warning} />
          <StatCard emoji="🆘" count={0} label="Active SOS" color={Colors.danger} />
        </View>

        {/* Quick actions */}
        <Card style={s.actionsCard}>
          <SectionHeader title="Quick Actions" />
          <View style={s.actions}>
            <QuickAction emoji="➕" label="New Patient"   color={Colors.nurse}   onPress={() => router.push("/(tabs)/nurse/create-patient")} />
            <QuickAction emoji="🧑‍🦽" label="All Patients" color={Colors.patient} onPress={() => router.push("/(tabs)/nurse/patients")} />
            <QuickAction emoji="💊" label="Medications"  color={Colors.success} onPress={() => {}} />
            <QuickAction emoji="📅" label="Appointments" color={Colors.warning}  onPress={() => {}} />
          </View>
        </Card>

        {/* Patient list */}
        <SectionHeader
          title={`Patients (${patients.length})`}
          action="See all"
          onAction={() => router.push("/(tabs)/nurse/patients")}
        />

        {patients.length === 0
          ? <EmptyState emoji="🧑‍🦽" title="No patients yet" subtitle="Tap 'New Patient' to create the first profile" />
          : patients.slice(0, 5).map(p => <PatientRow key={p._id} patient={p} />)
        }
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ emoji, count, label, color }: { emoji: string; count: number; label: string; color: string }) {
  const style = { ...s.statCard, borderTopColor: color, borderTopWidth: 3 };

  return (
    <Card style={style}>
      <Text style={[s.statCount, { color }]}>{count}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </Card>
  );
}

function QuickAction({ emoji, label, color, onPress }: { emoji: string; label: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[s.qa, { backgroundColor: color + "12" }]} onPress={onPress} activeOpacity={0.8}>
      <Text style={s.qaEmoji}>{emoji}</Text>
      <Text style={[s.qaLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function PatientRow({ patient }: { patient: Patient }) {
  return (
    <Card style={s.patRow}>
      <Row style={{ gap: 12 }}>
        <Avatar emoji="🧑‍🦽" size={44} color={Colors.nurseLight} />
        <View style={{ flex: 1 }}>
          <Text style={s.patName}>{patient.name}</Text>
          {patient.diagnosis
            ? <Text style={s.patDx}>{patient.diagnosis}</Text>
            : <Text style={s.patDx}>No diagnosis set</Text>
          }
        </View>
        <Text style={{ color: Colors.textMuted, fontSize: 18 }}>›</Text>
      </Row>
    </Card>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: Colors.bg },
  scroll:     { padding: Spacing.lg, gap: Spacing.md },
  header:     { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  greeting:   { fontSize: 14, color: Colors.textMuted },
  name:       { fontSize: 26, fontWeight: "900", color: Colors.text },
  stats:      { flexDirection: "row", gap: 10 },
  statCard:   { flex: 1, alignItems: "center", padding: 12, gap: 2 },
  statEmoji:  { fontSize: 22 },
  statCount:  { fontSize: 26, fontWeight: "900" },
  statLabel:  { fontSize: 10, color: Colors.textMuted, fontWeight: "600" },
  actionsCard:{ },
  actions:    { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: Spacing.sm },
  qa:         { width: "47%", borderRadius: Radius.md, padding: 14, alignItems: "center", gap: 6 },
  qaEmoji:    { fontSize: 26 },
  qaLabel:    { fontSize: 12, fontWeight: "700" },
  patRow:     { },
  patName:    { fontSize: 15, fontWeight: "700", color: Colors.text },
  patDx:      { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
});
