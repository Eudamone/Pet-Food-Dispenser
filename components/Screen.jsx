import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export const colors = {
  background: "#FFF8EA",
  card: "#FFFDF7",
  ink: "#381008",
  muted: "#745549",
  accent: "#F57302",
  line: "#EAD7C1",
  error: "#9B2C2C",
};

export function Screen({ title, eyebrow, children }) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({ children }) {
  return <View style={styles.card}>{children}</View>;
}

export function Action({
  label,
  onPress,
  disabled = false,
  secondary = false,
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        secondary && styles.secondary,
        (pressed || disabled) && styles.dimmed,
      ]}
    >
      <Text style={[styles.actionText, secondary && styles.secondaryText]}>
        {label}
      </Text>
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: 22,
    paddingBottom: 115,
    gap: 14,
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
  },
  eyebrow: {
    color: colors.muted,
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 2,
  },
  title: { color: colors.ink, fontFamily: "titan-one", fontSize: 34 },
  heading: { color: colors.ink, fontSize: 18, fontWeight: "800" },
  body: { color: colors.muted, lineHeight: 21, fontSize: 15 },
  label: { color: colors.ink, fontWeight: "700", fontSize: 14 },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    padding: 16,
    borderRadius: 20,
    gap: 9,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    color: colors.ink,
    fontSize: 16,
    backgroundColor: colors.card,
  },
  action: {
    backgroundColor: colors.ink,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 11,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 14,
  },
  actionText: { color: "#FFFDF7", fontWeight: "800", textAlign: "center" },
  secondary: { backgroundColor: "#FFE7C5" },
  secondaryText: { color: colors.ink },
  dimmed: { opacity: 0.55 },
  error: { color: colors.error, fontSize: 14 },
});
