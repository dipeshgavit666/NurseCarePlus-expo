import { useState } from "react";
import { View, Text, TouchableOpacity, Platform, StyleSheet } from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Colors, Radius, Spacing } from "../../theme";

function fmt(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return { date: `${dd}/${mm}/${yyyy}`, time: `${hh}:${min}` };
}

export function DateTimeField({ label, value, onChange }: { label: string; value: Date; onChange: (d: Date) => void }) {
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const { date, time } = fmt(value);

  return (
    <View style={{ marginBottom: Spacing.md }}>
      <Text style={s.label}>{label}</Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <TouchableOpacity style={s.field} onPress={() => setShowDate(true)}>
          <Text style={s.fieldText}>📅 {date}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.field} onPress={() => setShowTime(true)}>
          <Text style={s.fieldText}>🕐 {time}</Text>
        </TouchableOpacity>
      </View>

      {showDate && (
        <DateTimePicker
          value={value}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_: DateTimePickerEvent, d?: Date) => {
            setShowDate(false);
            if (d) { const n = new Date(value); n.setFullYear(d.getFullYear(), d.getMonth(), d.getDate()); onChange(n); }
          }}
        />
      )}
      {showTime && (
        <DateTimePicker
          value={value}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_: DateTimePickerEvent, d?: Date) => {
            setShowTime(false);
            if (d) { const n = new Date(value); n.setHours(d.getHours(), d.getMinutes()); onChange(n); }
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  label: { fontSize: 13, fontWeight: "600", color: Colors.text, marginBottom: 6 },
  field: { flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, padding: 12, backgroundColor: Colors.card },
  fieldText: { fontSize: 14, fontWeight: "600", color: Colors.text },
});