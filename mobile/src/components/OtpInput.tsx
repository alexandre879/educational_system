import { forwardRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { radius, spacing, useTheme } from "@/theme";

import { AppText } from "./AppText";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  editable?: boolean;
  hasError?: boolean;
}

/**
 * Six boxes for the login code. A single hidden input does the typing, so
 * paste and the keyboard's one-time-code autofill keep working.
 */
export const OtpInput = forwardRef<TextInput, OtpInputProps>(function OtpInput(
  { value, onChange, length = 6, editable = true, hasError },
  ref
) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [input, setInput] = useState<TextInput | null>(null);

  return (
    <Pressable accessibilityRole="none" onPress={() => input?.focus()} style={styles.wrapper}>
      <View style={styles.boxes} pointerEvents="none">
        {Array.from({ length }, (_, index) => {
          const char = value[index] ?? "";
          const active = focused && index === Math.min(value.length, length - 1);
          return (
            <View
              key={index}
              style={[
                styles.box,
                {
                  backgroundColor: colors.surface,
                  borderColor: hasError ? colors.danger : active ? colors.primary : colors.border,
                  borderWidth: active || hasError ? 2 : 1,
                },
              ]}
            >
              <AppText variant="heading">{char}</AppText>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={(node) => {
          setInput(node);
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, "").slice(0, length))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={length}
        editable={editable}
        caretHidden
        style={styles.hiddenInput}
        accessibilityLabel="One-time code"
      />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  wrapper: { position: "relative" },
  boxes: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  box: {
    flex: 1,
    aspectRatio: 0.85,
    maxHeight: 64,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  // Covers the boxes so taps focus it, but stays invisible.
  hiddenInput: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, opacity: 0.02, color: "transparent" },
});
