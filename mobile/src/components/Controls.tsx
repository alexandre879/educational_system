import * as Haptics from "expo-haptics";
import { Children, Fragment, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { radius, spacing, useTheme, withAlpha } from "@/theme";

import { AppText } from "./AppText";
import { Icon, type IconName } from "./Icon";

function tick() {
  Haptics.selectionAsync().catch(() => undefined);
}

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
}

export function Chip({ label, selected, onPress }: ChipProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        tick();
        onPress();
      }}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.primary : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
    >
      <AppText variant="caption" style={{ color: selected ? colors.onPrimary : colors.text, fontWeight: "600" }}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** Horizontally scrolling row of chips, e.g. subject filters. */
export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      {children}
    </ScrollView>
  );
}

interface SegmentedControlProps<T extends string | number> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string | number>({ options, value, onChange }: SegmentedControlProps<T>) {
  const { colors } = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: colors.surfaceMuted }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => {
              tick();
              onChange(option.value);
            }}
            style={[styles.segment, selected && { backgroundColor: colors.surface }]}
          >
            <AppText
              variant="caption"
              numberOfLines={1}
              style={{ fontWeight: selected ? "700" : "500", color: selected ? colors.text : colors.textSecondary }}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

interface ListRowProps {
  icon?: IconName;
  iconColor?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  destructive?: boolean;
}

export function ListRow({ icon, iconColor, title, subtitle, right, onPress, destructive }: ListRowProps) {
  const { colors } = useTheme();
  const tint = destructive ? colors.danger : iconColor ?? colors.primary;

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceMuted }]}
    >
      {icon ? (
        <View
          style={[
            styles.rowIcon,
            {
              backgroundColor: destructive
                ? colors.dangerMuted
                : iconColor
                  ? withAlpha(iconColor, 0.14)
                  : colors.primaryMuted,
            },
          ]}
        >
          <Icon name={icon} size={18} color={tint} />
        </View>
      ) : null}
      <View style={styles.rowText}>
        <AppText variant="bodyStrong" tone={destructive ? "danger" : "text"}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" tone="secondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right ?? (onPress && !destructive ? <Icon name="chevronRight" size={16} color={colors.textMuted} /> : null)}
    </Pressable>
  );
}

/** Groups ListRows into one rounded card with separators. */
export function ListGroup({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const rows = Children.toArray(children).filter(Boolean);

  return (
    <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border, boxShadow: colors.shadow }]}>
      {rows.map((row, index) => (
        <Fragment key={index}>
          {index > 0 ? <View style={[styles.separator, { backgroundColor: colors.border }]} /> : null}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

export function ProgressBar({ progress, color }: { progress: number; color?: string }) {
  const { colors } = useTheme();
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
      <View style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: color ?? colors.primary }]} />
    </View>
  );
}

export function Badge({ label, tone = "primary" }: { label: string; tone?: "primary" | "success" | "danger" | "neutral" }) {
  const { colors } = useTheme();
  const palette = {
    primary: [colors.primaryMuted, colors.primary],
    success: [colors.successMuted, colors.success],
    danger: [colors.dangerMuted, colors.danger],
    neutral: [colors.surfaceMuted, colors.textSecondary],
  }[tone];

  return (
    <View style={[styles.badge, { backgroundColor: palette[0] }]}>
      <AppText variant="caption" style={{ color: palette[1], fontWeight: "600" }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  segmented: { flexDirection: "row", borderRadius: radius.md, padding: 3 },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  rowIcon: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1, gap: 2 },
  group: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: spacing.lg },
  track: { height: 8, borderRadius: 4, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4 },
  badge: { alignSelf: "flex-start", paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill },
});
