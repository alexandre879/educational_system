import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, View } from "react-native";

import { useI18n } from "@/i18n";
import { addDays, isoWeekday, parseISODate, toISODate, weekdayName } from "@/lib/dates";
import { radius, spacing, useTheme } from "@/theme";

import { AppText } from "./AppText";
import { GlassBackdrop, useLiquidGlass } from "./Glass";
import { Icon } from "./Icon";

interface DateStripProps {
  /** Selected day as YYYY-MM-DD. */
  value: string;
  onChange: (value: string) => void;
}

/** The Monday–Sunday week around the selected day, with arrows to move by a week. */
export function DateStrip({ value, onChange }: DateStripProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const glass = useLiquidGlass();
  const selected = parseISODate(value);
  const monday = addDays(selected, 1 - isoWeekday(selected));
  const today = toISODate(new Date());
  const days = Array.from({ length: 7 }, (_, index) => addDays(monday, index));

  const pick = (iso: string) => {
    Haptics.selectionAsync().catch(() => undefined);
    onChange(iso);
  };

  return (
    <View
      style={[
        styles.wrapper,
        glass
          ? { borderColor: colors.border }
          : { backgroundColor: colors.surface, borderColor: colors.border, boxShadow: colors.shadow },
      ]}
    >
      <GlassBackdrop radius={radius.lg} />
      <Pressable accessibilityRole="button" onPress={() => pick(toISODate(addDays(selected, -7)))} hitSlop={8} style={styles.arrow}>
        <Icon name="chevronLeft" size={16} color={colors.textMuted} />
      </Pressable>
      {days.map((day) => {
        const iso = toISODate(day);
        const isSelected = iso === value;
        const isToday = iso === today;
        return (
          <Pressable
            key={iso}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            onPress={() => pick(iso)}
            style={[styles.day, isSelected && { backgroundColor: colors.primary }]}
          >
            <AppText variant="caption" style={{ color: isSelected ? colors.onPrimary : colors.textMuted, fontWeight: "600" }}>
              {weekdayName(isoWeekday(day), t, true)}
            </AppText>
            <AppText variant="bodyStrong" style={{ color: isSelected ? colors.onPrimary : colors.text }}>
              {day.getDate()}
            </AppText>
            <View
              style={[
                styles.todayDot,
                { backgroundColor: isToday ? (isSelected ? colors.onPrimary : colors.primary) : "transparent" },
              ]}
            />
          </Pressable>
        );
      })}
      <Pressable accessibilityRole="button" onPress={() => pick(toISODate(addDays(selected, 7)))} hitSlop={8} style={styles.arrow}>
        <Icon name="chevronRight" size={16} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  arrow: { paddingHorizontal: 2, paddingVertical: spacing.md },
  day: { flex: 1, alignItems: "center", paddingVertical: spacing.sm, borderRadius: radius.md, gap: 2 },
  todayDot: { width: 5, height: 5, borderRadius: 3 },
});
