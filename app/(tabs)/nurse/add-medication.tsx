import { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Image, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { medicationApi } from "../../../src/api";
import { useRoleGuard } from "../../../src/hooks/useRoleGuard";
import { Input, Button, Card, Row } from "../../../src/components/common/UI";
import { Colors, Spacing, Radius } from "../../../src/theme";

const PRESETS = [
  { label: "Morning", time: "08:00" },
  { label: "Afternoon", time: "14:00" },
  { label: "Evening", time: "18:00" },
  { label: "Night", time: "21:00" },
];

export default function AddMedication() {
  const guard = useRoleGuard(["nurse"]);

  // useLocalSearchParams can return string[] for a param — coerce to string
  // or subsequent ObjectId casts on the backend will fail.
  const params = useLocalSearchParams<{ patientId?: string | string[] }>();
  const patientId = Array.isArray(params.patientId) ? params.patientId[0] : params.patientId;

  const [form, setForm] = useState({ name: "", dose: "", unit: "mg", instructions: "", customTime: "" });
  const [times, setTimes] = useState<string[]>([]);
  const [isOngoing, setIsOngoing] = useState(true);
  const [endDate, setEndDate] = useState(""); // YYYY-MM-DD, only used if not ongoing
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (guard) return guard;

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const toggleTime = (time: string) => {
    setTimes(t => (t.includes(time) ? t.filter(x => x !== time) : [...t, time].sort()));
  };

  const addCustomTime = () => {
    const t = form.customTime.trim();
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(t)) {
      Alert.alert("Invalid time", "Enter time as HH:MM, e.g. 09:30.");
      return;
    }
    if (!times.includes(t)) setTimes(ts => [...ts, t].sort());
    setForm(f => ({ ...f, customTime: "" }));
  };

  const pickPhoto = async (fromCamera: boolean) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", fromCamera ? "Camera access is required to take a photo." : "Photo library access is required to pick a photo.");
      return;
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.7, allowsEditing: true })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7, allowsEditing: true });
    if (!result.canceled && result.assets?.[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleCreate = async () => {
    if (!patientId) {
      Alert.alert("Missing patient", "No patient was specified for this medication.");
      return;
    }
    if (!form.name.trim() || !form.dose.trim()) {
      Alert.alert("Required", "Medicine name and dose are required.");
      return;
    }
    if (times.length === 0) {
      Alert.alert("Required", "Add at least one schedule time.");
      return;
    }
    if (!isOngoing && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      Alert.alert("Invalid end date", "Enter end date as YYYY-MM-DD, or switch to Ongoing.");
      return;
    }

    try {
      setSaving(true);

      const { medication } = await medicationApi.create({
        patientId,
        name: form.name.trim(),
        dose: form.dose.trim(),
        unit: form.unit.trim() || "mg",
        instructions: form.instructions.trim(),
        schedule: times.map(time => ({ time, taken: false })),
        startDate: new Date().toISOString() as any,
        endDate: isOngoing ? undefined : (new Date(endDate).toISOString() as any),
        isOngoing,
        active: true,
      });

      // Photo upload requires an existing medication id, so this always
      // happens as a second step after create — matches how the backend
      // route is structured (POST /medications/:medicationId/photo).
      if (photoUri) {
        const formData = new FormData();
        const filename = photoUri.split("/").pop() || "medicine.jpg";
        const ext = filename.split(".").pop()?.toLowerCase();
        const mimeType = ext === "png" ? "image/png" : "image/jpeg";
        formData.append("photo", { uri: photoUri, name: filename, type: mimeType } as any);
        try {
          await medicationApi.uploadPhoto(medication._id, formData);
        } catch (photoErr: any) {
          // Medication itself was saved successfully — don't block on a
          // failed photo upload, just tell the nurse.
          Alert.alert("Medicine saved", "The medicine was added, but the photo upload failed. You can retry from the medicine's detail screen.");
          router.back();
          return;
        }
      }

      Alert.alert("✅ Added", `${form.name.trim()} has been added to the care plan.`);
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <Text style={s.title}>Add Medication</Text>

          <Card style={s.card}>
            <Text style={s.section}>Medicine Photo</Text>
            {photoUri ? (
              <View style={s.photoPreviewWrap}>
                <Image source={{ uri: photoUri }} style={s.photoPreview} />
                <TouchableOpacity style={s.removePhoto} onPress={() => setPhotoUri(null)}>
                  <Text style={s.removePhotoText}>✕ Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.photoPlaceholder}>
                <Text style={{ fontSize: 36 }}>💊</Text>
                <Text style={s.photoHint}>No photo added yet</Text>
              </View>
            )}
            <Row style={{ gap: 10, marginTop: 10 }}>
              <Button title="📷 Take Photo" onPress={() => pickPhoto(true)} variant="outline" color={Colors.nurse} style={{ flex: 1 }} size="sm" />
              <Button title="🖼️ Choose Photo" onPress={() => pickPhoto(false)} variant="outline" color={Colors.nurse} style={{ flex: 1 }} size="sm" />
            </Row>
          </Card>

          <Card style={s.card}>
            <Text style={s.section}>Medicine Details</Text>
            <Input label="Medicine Name *" placeholder="e.g. Amlodipine" value={form.name} onChangeText={set("name")} icon="💊" />
            <Row style={{ gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Input label="Dose *" placeholder="e.g. 5" value={form.dose} onChangeText={set("dose")} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Input label="Unit" placeholder="mg" value={form.unit} onChangeText={set("unit")} />
              </View>
            </Row>
            <Input
              label="Instructions"
              placeholder="e.g. Take after food"
              value={form.instructions}
              onChangeText={set("instructions")}
              multiline
              numberOfLines={3}
              style={{ height: 80, textAlignVertical: "top" } as any}
            />
          </Card>

          <Card style={s.card}>
            <Text style={s.section}>Schedule *</Text>
            <Row style={{ gap: 8, flexWrap: "wrap" }}>
              {PRESETS.map(p => (
                <TouchableOpacity
                  key={p.time}
                  style={[s.chip, times.includes(p.time) && { backgroundColor: Colors.nurse, borderColor: Colors.nurse }]}
                  onPress={() => toggleTime(p.time)}
                >
                  <Text style={[s.chipText, times.includes(p.time) && { color: "#fff" }]}>{p.label} · {p.time}</Text>
                </TouchableOpacity>
              ))}
            </Row>

            <Row style={{ gap: 8, marginTop: 10, alignItems: "flex-end" }}>
              <View style={{ flex: 1 }}>
                <Input label="Custom time (HH:MM)" placeholder="e.g. 09:30" value={form.customTime} onChangeText={set("customTime")} keyboardType="numbers-and-punctuation" />
              </View>
              <Button title="Add" onPress={addCustomTime} size="sm" color={Colors.nurse} style={{ marginBottom: Spacing.md }} />
            </Row>

            {times.length > 0 && (
              <Row style={{ gap: 6, flexWrap: "wrap" }}>
                {times.map(t => (
                  <TouchableOpacity key={t} style={s.timePill} onPress={() => toggleTime(t)}>
                    <Text style={s.timePillText}>{t} ✕</Text>
                  </TouchableOpacity>
                ))}
              </Row>
            )}
          </Card>

          <Card style={s.card}>
            <Text style={s.section}>Duration</Text>
            <Row style={{ gap: 10 }}>
              <TouchableOpacity style={[s.durationChip, isOngoing && { backgroundColor: Colors.nurse, borderColor: Colors.nurse }]} onPress={() => setIsOngoing(true)}>
                <Text style={[s.chipText, isOngoing && { color: "#fff" }]}>Ongoing</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.durationChip, !isOngoing && { backgroundColor: Colors.nurse, borderColor: Colors.nurse }]} onPress={() => setIsOngoing(false)}>
                <Text style={[s.chipText, !isOngoing && { color: "#fff" }]}>Fixed course</Text>
              </TouchableOpacity>
            </Row>
            {!isOngoing && (
              <Input label="End date (YYYY-MM-DD)" placeholder="e.g. 2026-07-20" value={endDate} onChangeText={setEndDate} containerStyle={{ marginTop: Spacing.md }} />
            )}
          </Card>

          <Button title="Save Medication" onPress={handleCreate} loading={saving} color={Colors.nurse} size="lg" icon="💾" style={{ marginTop: 4 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: "900", color: Colors.text },
  card: {},
  section: { fontSize: 15, fontWeight: "800", color: Colors.nurse, marginBottom: Spacing.md },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.card },
  chipText: { fontSize: 12, fontWeight: "700", color: Colors.textSecondary },
  durationChip: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.card },
  timePill: { backgroundColor: Colors.nurseLight, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 5 },
  timePillText: { fontSize: 12, fontWeight: "700", color: Colors.nurse },
  photoPlaceholder: { alignItems: "center", justifyContent: "center", height: 140, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, borderStyle: "dashed", backgroundColor: Colors.bg, gap: 6 },
  photoHint: { fontSize: 12, color: Colors.textMuted },
  photoPreviewWrap: { alignItems: "center" },
  photoPreview: { width: 160, height: 160, borderRadius: Radius.md },
  removePhoto: { marginTop: 8 },
  removePhotoText: { fontSize: 12, color: Colors.danger, fontWeight: "700" },
});