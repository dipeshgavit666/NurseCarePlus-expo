import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, RefreshControl, Modal, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { patientApi } from "../../../src/api";
import { useAuth } from "../../../src/context/AuthContext";
import { useMeds } from "../../../src/context/MedContext";
import { sendMissedDoseAlert } from "../../../src/services/notifications";
import { Card, Row, Avatar, EmptyState, LoadingScreen, Badge, Button, SectionHeader } from "../../../src/components/common/UI";
import { Colors, Spacing, Radius } from "../../../src/theme";

export default function Medications() {
  const { user } = useAuth();
  const { medications, history, loading, loadMeds, markTaken, isTakenToday } = useMeds();
  const [refreshing, setRefreshing] = useState(false);
  const [patientId, setPatientId]   = useState<string | null>(null);
  const [selected, setSelected]     = useState<string | null>(null);

  const init = async () => {
    try {
      const { patient } = await patientApi.getMe();
      setPatientId(patient._id);
      await loadMeds(patient._id);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  useEffect(() => { init(); }, []);

  const handleMarkTaken = async (medId: string, medName: string) => {
    if (isTakenToday(medId)) {
      Alert.alert("Already Taken", `${medName} is already marked as taken today.`);
      return;
    }
    try {
      await markTaken(medId);
      Alert.alert("✅ Done!", `${medName} marked as taken.`);
      setSelected(null);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const handleMissedAlert = async (medName: string) => {
    await sendMissedDoseAlert(medName);
    Alert.alert("Alert Sent", "A missed-dose notification has been triggered.");
  };

  if (loading) return <LoadingScreen label="Loading medications…" />;

  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();

  // Separate into upcoming today vs already-passed
  const upcoming = medications.filter(m =>
    (m.times ?? []).some(t => {
      const [h, min] = t.split(":").map(Number);
      return h * 60 + (min || 0) >= nowMins;
    })
  );
  const done = medications.filter(m => !upcoming.includes(m));

  const selectedMed = medications.find(m => m._id === selected);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Medications</Text>
        <Badge label={`${medications.length} active`} color={Colors.primary} />
      </View>

      <FlatList
        data={medications}
        keyExtractor={m => m._id}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await init(); setRefreshing(false); }}
            tintColor={Colors.primary}
          />
        }
        ListHeaderComponent={
          <>
            {upcoming.length > 0 && <SectionHeader title="Due Today" />}
          </>
        }
        ListEmptyComponent={
          <EmptyState emoji="💊" title="No medications assigned" subtitle="Your nurse will assign medications to your profile." />
        }
        renderItem={({ item }) => {
          const taken = isTakenToday(item._id);
          const nextTime = (item.times ?? []).find(t => {
            const [h, m] = t.split(":").map(Number);
            return h * 60 + (m || 0) >= nowMins;
          });
          return (
            <TouchableOpacity onPress={() => setSelected(item._id)} activeOpacity={0.85}>
              <Card style={[s.medCard, taken && s.medCardDone]}>
                <Row style={{ gap: 12 }}>
                  <View style={[s.pillIcon, { backgroundColor: taken ? Colors.successLight : Colors.primaryLight }]}>
                    <Text style={{ fontSize: 26 }}>{taken ? "✅" : "💊"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.medName, taken && { color: Colors.textMuted }]}>{item.name}</Text>
                    <Text style={s.medDose}>{item.dosage}  ·  {item.frequency}</Text>
                    {item.instructions && <Text style={s.medInstr}>ℹ️ {item.instructions}</Text>}
                    <Row style={{ gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                      {(item.times ?? []).map(t => (
                        <View key={t} style={[s.timeChip, t === nextTime && !taken && s.timeChipActive]}>
                          <Text style={[s.timeChipText, t === nextTime && !taken && { color: Colors.primary }]}>
                            🕐 {t}
                          </Text>
                        </View>
                      ))}
                    </Row>
                  </View>
                  {taken
                    ? <Badge label="Taken" color={Colors.success} />
                    : nextTime
                      ? <View style={s.nextBadge}><Text style={s.nextBadgeText}>Next{"\n"}{nextTime}</Text></View>
                      : <Badge label="All done" color={Colors.success} />
                  }
                </Row>
              </Card>
            </TouchableOpacity>
          );
        }}
      />

      {/* History strip at bottom */}
      {history.length > 0 && (
        <View style={s.historyBar}>
          <Text style={s.historyTitle}>Recent History</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {history.slice(0, 10).map(log => {
              const med = medications.find(m => m._id === log.medicationId);
              return (
                <View key={log._id} style={[s.histChip, { backgroundColor: log.status === "taken" ? Colors.successLight : Colors.dangerLight }]}>
                  <Text style={s.histChipText}>
                    {log.status === "taken" ? "✅" : "❌"} {med?.name ?? "Med"}
                  </Text>
                  <Text style={s.histChipTime}>
                    {new Date(log.takenAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Detail Modal */}
      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet">
        {selectedMed && (
          <SafeAreaView style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{selectedMed.name}</Text>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <Text style={s.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.modalBody}>
              <View style={s.modalHero}>
                <Text style={{ fontSize: 64 }}>💊</Text>
                <Text style={s.heroName}>{selectedMed.name}</Text>
                <Text style={s.heroDose}>{selectedMed.dosage}</Text>
              </View>

              <Card style={s.detailCard}>
                <DetailRow label="Frequency"    value={selectedMed.frequency} />
                <DetailRow label="Duration"     value={selectedMed.duration ?? "Ongoing"} />
                <DetailRow label="Schedule"     value={(selectedMed.times ?? []).join(", ")} />
                {selectedMed.instructions && (
                  <DetailRow label="Instructions" value={selectedMed.instructions} />
                )}
              </Card>

              <View style={s.takenStatus}>
                {isTakenToday(selectedMed._id)
                  ? <View style={s.takenBadge}>
                      <Text style={s.takenBadgeText}>✅ Taken today</Text>
                    </View>
                  : <>
                      <Button
                        title="Mark as Taken"
                        onPress={() => handleMarkTaken(selectedMed._id, selectedMed.name)}
                        color={Colors.success}
                        size="lg"
                        icon="✅"
                      />
                      <Button
                        title="Send Missed Alert"
                        onPress={() => handleMissedAlert(selectedMed.name)}
                        variant="outline"
                        color={Colors.warning}
                        style={{ marginTop: 10 }}
                      />
                    </>
                }
              </View>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.detailRow}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: Colors.bg },
  header:         { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: Spacing.lg, paddingBottom: Spacing.sm },
  title:          { fontSize: 26, fontWeight: "900", color: Colors.text },
  list:           { padding: Spacing.md, gap: 10, paddingBottom: 100 },
  medCard:        { },
  medCardDone:    { opacity: 0.7 },
  pillIcon:       { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  medName:        { fontSize: 16, fontWeight: "800", color: Colors.text },
  medDose:        { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  medInstr:       { fontSize: 12, color: Colors.warning, marginTop: 4, fontStyle: "italic" },
  timeChip:       { backgroundColor: Colors.bg, borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  timeChipActive: { backgroundColor: Colors.primaryLight },
  timeChipText:   { fontSize: 11, fontWeight: "700", color: Colors.textMuted },
  nextBadge:      { backgroundColor: Colors.primaryLight, borderRadius: Radius.sm, padding: 8, alignItems: "center" },
  nextBadgeText:  { fontSize: 11, fontWeight: "800", color: Colors.primary, textAlign: "center" },
  historyBar:     { backgroundColor: Colors.card, borderTopWidth: 1, borderTopColor: Colors.border, padding: Spacing.md },
  historyTitle:   { fontSize: 13, fontWeight: "700", color: Colors.textMuted, marginBottom: 8 },
  histChip:       { borderRadius: Radius.md, padding: 10, marginRight: 8, minWidth: 90, alignItems: "center" },
  histChipText:   { fontSize: 12, fontWeight: "700", color: Colors.text },
  histChipTime:   { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  modal:          { flex: 1, backgroundColor: Colors.bg },
  modalHeader:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle:     { fontSize: 20, fontWeight: "900", color: Colors.text },
  closeBtn:       { fontSize: 20, color: Colors.textMuted, padding: 4 },
  modalBody:      { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 40 },
  modalHero:      { alignItems: "center", paddingVertical: Spacing.lg, gap: 6 },
  heroName:       { fontSize: 24, fontWeight: "900", color: Colors.text },
  heroDose:       { fontSize: 16, color: Colors.textMuted },
  detailCard:     { gap: 0 },
  detailRow:      { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  detailLabel:    { fontSize: 14, color: Colors.textMuted },
  detailValue:    { fontSize: 14, fontWeight: "700", color: Colors.text, flex: 1, textAlign: "right" },
  takenStatus:    { marginTop: Spacing.sm },
  takenBadge:     { backgroundColor: Colors.successLight, borderRadius: Radius.lg, padding: 20, alignItems: "center" },
  takenBadgeText: { fontSize: 18, fontWeight: "800", color: Colors.success },
});
