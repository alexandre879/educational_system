import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { radius, spacing, useTheme } from "@/theme";

import { AppText } from "./AppText";
import { Icon } from "./Icon";

export interface SelectOption<T> {
  value: T;
  label: string;
  description?: string;
}

interface SelectSheetProps<T> {
  visible: boolean;
  title: string;
  options: SelectOption<T>[];
  selected?: T | null;
  onSelect: (value: T) => void;
  onClose: () => void;
}

/** Bottom sheet with a list of choices (subject pickers etc.). */
export function SelectSheet<T>({ visible, title, options, selected, onSelect, onClose }: SelectSheetProps<T>) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View
        style={[
          styles.sheet,
          { backgroundColor: colors.surface, paddingBottom: insets.bottom + spacing.md },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <AppText variant="subheading" style={styles.title}>
          {title}
        </AppText>
        <ScrollView>
          {options.map((option) => {
            const isSelected = option.value === selected;
            return (
              <Pressable
                key={String(option.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => {
                  onSelect(option.value);
                  onClose();
                }}
                style={({ pressed }) => [styles.option, pressed && { backgroundColor: colors.surfaceMuted }]}
              >
                <View style={styles.optionText}>
                  <AppText variant={isSelected ? "bodyStrong" : "body"}>{option.label}</AppText>
                  {option.description ? (
                    <AppText variant="caption" tone="secondary">
                      {option.description}
                    </AppText>
                  ) : null}
                </View>
                {isSelected ? <Icon name="check" size={20} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.4)" },
  sheet: {
    maxHeight: "70%",
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.sm,
  },
  handle: { alignSelf: "center", width: 40, height: 5, borderRadius: 3, marginBottom: spacing.sm },
  title: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 52,
  },
  optionText: { flex: 1, gap: 2 },
});
