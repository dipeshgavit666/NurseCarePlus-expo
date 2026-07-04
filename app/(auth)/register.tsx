import { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { authApi, Role } from "../../src/api";
import { useAuth } from "../../src/context/AuthContext";
import { Button, Input, Card } from "../../src/components/common/UI";
import { Colors, Spacing, Radius } from "../../src/theme";

const ROLES: { key: Role; label: string; emoji: string; color: string; desc: string }[] = [
  { key: "nurse",   label: "Nurse / Admin", emoji: "👩‍⚕️", color: Colors.nurse,   desc: "Create & manage patient profiles" },
  { key: "family",  label: "Family",        emoji: "👨‍👩‍👧", color: Colors.family,  desc: "Monitor & receive alerts" },
];

export default function Register() {
  const { login } = useAuth();
  const [role, setRole] = useState<Role>("nurse");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const activeRole = ROLES.find(r => r.key === role)!;

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert("Required", "Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters.");
      return;
    }
    try {
      setLoading(true);
      const { token, user } = await authApi.register({ name: name.trim(), email: email.trim(), password, role });
      await login(token, user);
      router.replace((role === "family" ? "(auth)/link-patient" : "(tabs)/home") as any);
    } catch (e: any) {
      Alert.alert("Registration Failed", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={s.back}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={s.title}>Create Account</Text>
          <Text style={s.sub}>
            Join NurseCare+ {"\n"}
            <Text style={{ fontSize: 12 }}>Note: patients don't register directly — a nurse creates your profile and gives you a QR code to scan.</Text>
          </Text>

          <Text style={s.roleHeading}>I am a…</Text>
          <View style={s.roles}>
            {ROLES.map(r => (
              <TouchableOpacity
                key={r.key}
                style={[s.roleCard, role === r.key && { borderColor: r.color, backgroundColor: r.color + "0D" }]}
                onPress={() => setRole(r.key)}
                activeOpacity={0.85}
              >
                <Text style={s.roleEmoji}>{r.emoji}</Text>
                <Text style={[s.roleLabel, role === r.key && { color: r.color }]}>{r.label}</Text>
                <Text style={s.roleDesc}>{r.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Card style={s.form}>
            <Input label="Full Name" placeholder="Jane Doe" value={name} onChangeText={setName} icon="👤" />
            <Input label="Email" placeholder="you@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" icon="✉️" />
            <Input label="Password" placeholder="Min. 6 characters" value={password} onChangeText={setPassword} secureTextEntry icon="🔒" />
            <Button title="Create Account" onPress={handleRegister} loading={loading} color={activeRole.color} />
          </Card>

          <TouchableOpacity style={s.loginLink} onPress={() => router.back()}>
            <Text style={s.loginText}>
              Already have an account?{"  "}
              <Text style={{ color: activeRole.color, fontWeight: "700" }}>Sign in →</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: Spacing.lg, paddingTop: 52 },
  back: { marginBottom: Spacing.md },
  backText: { color: Colors.primary, fontSize: 15, fontWeight: "600" },
  title: { fontSize: 28, fontWeight: "900", color: Colors.text },
  sub: { fontSize: 14, color: Colors.textMuted, marginBottom: Spacing.lg, lineHeight: 20 },
  roleHeading: { fontSize: 14, fontWeight: "700", color: Colors.text, marginBottom: 10 },
  roles: { gap: 10, marginBottom: Spacing.lg },
  roleCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.card },
  roleEmoji: { fontSize: 28 },
  roleLabel: { fontSize: 14, fontWeight: "700", color: Colors.text },
  roleDesc: { fontSize: 12, color: Colors.textMuted, flex: 1 },
  form: { gap: 0 },
  loginLink: { alignItems: "center", marginTop: Spacing.lg },
  loginText: { fontSize: 14, color: Colors.textMuted },
});
