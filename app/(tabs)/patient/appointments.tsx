import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Alert, RefreshControl, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { patientApi, appointmentApi, Appointment } from "../../../src/api";
import { useAuth } from "../../../src/context/AuthContext";
import { useRoleGuard } from "../../../src/hooks/useRoleGuard";
import { DateTimeField } from "../../../src/components/common/DateTimeField";
import { formatDate, formatTime } from "../../../src/utils/date";
import { Card, Row, SectionHeader, EmptyState, LoadingScreen, Button, Input, Badge } from "../../../src/components/common/UI";
import { Colors, Spacing, Radius } from "../../../src/theme";

const TYPES: { key: Appointment["type"]; label: string; emoji: string; color: string }[] = [
  { key: "follow_up", label: "Follow-up", emoji: "🩺", color: Colors.primary },
  { key: "lab_test", label: "Lab Test", emoji: "🧪", color: Colors.warning },
  { key: "hospital_visit", label: "Hospital Visit", emoji: "🏥", color: Colors.danger },
];

export default function Appointments() {
  const guard = useRoleGuard(["patient", "nurse"]);
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [appointments, setAppts] = useState<Appointment[]>([]);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<Appointment["type"]>("follow_up");
  const [form, setForm] = useState({ title: "", doctorName: "", facilityName: "", address: "", notes: "" });
  const [dateTime, setDateTime] = useState(new Date());

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const init = async () => {
    try {
      const { patient } = await patientApi.getMe();
      setPatientId(patient._id);
      const { appointments: list } = await appointmentApi.getAll(patient._id);
      setAppts(list.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()));
    } catch (e: any) {
      if (user?.role !== "nurse") Alert.alert("Error", e.message);
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { if (!guard) init(); }, [guard]);
  if (guard) return guard;
  if (loading) return <LoadingScreen label="Loading appointments…" />;

  const createAppt = async () => {
    if (!form.title.trim() || !form.facilityName.trim() || !form.address.trim()) {
      Alert.alert("Required", "Title, facility, and address are required.");
      return;
    }
    if (!patientId) {
      Alert.alert("Error", "Could not identify your patient profile.");
      return;
    }
    try {
      setSaving(true);
      await appointmentApi.create({
        patientId,
        type,
        title: form.title.trim(),
        doctorName: form.doctorName.trim() || undefined,
        facilityName: form.facilityName.trim(),
        address: form.address.trim(),
        dateTime: dateTime.toISOString() as any,
        notes: form.notes.trim() || undefined,
        completed: false,
      });
      setShowModal(false);
      setForm({ title: "", doctorName: "", facilityName: "", address: "", notes: "" });
      setDateTime(new Date());
      init();
    } catch (e: any) { Alert.alert("Error", e.message); }
    finally { setSaving(false); }
  };

  const completeAppt = async (id: string) => {
    try { await appointmentApi.complete(id); init(); }
    catch (e: any) { Alert.alert("Error", e.message); }
  };

  const now = new Date();
  const upcoming = appointments.filter(a => !a.completed && new Date(a.dateTime) >= now);
  const past = appointments.filter(a => a.completed || new Date(a.dateTime) < now);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Follow-Up Calendar</Text>
        {patientId && (
          <Button title="+ New" onPress={() => setShowModal(true)} size="sm" color={Colors.warning} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); init(); }} tintColor={Colors.warning} />}
      >
        <SectionHeader title={`Upcoming (${upcoming.length})`} />
        {upcoming.length === 0
          ? <EmptyState emoji="📅" title="No upcoming appointments" />
          : upcoming.map(a => <ApptCard key={a._id} appt={a} onComplete={() => completeAppt(a._id)} canComplete={user?.role === "nurse"} />)
        }

        {past.length > 0 && (
          <>
            <SectionHeader title={`Past (${past.length})`} />
            {past.map(a => <ApptCard key={a._id} appt={a} faded canComplete={false} onComplete={() => {}} />)}
          </>
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <SafeAreaView style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>New Appointment</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}><Text style={s.closeBtn}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={s.label}>Type</Text>
              <Row style={{ gap: 8, marginBottom: Spacing.md, flexWrap: "wrap" }}>
                {TYPES.map(t => (
                  <TouchableOpacity key={t.key} style={[s.typeChip, type === t.key && { backgroundColor: t.color, borderColor: t.color }]} onPress={() => setType(t.key)}>
                    <Text style={[s.typeChipText, type === t.key && { color: "#fff" }]}>{t.emoji} {t.label}</Text>
                  </TouchableOpacity>
                ))}
              </Row>
              <Input label="Title *" placeholder="e.g. Cardiology Follow-up" value={form.title} onChangeText={set("title")} />
              <Input label="Doctor Name" placeholder="e.g. Dr. Mehta" value={form.doctorName} onChangeText={set("doctorName")} />
              <Input label="Facility / Lab Name *" placeholder="e.g. City Hospital" value={form.facilityName} onChangeText={set("facilityName")} />
              <Input label="Address *" placeholder="e.g. 12 MG Road, room 4" value={form.address} onChangeText={set("address")} />
              <DateTimeField label="Date & Time *" value={dateTime} onChange={setDateTime} />
              <Input label="Notes" placeholder="Bring previous reports…" value={form.notes} onChangeText={set("notes")} multiline numberOfLines={3} style={{ height: 80, textAlignVertical: "top" } as any} />
              <Button title="Create Appointment" onPress={createAppt} loading={saving} color={Colors.warning} />
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function ApptCard({ appt, faded, canComplete, onComplete }: { appt: Appointment; faded?: boolean; canComplete: boolean; onComplete: () => void }) {
  const date = new Date(appt.dateTime);
  const isToday = date.toDateString() === new Date().toDateString();
  const isTomorrow = date.toDateString() === new Date(Date.now() + 86400000).toDateString();
  const meta = TYPES.find(t => t.key === appt.type);

  return (
    <Card style={faded ? { ...s.apptCard, opacity: 0.6 } : s.apptCard}>
      <Row style={{ gap: 12 }}>
        <View style={s.dateBox}>
          <Text style={s.dateDay}>{date.getDate()}</Text>
          <Text style={s.dateMonth}>{date.toLocaleDateString("en-GB", { month: "short" })}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.apptTitle}>{meta?.emoji} {appt.title}</Text>
          {appt.doctorName && <Text style={s.apptMeta}>👨‍⚕️ {appt.doctorName}</Text>}
          <Text style={s.apptMeta}>📍 {appt.facilityName}</Text>
          <Text style={s.apptTime}>
            🕐 {formatTime(appt.dateTime)}
            {isToday && <Text style={{ color: Colors.danger }}>  · Today</Text>}
            {isTomorrow && <Text style={{ color: Colors.warning }}>  · Tomorrow</Text>}
          </Text>
        </View>
        {appt.completed && <Badge label="Done" color={Colors.success} />}
      </Row>
      {!appt.completed && canComplete && (
        <Button title="Mark Complete" onPress={onComplete} variant="outline" color={Colors.success} style={{ marginTop: 12 }} size="sm" />
      )}
    </Card>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: Spacing.lg, paddingBottom: Spacing.sm },
  title: { fontSize: 24, fontWeight: "900", color: Colors.text },
  scroll: { padding: Spacing.md, gap: 10, paddingBottom: 40 },
  apptCard: {},
  dateBox: { width: 52, height: 52, borderRadius: Radius.md, backgroundColor: Colors.warningLight, alignItems: "center", justifyContent: "center" },
  dateDay: { fontSize: 18, fontWeight: "900", color: Colors.warning },
  dateMonth: { fontSize: 10, fontWeight: "700", color: Colors.warning, textTransform: "uppercase" },
  apptTitle: { fontSize: 15, fontWeight: "800", color: Colors.text },
  apptMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  apptTime: { fontSize: 12, color: Colors.primary, marginTop: 4, fontWeight: "600" },
  modal: { flex: 1, backgroundColor: Colors.bg },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 20, fontWeight: "900", color: Colors.text },
  closeBtn: { fontSize: 20, color: Colors.textMuted, padding: 4 },
  modalBody: { padding: Spacing.lg, gap: 4, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: "600", color: Colors.text, marginBottom: 6 },
  typeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.card },
  typeChipText: { fontSize: 12, fontWeight: "700", color: Colors.textSecondary },
});