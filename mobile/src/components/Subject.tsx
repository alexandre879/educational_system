import { StyleSheet, View } from "react-native";

import { radius, spacing, subjectColor, withAlpha } from "@/theme";

import { AppText } from "./AppText";

/** Pill in the subject's own color, so a subject looks the same on every screen. */
export function SubjectBadge({ subjectId, label }: { subjectId: number | null | undefined; label: string }) {
  const color = subjectColor(subjectId);
  return (
    <View style={[styles.badge, { backgroundColor: withAlpha(color, 0.14) }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <AppText variant="caption" numberOfLines={1} style={{ color, fontWeight: "700" }}>
        {label}
      </AppText>
    </View>
  );
}

/** Rounded square with the subject's initial, used as a list/timeline marker. */
export function SubjectMark({ subjectId, label, size = 44 }: { subjectId: number | null | undefined; label: string; size?: number }) {
  const color = subjectColor(subjectId);
  return (
    <View
      style={[
        styles.mark,
        { width: size, height: size, borderRadius: size * 0.32, backgroundColor: withAlpha(color, 0.16) },
      ]}
    >
      <AppText style={{ color, fontWeight: "800", fontSize: size * 0.4 }}>
        {(label.trim()[0] ?? "?").toUpperCase()}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.pill,
    maxWidth: "100%",
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  mark: { alignItems: "center", justifyContent: "center" },
});
