import React from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, TextInput, TextInputProps,
  ViewStyle, TextStyle,
} from "react-native";
import { Colors, Radius, Shadow, Spacing } from "../../theme";

// ─── Button ──────────────────────────────────────────────────────────────────
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  style?: ViewStyle;
  color?: string;
}

export function Button({
  title, onPress, variant = "primary", size = "md",
  loading, disabled, icon, style, color,
}: ButtonProps) {
  const bg = variant === "primary" ? (color || Colors.primary)
    : variant === "danger" ? Colors.danger
    : "transparent";
  const borderColor = variant === "outline" ? (color || Colors.primary) : "transparent";
  const textColor = (variant === "primary" || variant === "danger") ? "#fff"
    : color || Colors.primary;
  const pad = size === "sm" ? 10 : size === "lg" ? 18 : 14;
  const fontSize = size === "sm" ? 13 : size === "lg" ? 17 : 15;

  return (
    <TouchableOpacity
      style={[
        styles.btn,
        { backgroundColor: bg, borderColor, borderWidth: variant === "outline" ? 1.5 : 0, paddingVertical: pad },
        (disabled || loading) && { opacity: 0.6 },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading
        ? <ActivityIndicator color={textColor} size="small" />
        : <Text style={[styles.btnText, { color: textColor, fontSize }]}>
            {icon ? `${icon}  ${title}` : title}
          </Text>
      }
    </TouchableOpacity>
  );
}

// ─── Card ────────────────────────────────────────────────────────────────────
export function Card({ children, style, onPress }: {
  children: React.ReactNode; style?: ViewStyle; onPress?: () => void;
}) {
  if (onPress) {
    return (
      <TouchableOpacity style={[styles.card, style]} onPress={onPress} activeOpacity={0.9}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

// ─── Input ───────────────────────────────────────────────────────────────────
interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: string;
  containerStyle?: ViewStyle;
}

export function Input({ label, error, icon, containerStyle, style, ...props }: InputProps) {
  return (
    <View style={[{ marginBottom: Spacing.md }, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrap, error ? { borderColor: Colors.danger } : {}]}>
        {icon && <Text style={styles.inputIcon}>{icon}</Text>}
        <TextInput
          style={[styles.input, icon ? { paddingLeft: 0 } : {}, style as TextStyle]}
          placeholderTextColor={Colors.textMuted}
          {...props}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

// ─── Badge ───────────────────────────────────────────────────────────────────
export function Badge({ label, color = Colors.primary }: { label: string; color?: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color + "18", borderColor: color + "40" }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Chip (filled) ───────────────────────────────────────────────────────────
export function Chip({ label, color = Colors.primary, onPress }: {
  label: string; color?: string; onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, { backgroundColor: color }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.chipText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────
export function Row({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[{ flexDirection: "row", alignItems: "center" }, style]}>{children}</View>;
}

// ─── Divider ─────────────────────────────────────────────────────────────────
export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[styles.divider, style]} />;
}

// ─── Section Header ──────────────────────────────────────────────────────────
export function SectionHeader({ title, action, onAction }: {
  title: string; action?: string; onAction?: () => void;
}) {
  return (
    <Row style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      )}
    </Row>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────
export function EmptyState({ emoji = "📭", title, subtitle }: {
  emoji?: string; title: string; subtitle?: string;
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle && <Text style={styles.emptySub}>{subtitle}</Text>}
    </View>
  );
}

// ─── Loading screen ──────────────────────────────────────────────────────────
export function LoadingScreen({ label = "Loading…" }: { label?: string }) {
  return (
    <View style={styles.loadingScreen}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.loadingLabel}>{label}</Text>
    </View>
  );
}

// ─── Avatar circle ───────────────────────────────────────────────────────────
export function Avatar({ emoji, size = 48, color = Colors.primaryLight }: {
  emoji: string; size?: number; color?: string;
}) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      <Text style={{ fontSize: size * 0.45 }}>{emoji}</Text>
    </View>
  );
}

// ─── Info Row ────────────────────────────────────────────────────────────────
export function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, mono && { fontFamily: "monospace", fontSize: 12 }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  btn: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { fontWeight: "700", letterSpacing: 0.2 },

  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadow.md,
  },

  label: { fontSize: 13, fontWeight: "600", color: Colors.text, marginBottom: 6 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.card,
    paddingHorizontal: Spacing.md,
  },
  inputIcon: { fontSize: 18, marginRight: Spacing.sm },
  input: { flex: 1, paddingVertical: 13, fontSize: 15, color: Colors.text },
  errorText: { fontSize: 12, color: Colors.danger, marginTop: 4 },

  badge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: Radius.full, borderWidth: 1,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 11, fontWeight: "700" },

  chip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: Radius.full,
  },
  chipText: { color: "#fff", fontSize: 13, fontWeight: "600" },

  divider: { height: 1, backgroundColor: Colors.divider, marginVertical: Spacing.sm },

  sectionHeader: { justifyContent: "space-between", marginBottom: Spacing.sm },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: Colors.text },
  sectionAction: { fontSize: 13, fontWeight: "600", color: Colors.primary },

  empty: { alignItems: "center", paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: Colors.text },
  emptySub: { fontSize: 14, color: Colors.textMuted, textAlign: "center" },

  loadingScreen: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: Colors.bg },
  loadingLabel: { color: Colors.textMuted, fontSize: 14 },

  avatar: { alignItems: "center", justifyContent: "center" },

  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  infoLabel: { fontSize: 14, color: Colors.textMuted, flex: 1 },
  infoValue: { fontSize: 14, fontWeight: "600", color: Colors.text, flex: 2, textAlign: "right" },
});
