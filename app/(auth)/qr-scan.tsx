import { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { authApi } from "../../src/api";
import { useAuth } from "../../src/context/AuthContext";
import { Colors, Spacing } from "../../src/theme";

export default function QRScan() {
  const { login } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!permission) return <View style={s.safe} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.permWrap}>
          <Text style={s.permEmoji}>📷</Text>
          <Text style={s.permTitle}>Camera Access Needed</Text>
          <Text style={s.permSub}>NurseCare+ needs camera access to scan your QR code from the nurse.</Text>
          <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
            <Text style={s.permBtnText}>Grant Access</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleScan = async ({ data }: { data: string }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);
    try {
      // data could be a raw qrToken or a JSON string
      let qrToken = data;
      try { const parsed = JSON.parse(data); qrToken = parsed.token || parsed.qrToken || data; } catch {}

      const { token, user } = await authApi.qrLogin({ qrToken });
      await login(token, user);
      router.replace("/(tabs)/home");
    } catch (e: any) {
      Alert.alert("QR Login Failed", e.message, [
        { text: "Try Again", onPress: () => setScanned(false) },
        { text: "Cancel",    onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleScan}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      />

      {/* Overlay */}
      <View style={s.overlay}>
        <SafeAreaView style={s.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
            <Text style={s.closeText}>✕  Close</Text>
          </TouchableOpacity>
        </SafeAreaView>

        <View style={s.finder}>
          <View style={[s.corner, s.tl]} />
          <View style={[s.corner, s.tr]} />
          <View style={[s.corner, s.bl]} />
          <View style={[s.corner, s.br]} />
        </View>

        <View style={s.hint}>
          <Text style={s.hintText}>
            {loading ? "⏳  Logging you in…" : "Point camera at the QR code from your nurse"}
          </Text>
        </View>
      </View>
    </View>
  );
}

const FINDER = 240;
const CORNER = 22;
const BORDER = 4;

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.bg },
  container:   { flex: 1, backgroundColor: "#000" },
  permWrap:    { flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing.xl, gap: Spacing.md },
  permEmoji:   { fontSize: 56 },
  permTitle:   { fontSize: 22, fontWeight: "800", color: Colors.text, textAlign: "center" },
  permSub:     { fontSize: 14, color: Colors.textMuted, textAlign: "center", lineHeight: 22 },
  permBtn:     { backgroundColor: Colors.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  permBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  overlay:     { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "space-between" },
  topBar:      { width: "100%", paddingHorizontal: 20, paddingTop: 8 },
  closeBtn:    { alignSelf: "flex-start", backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  closeText:   { color: "#fff", fontWeight: "700", fontSize: 14 },

  finder:      {
    width: FINDER, height: FINDER,
    backgroundColor: "transparent",
  },
  corner:      { position: "absolute", width: CORNER, height: CORNER, borderColor: "#fff", borderWidth: BORDER },
  tl:          { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  tr:          { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  bl:          { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  br:          { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },

  hint:        { marginBottom: 60, paddingHorizontal: Spacing.xl },
  hintText:    { color: "#fff", fontSize: 14, textAlign: "center", backgroundColor: "rgba(0,0,0,0.55)", padding: 12, borderRadius: 10 },
});
