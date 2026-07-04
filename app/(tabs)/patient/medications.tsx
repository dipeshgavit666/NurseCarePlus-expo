import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, RefreshControl, Modal, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { patientApi } from "../../../src/api";
import { useMeds } from "../../../src/context/MedContext";
import { useRoleGuard } from "../../../src/hooks/useRoleGuard";
import { sendMissedDoseAlert } from "../../../src/services/notifications";
import { Card, Row, EmptyState, LoadingScreen, Badge, Button, SectionHeader } from "../../../src/components/common/UI";
import { Colors, Spacing, Radius } from "../../../src/theme";

export default function Medications() {
  const guard = useRoleGuard(["patient"]);
  const { medications, history, loading, loadMeds, markTaken, isTakenToday } = useMeds();
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);

  const init = async () => {
    try {
      const { patient } = await patientApi.getMe();
      await loadMeds(patient._id);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  useEffect(() => { if (!guard) init(); }, [guard]);
  if (guard) return guard;
  if (loading) return <LoadingScreen label="Loading medications…" />;

  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();

  const selectedMed = medications.find(m => m._id === selected);

  const handleMarkTaken = async (medId: string, medName: string, scheduledTime: string) => {
    if (isTakenToday(medId, scheduledTime)) {
      Alert.alert("Already Taken", `${medName} at ${scheduledTime} is already marked as taken.`);
      return;
    }
    try {
      setMarking(true);
      await markTaken(medId, scheduledTime);
      Alert.alert("✅ Done!", `${medName} marked as taken.`);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally { setMarking(false); }
  };

  const handleMissedAlert = async (medName: string) => {
    await sendMissedDoseAlert(medName);
    Alert.alert("Alert Sent", "A missed-dose notification has been triggered.");
  };

  const totalSlots = medications.reduce((n, m) => n + (m.schedule?.length ?? 0), 0);
  const takenSlots = medications.reduce(
    (n, m) => n + (m.schedule ?? []).filter(sl => sl.taken || isTakenToday(m._id, sl.time)).length, 0
  );

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Medications</Text>
        <Badge label={`${takenSlots}/${totalSlots} today`} color={Colors.primary} />
      </View>

      <FlatList
        data={medications}
        keyExtractor={m => m._id}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await init(); setRefreshing(false); }} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState emoji="💊" title="No medications assigned" subtitle="Your nurse will assign medications to your profile." />
        }
        renderItem={({ item }) => {
          const nextSlot = (item.schedule ?? []).find(sl => {
            const [h, m] = sl.time.split(":").map(Number);
            return !sl.taken && !isTakenToday(item._id, sl.time) && (h * 60 + (m || 0)) >= nowMins;
          });
          const allTaken = (item.schedule ?? []).every(sl => sl.taken || isTakenToday(item._id, sl.time));

          return (
            <TouchableOpacity onPress={() => setSelected(item._id)} activeOpacity={0.85}>
              <Card style={allTaken ? { ...s.medCard, ...s.medCardDone } : s.medCard}>
                <Row style={{ gap: 12 }}>
                  <View style={[s.pillIcon, { backgroundColor: allTaken ? Colors.successLight : Colors.primaryLight }]}>
                    <Text style={{ fontSize: 26 }}>{allTaken ? "✅" : "💊"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.medName, allTaken && { color: Colors.textMuted }]}>{item.name}</Text>
                    <Text style={s.medDose}>{item.dose}{item.unit}</Text>
                    {item.instructions && <Text style={s.medInstr}>ℹ️ {item.instructions}</Text>}
                    <Row style={{ gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                      {(item.schedule ?? []).map(sl => {
                        const done = sl.taken || isTakenToday(item._id, sl.time);
                        return (
                          <View key={sl.time} style={[s.timeChip, sl.time === nextSlot?.time && !done && s.timeChipActive, done && s.timeChipDone]}>
                            <Text style={[s.timeChipText, sl.time === nextSlot?.time && !done && { color: Colors.primary }, done && { color: Colors.success }]}>
                              {done ? "✓" : "🕐"} {sl.time}
                            </Text>
                          </View>
                        );
                      })}
                    </Row>
                  </View>
                  {allTaken
                    ? <Badge label="All done" color={Colors.success} />
                    : nextSlot
                      ? <View style={s.nextBadge}><Text style={s.nextBadgeText}>Next{"\n"}{nextSlot.time}</Text></View>
                      : null
                  }
                </Row>
              </Card>
            </TouchableOpacity>
          );
        }}
      />

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
                  <Text style={s.histChipTime}>{log.scheduledTime}</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

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
                <Text style={s.heroDose}>{selectedMed.dose}{selectedMed.unit}</Text>
              </View>

              <Card style={s.detailCard}>
                <DetailRow label="Duration" value={selectedMed.isOngoing ? "Ongoing" : "Fixed course"} />
                {selectedMed.instructions && <DetailRow label="Instructions" value={selectedMed.instructions} />}
              </Card>

              <Text style={s.slotsHeading}>Today's schedule</Text>
              {(selectedMed.schedule ?? []).map(sl => {
                const done = sl.taken || isTakenToday(selectedMed._id, sl.time);
                return (
                  <Card key={sl.time} style={s.slotCard}>
                    <Row style={{ justifyContent: "space-between" }}>
                      <Text style={s.slotTime}>🕐 {sl.time}</Text>
                      {done
                        ? <Badge label="Taken" color={Colors.success} />
                        : <Button title="Mark Taken" size="sm" onPress={() => handleMarkTaken(selectedMed._id, selectedMed.name, sl.time)} loading={marking} color={Colors.success} />
                      }
                    </Row>
                  </Card>
                );
              })}

              <Button
                title="Send Missed Alert"
                onPress={() => handleMissedAlert(selectedMed.name)}
                variant="outline"
                color={Colors.warning}
                style={{ marginTop: 10 }}
              />
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
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: Spacing.lg, paddingBottom: Spacing.sm },
  title: { fontSize: 26, fontWeight: "900", color: Colors.text },
  list: { padding: Spacing.md, gap: 10, paddingBottom: 100 },
  medCard: {},
  medCardDone: { opacity: 0.7 },
  pillIcon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  medName: { fontSize: 16, fontWeight: "800", color: Colors.text },
  medDose: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  medInstr: { fontSize: 12, color: Colors.warning, marginTop: 4, fontStyle: "italic" },
  timeChip: { backgroundColor: Colors.bg, borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  timeChipActive: { backgroundColor: Colors.primaryLight },
  timeChipDone: { backgroundColor: Colors.successLight },
  timeChipText: { fontSize: 11, fontWeight: "700", color: Colors.textMuted },
  nextBadge: { backgroundColor: Colors.primaryLight, borderRadius: Radius.sm, padding: 8, alignItems: "center" },
  nextBadgeText: { fontSize: 11, fontWeight: "800", color: Colors.primary, textAlign: "center" },
  historyBar: { backgroundColor: Colors.card, borderTopWidth: 1, borderTopColor: Colors.border, padding: Spacing.md },
  historyTitle: { fontSize: 13, fontWeight: "700", color: Colors.textMuted, marginBottom: 8 },
  histChip: { borderRadius: Radius.md, padding: 10, marginRight: 8, minWidth: 90, alignItems: "center" },
  histChipText: { fontSize: 12, fontWeight: "700", color: Colors.text },
  histChipTime: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  modal: { flex: 1, backgroundColor: Colors.bg },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 20, fontWeight: "900", color: Colors.text },
  closeBtn: { fontSize: 20, color: Colors.textMuted, padding: 4 },
  modalBody: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 40 },
  modalHero: { alignItems: "center", paddingVertical: Spacing.lg, gap: 6 },
  heroName: { fontSize: 24, fontWeight: "900", color: Colors.text },
  heroDose: { fontSize: 16, color: Colors.textMuted },
  detailCard: { gap: 0 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  detailLabel: { fontSize: 14, color: Colors.textMuted },
  detailValue: { fontSize: 14, fontWeight: "700", color: Colors.text, flex: 1, textAlign: "right" },
  slotsHeading: { fontSize: 14, fontWeight: "800", color: Colors.text, marginTop: 4 },
  slotCard: { paddingVertical: 12 },
  slotTime: { fontSize: 15, fontWeight: "700", color: Colors.text },
});
