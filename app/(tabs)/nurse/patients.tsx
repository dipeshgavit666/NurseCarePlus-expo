import { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { patientApi, Patient } from "../../../src/api";
import { useRoleGuard } from "../../../src/hooks/useRoleGuard";
import { Card, Avatar, Row, EmptyState, LoadingScreen, Badge, Button } from "../../../src/components/common/UI";
import { Colors, Spacing } from "../../../src/theme";

export default function Patients() {
  const guard = useRoleGuard(["nurse"]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const { patients: list } = await patientApi.getAll();
      setPatients(list);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { if (!guard) load(); }, [guard]);
  if (guard) return guard;
  if (loading) return <LoadingScreen label="Loading patients…" />;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Patients</Text>
        <Button title="+ New" onPress={() => router.push("/(tabs)/nurse/create-patient")} size="sm" color={Colors.nurse} />
      </View>
      <FlatList
        data={patients}
        keyExtractor={p => p._id}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={<EmptyState emoji="🧑‍🦽" title="No patients yet" subtitle="Create your first patient profile" />}
        renderItem={({ item }) => (
          <Card style={s.card}>
            <Row style={{ gap: 12 }}>
              <Avatar emoji="🧑‍🦽" size={50} color={Colors.nurseLight} />
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{item.name}</Text>
                {item.diagnosis && <Text style={s.dx}>{item.diagnosis}</Text>}
                {item.age != null && <Text style={s.meta}>Age: {item.age}</Text>}
                {item.inviteCode && <Text style={s.meta}>Invite code: {item.inviteCode}</Text>}
              </View>
              <Badge label={`${item.linkedFamilyIds?.length ?? 0} family`} color={Colors.family} />
            </Row>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: Spacing.lg, paddingBottom: Spacing.sm },
  title: { fontSize: 26, fontWeight: "900", color: Colors.text },
  list: { padding: Spacing.md, gap: 10 },
  card: {},
  name: { fontSize: 16, fontWeight: "700", color: Colors.text },
  dx: { fontSize: 13, color: Colors.nurse, marginTop: 2, fontWeight: "600" },
  meta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
});
