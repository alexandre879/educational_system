import { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { useI18n } from "@/i18n";
import { radius, spacing, useTheme } from "@/theme";

import { markTone } from "./MarkChip";

interface MarkSheetProps {
  studentName: string | null;
  maxMark: number;
  saving: boolean;
  onSave: (value: number, comment: string) => void;
  onClose: () => void;
}

/** Bottom sheet for a teacher to pick a 1–10 mark and an optional comment. */
export function MarkSheet({ studentName, maxMark, saving, onSave, onClose }: MarkSheetProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState<number | null>(null);
  const [comment, setComment] = useState("");

  // Start fresh for each student.
  const [lastStudent, setLastStudent] = useState(studentName);
  if (studentName !== lastStudent) {
    setLastStudent(studentName);
    setValue(null);
    setComment("");
  }

  const values = Array.from({ length: maxMark }, (_, i) => i + 1);

  return (
    <Modal visible={studentName !== null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t("common.close")} />
      <View style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <AppText variant="subheading">{t("gradebook.markFor", { name: studentName ?? "" })}</AppText>

        <View style={styles.grid}>
          {values.map((option) => {
            const tone = markTone(option, colors);
            const selected = option === value;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setValue(option)}
                style={[
                  styles.value,
                  { backgroundColor: selected ? tone.color : tone.background, borderColor: selected ? tone.color : "transparent" },
                ]}
              >
                <AppText variant="heading" style={{ color: selected ? "#FFFFFF" : tone.color }}>
                  {option}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        <TextField
          placeholder={t("gradebook.commentPlaceholder")}
          value={comment}
          onChangeText={setComment}
          maxLength={255}
        />
        <Button
          title={t("common.save")}
          variant="gradient"
          loading={saving}
          disabled={value === null}
          onPress={() => value !== null && onSave(value, comment.trim())}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.4)" },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  handle: { alignSelf: "center", width: 40, height: 5, borderRadius: 3 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  value: {
    width: "18%",
    flexGrow: 1,
    aspectRatio: 1.2,
    borderRadius: radius.md,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
