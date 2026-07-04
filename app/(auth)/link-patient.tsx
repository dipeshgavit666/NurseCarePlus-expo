import { useState } from "react";
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { patientApi } from "../../src/api";
import { Button, Input, Card } from "../../src/components/common/UI";
import { Colors, Spacing } from "../../src/theme";

export default function LinkPatient() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLink = async () => {
    if (!code.trim()) { Alert.alert("Required", "Enter the 6-digit invite code."); return; }
    try {
      setLoading(true);
      await patientApi.linkFamily({ inviteCode: code.trim().toUpperCase() });
      router.replace("/(tabs)/home");
    } catch (e: any) {
      Alert.alert("Couldn't link", e.message);
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={s.body}>
          <Text style={s.title}>Link to your patient</Text>
          <Text style={s.sub}>Ask the nurse or patient for the 6-digit invite code shown when the patient profile was created.</Text>
          <Card style={s.card}>
            <Input label="Invite Code" placeholder="e.g. NRS7K2" value={code} onChangeText={t => setCode(t.toUpperCase())} autoCapitalize="characters" maxLength={6} />
            <Button title="Link Account" onPress={handleLink} loading={loading} color={Colors.family} />
          </Card>
          <Button title="Skip for now" onPress={() => router.replace("/(tabs)/home")} variant="ghost" />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  body: { flex: 1, padding: Spacing.lg, justifyContent: "center", gap: Spacing.md },
  title: { fontSize: 24, fontWeight: "900", color: Colors.text, textAlign: "center" },
  sub: { fontSize: 13, color: Colors.textMuted, textAlign: "center", lineHeight: 20 },
  card: { gap: 0 },
});