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

const ROLES: { key: Role; label: string; emoji: string; color: string }[] = [
  { key: "nurse",   label: "Nurse",   emoji: "👩‍⚕️", color: Colors.nurse   },
  { key: "patient", label: "Patient", emoji: "🧑‍🦽", color: Colors.patient },
  { key: "family",  label: "Family",  emoji: "👨‍👩‍👧", color: Colors.family  },
];

export default function Login() {
  const { login } = useAuth();
  const [role, setRole]       = useState<Role>("patient");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const activeRole = ROLES.find(r => r.key === role)!;

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Required", "Please enter your email and password.");
      return;
    }
    try {
      setLoading(true);
      const { token, user } = await authApi.login({ email: email.trim(), password });
      await login(token, user);
      router.replace("/(tabs)/home");
    } catch (e: any) {
      Alert.alert("Login Failed", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* Logo */}
          <View style={s.logoWrap}>
            <View style={[s.logoCircle, { backgroundColor: activeRole.color + "20" }]}>
              <Text style={s.logoEmoji}>🏥</Text>
            </View>
            <Text style={s.appName}>NurseCare+</Text>
            <Text style={s.tagline}>Post-Discharge Care Platform</Text>
          </View>

          {/* Role selector */}
          <View style={s.roles}>
            {ROLES.map(r => (
              <TouchableOpacity
                key={r.key}
                style={[
                  s.roleBtn,
                  role === r.key && { backgroundColor: r.color, borderColor: r.color },
                ]}
                onPress={() => setRole(r.key)}
                activeOpacity={0.8}
              >
                <Text style={s.roleEmoji}>{r.emoji}</Text>
                <Text style={[s.roleLabel, role === r.key && { color: "#fff" }]}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Form card */}
          <Card style={s.form}>
            <Text style={s.formTitle}>Welcome back</Text>
            <Text style={s.formSub}>Sign in as {activeRole.label}</Text>

            <Input
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              icon="✉️"
            />
            <Input
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              icon="🔒"
            />

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              color={activeRole.color}
              style={{ marginTop: 4 }}
            />

            {/* QR option for patients */}
            {role === "patient" && (
              <>
                <View style={s.or}>
                  <View style={s.orLine} /><Text style={s.orText}>or</Text><View style={s.orLine} />
                </View>
                <Button
                  title="Scan QR Code"
                  onPress={() => router.push("/(auth)/qr-scan")}
                  variant="outline"
                  color={Colors.patient}
                  icon="📷"
                />
              </>
            )}
          </Card>

          {/* Register link */}
          <TouchableOpacity style={s.register} onPress={() => router.push("/(auth)/register")}>
            <Text style={s.registerText}>
              No account?{"  "}
              <Text style={{ color: activeRole.color, fontWeight: "700" }}>Create one →</Text>
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.bg },
  scroll:      { padding: Spacing.lg, paddingTop: Spacing.xl },
  logoWrap:    { alignItems: "center", marginBottom: Spacing.xl },
  logoCircle:  { width: 88, height: 88, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  logoEmoji:   { fontSize: 44 },
  appName:     { fontSize: 30, fontWeight: "900", color: Colors.text },
  tagline:     { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  roles:       { flexDirection: "row", gap: 10, marginBottom: Spacing.lg },
  roleBtn:     {
    flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.card, gap: 4,
  },
  roleEmoji:   { fontSize: 24 },
  roleLabel:   { fontSize: 12, fontWeight: "700", color: Colors.textSecondary },
  form:        { gap: 2 },
  formTitle:   { fontSize: 22, fontWeight: "800", color: Colors.text, marginBottom: 2 },
  formSub:     { fontSize: 13, color: Colors.textMuted, marginBottom: Spacing.md },
  or:          { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: Spacing.md },
  orLine:      { flex: 1, height: 1, backgroundColor: Colors.border },
  orText:      { color: Colors.textMuted, fontSize: 13 },
  register:    { alignItems: "center", marginTop: Spacing.lg },
  registerText:{ fontSize: 14, color: Colors.textMuted },
});
