import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Alert, RefreshControl, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { patientApi, appointmentApi, Appointment } from "../../../src/api";
import { useAuth } from "../../../src/context/AuthContext";
import { Card, Row, SectionHeader, EmptyState, LoadingScreen, Button, Input, Badge } from "../../../src/components/common/UI";
import { Colors, Spacing, Radius } from "../../../src/theme";

const TYPE_META: Record<string, { emoji: string; color: string }> = {
  followup: { emoji: "🩺", color: Colors.primary },
  lab:      { emoji: "🧪", color: Colors.warning },
  hospital: { emoji: "🏥", color: Colors.danger },
};

export default function Appointments() {
  const { user } = useAuth();
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [appointments, setAppts]    = useState<Appointment[]>([]);
  const [patientId, setPatientId]   = useState<string | null>(null);
  const [showModal, setShowModal]   = useState(false);
  const [saving, setSaving]         = useState(false);
  const [form, setForm] = useState({ title: "", doctorName: "", location: "", dateTime: "", notes: "" });

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const init = async () => {
    try {
      const { patient } = await patientApi.getMe();
      setPatientId(patient._id);
      const { appointments: list } = await appointmentApi.getAll(patient._id);
      setAppts(list.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()));
    } catch (e: any) { Alert.alert("Error", e.message); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { init(); }, []);

  const createAppt = async () => {
    if (!form.title || !form.dateTime) { Alert.alert("Required", "Title and date/time are required."); return; }
    try {
      setSaving(true);
      await appointmentApi.create({ ...form, patientId: patientId!, completed: false });
      setShowModal(false);
      setForm({ title: "", doctorName: "", location: "", dateTime: "", notes: "" });
      init();
    } catch (e: any) { Alert.alert("Error", e.message); }
    finally { setSaving(false); }
  };

  const completeAppt = async (id: string) => {
    try { await appointmentApi.complete(id); init(); }
    catch (e: any) { Alert.alert("Error", e.message); }
  };

  if (loading) return <LoadingScreen label="Loading appointments…" />;

  const now = new Date();
  const upcoming = appointments.filter(a => !a.completed && new Date(a.dateTime) >= now);
  const past     = appointments.filter(a => a.completed || new Date(a.dateTime) < now);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Follow-Up Calendar</Text>
        {user?.role === "nurse" && (
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
              <Input label="Title *" placeholder="e.g. Cardiology Follow-up" value={form.title} onChangeText={set("title")} />
              <Input label="Doctor / Lab Name" placeholder="e.g. Dr. Mehta" value={form.doctorName} onChangeText={set("doctorName")} />
              <Input label="Location" placeholder="e.g. City Hospital, Room 4" value={form.location} onChangeText={set("location")} />
              <Input label="Date & Time *" placeholder="YYYY-MM-DDTHH:MM" value={form.dateTime} onChangeText={set("dateTime")} />
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

  return (
    <Card style={faded ? { ...s.apptCard, opacity: 0.6 } : s.apptCard}>
      <Row style={{ gap: 12 }}>
        <View style={s.dateBox}>
          <Text style={s.dateDay}>{date.getDate()}</Text>
          <Text style={s.dateMonth}>{date.toLocaleDateString("en-IN", { month: "short" })}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.apptTitle}>{appt.title}</Text>
          {appt.doctorName && <Text style={s.apptMeta}>👨‍⚕️ {appt.doctorName}</Text>}
          {appt.location && <Text style={s.apptMeta}>📍 {appt.location}</Text>}
          <Text style={s.apptTime}>
            🕐 {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
  safe:        { flex: 1, backgroundColor: Colors.bg },
  header:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: Spacing.lg, paddingBottom: Spacing.sm },
  title:       { fontSize: 24, fontWeight: "900", color: Colors.text },
  scroll:      { padding: Spacing.md, gap: 10, paddingBottom: 40 },
  apptCard:    { },
  dateBox:     { width: 52, height: 52, borderRadius: Radius.md, backgroundColor: Colors.warningLight, alignItems: "center", justifyContent: "center" },
  dateDay:     { fontSize: 18, fontWeight: "900", color: Colors.warning },
  dateMonth:   { fontSize: 10, fontWeight: "700", color: Colors.warning, textTransform: "uppercase" },
  apptTitle:   { fontSize: 15, fontWeight: "800", color: Colors.text },
  apptMeta:    { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  apptTime:    { fontSize: 12, color: Colors.primary, marginTop: 4, fontWeight: "600" },
  modal:       { flex: 1, backgroundColor: Colors.bg },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle:  { fontSize: 20, fontWeight: "900", color: Colors.text },
  closeBtn:    { fontSize: 20, color: Colors.textMuted, padding: 4 },
  modalBody:   { padding: Spacing.lg, gap: 4, paddingBottom: 40 },
});
