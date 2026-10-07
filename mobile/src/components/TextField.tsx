import { forwardRef } from "react";
import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";

import { radius, spacing, useTheme } from "@/theme";

import { AppText } from "./AppText";

interface TextFieldProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string | null;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, hint, error, style, multiline, editable = true, ...rest },
  ref
) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrapper}>
      {label ? (
        <AppText variant="caption" tone="secondary" style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        editable={editable}
        style={[
          styles.input,
          multiline && styles.multiline,
          {
            color: editable ? colors.text : colors.textSecondary,
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : colors.border,
          },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <AppText variant="caption" tone="danger">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" tone="muted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  label: { paddingHorizontal: spacing.xs },
  input: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
  },
  multiline: { minHeight: 110, textAlignVertical: "top" },
});
