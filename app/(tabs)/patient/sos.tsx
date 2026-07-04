import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, RefreshControl, Modal, Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { patientApi, sosApi, Patient, SosEvent } from "../../../src/api";
import { useRoleGuard } from "../../../src/hooks/useRoleGuard";
import { triggerFullSOS, callEmergencyNumber } from "../../../src/services/sos";
import { Card, Row, SectionHeader, EmptyState, LoadingScreen, Button, Badge, Input } from "../../../src/components/common/UI";
import { Colors, Spacing, Radius } from "../../../src/theme";

const EMERGENCY_NUMBER = "108"; // India ambulance — adjust per region

export default function SOS() {
  const guard = useRoleGuard(["patient"]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [events, setEvents] = useState<SosEvent[]>([]);
  const [sending, setSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [contactNumber, setContactNumber] = useState("");
  const [resultModal, setResultModal] = useState<{ smsSent: boolean; hasLocation: boolean } | null>(null);

  const init = async () => {
    try {
      const { patient: p } = await patientApi.getMe();
      setPatient(p);
      const { events: list } = await sosApi.getHistory(p._id);
      setEvents(list);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { if (!guard) init(); }, [guard]);
  if (guard) return guard;
  if (loading) return <LoadingScreen label="Loading SOS history…" />;

  const handleSOS = async () => {
    if (!patient) return;
    setShowConfirm(false);
    setSending(true);
    try {
      const numbers = contactNumber.trim() ? [contactNumber.trim()] : [];
      const { location, smsSent } = await triggerFullSOS({
        patientId: patient._id,
        patientName: patient.name,
        emergencyNumbers: numbers,
      });
      setResultModal({ smsSent, hasLocation: !!location });
      init();
    } catch (e: any) {
      Alert.alert("SOS Failed", e.message);
    } finally {
      setSending(false);
    }
  };

  const callAmbulance = () => callEmergencyNumber(EMERGENCY_NUMBER);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); init(); }} tintColor={Colors.danger} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.title}>Emergency SOS</Text>
        <Text style={s.sub}>One tap connects you to help — call, SMS with location, and in-app alert.</Text>

        <TouchableOpacity style={s.sosBtn} onPress={() => setShowConfirm(true)} activeOpacity={0.85} disabled={sending}>
          <Text style={s.sosEmoji}>🆘</Text>
          <Text style={s.sosLabel}>{sending ? "Sending…" : "PRESS FOR SOS"}</Text>
          <Text style={s.sosSub}>Alerts family, nurse & sends location</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.callBtn} onPress={callAmbulance}>
          <Text style={s.callEmoji}>📞</Text>
          <Text style={s.callText}>Call Ambulance ({EMERGENCY_NUMBER})</Text>
        </TouchableOpacity>

        <Card style={s.infoCard}>
          <Text style={s.infoTitle}>When you press SOS:</Text>
          <InfoStep n="1" text="Your live location is captured" />
          <InfoStep n="2" text="An SOS event is logged for your nurse to see" />
          <InfoStep n="3" text="SMS with map link sent to your emergency contact" />
        </Card>

        <SectionHeader title="SOS History" />
        {events.length === 0
          ? <EmptyState emoji="✅" title="No SOS events" subtitle="Your emergency alert history will appear here." />
          : events.map(ev => (
              <Card key={ev._id} style={s.histCard}>
                <Row style={{ gap: 10 }}>
                  <Text style={{ fontSize: 22 }}>{ev.resolved ? "✅" : "🆘"}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.histDate}>{new Date(ev.triggeredAt).toLocaleString()}</Text>
                    {ev.location && (
                      <TouchableOpacity onPress={() => Linking.openURL(`https://maps.google.com/?q=${ev.location!.latitude},${ev.location!.longitude}`)}>
                        <Text style={s.histLocation}>📍 View location on map</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Badge label={ev.resolved ? "Resolved" : "Active"} color={ev.resolved ? Colors.success : Colors.danger} />
                </Row>
              </Card>
            ))
        }
      </ScrollView>

      <Modal visible={showConfirm} transparent animationType="fade">
        <View style={s.overlay}>
          <Card style={s.confirmCard}>
            <Text style={s.confirmEmoji}>🚨</Text>
            <Text style={s.confirmTitle}>Confirm Emergency SOS</Text>
            <Text style={s.confirmSub}>This will alert your nurse and family with your live location.</Text>
            <Input label="Family contact number (optional, for SMS)" placeholder="+91 9XXXXXXXXX" value={contactNumber} onChangeText={setContactNumber} keyboardType="phone-pad" />
            <Button title="🆘 Send SOS Now" onPress={handleSOS} variant="danger" size="lg" />
            <Button title="Cancel" onPress={() => setShowConfirm(false)} variant="ghost" style={{ marginTop: 8 }} />
          </Card>
        </View>
      </Modal>

      <Modal visible={!!resultModal} transparent animationType="fade">
        <View style={s.overlay}>
          <Card style={s.confirmCard}>
            <Text style={s.confirmEmoji}>✅</Text>
            <Text style={s.confirmTitle}>SOS Sent</Text>
            <Text style={s.confirmSub}>
              {resultModal?.hasLocation ? "Your location was captured. " : "Location unavailable. "}
              {resultModal?.smsSent ? "SMS with location sent to your contact." : "No SMS sent (no number provided or SMS unavailable on this device)."}
              {"\n\n"}Your nurse has been notified.
            </Text>
            <Button title="Done" onPress={() => setResultModal(null)} color={Colors.success} />
          </Card>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function InfoStep({ n, text }: { n: string; text: string }) {
  return (
    <Row style={{ gap: 10, marginTop: 8 }}>
      <View style={s.stepNum}><Text style={s.stepNumText}>{n}</Text></View>
      <Text style={s.stepText}>{text}</Text>
    </Row>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: "900", color: Colors.text },
  sub: { fontSize: 13, color: Colors.textMuted, marginTop: -8 },
  sosBtn: { backgroundColor: Colors.danger, borderRadius: Radius.xl, padding: Spacing.xl, alignItems: "center", gap: 4, shadowColor: Colors.danger, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  sosEmoji: { fontSize: 56 },
  sosLabel: { fontSize: 22, fontWeight: "900", color: "#fff", letterSpacing: 1 },
  callBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1.5, borderColor: Colors.border },
  callEmoji: { fontSize: 22 },
  callText: { fontSize: 15, fontWeight: "700", color: Colors.text },
  infoCard: {},
  infoTitle: { fontSize: 14, fontWeight: "800", color: Colors.text },
  stepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.dangerLight, alignItems: "center", justifyContent: "center" },
  stepNumText: { fontSize: 11, fontWeight: "900", color: Colors.danger },
  stepText: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  histCard: {},
  histDate: { fontSize: 12, fontWeight: "700", color: Colors.text },
  histLocation: { fontSize: 12, color: Colors.primary, marginTop: 4, fontWeight: "600" },
  sosSub: { fontSize: 13, color: Colors.textMuted, textAlign: "center", marginTop: 8 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: Spacing.lg },
  confirmCard: { width: "100%", alignItems: "center", gap: 8 },
  confirmEmoji: { fontSize: 48 },
  confirmTitle: { fontSize: 20, fontWeight: "900", color: Colors.text },
  confirmSub: { fontSize: 13, color: Colors.textMuted, textAlign: "center", lineHeight: 20, marginBottom: 8 },
});
