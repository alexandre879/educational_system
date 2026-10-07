import { StyleSheet, Text, type TextProps } from "react-native";

import { useTheme, type Colors } from "@/theme";

type Variant = "display" | "title" | "heading" | "subheading" | "body" | "bodyStrong" | "caption" | "label";
type Tone = "text" | "secondary" | "muted" | "primary" | "danger" | "success" | "onPrimary";

const TONE_TO_COLOR: Record<Tone, keyof Colors> = {
  text: "text",
  secondary: "textSecondary",
  muted: "textMuted",
  primary: "primary",
  danger: "danger",
  success: "success",
  onPrimary: "onPrimary",
};

export interface AppTextProps extends TextProps {
  variant?: Variant;
  tone?: Tone;
  center?: boolean;
}

export function AppText({ variant = "body", tone = "text", center, style, ...rest }: AppTextProps) {
  const { colors } = useTheme();
  return (
    <Text
      style={[styles[variant], { color: colors[TONE_TO_COLOR[tone]] as string }, center && styles.center, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  display: { fontSize: 40, lineHeight: 46, fontWeight: "800", letterSpacing: -1, fontVariant: ["tabular-nums"] },
  title: { fontSize: 28, lineHeight: 34, fontWeight: "800", letterSpacing: -0.6 },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: "700", letterSpacing: -0.3 },
  subheading: { fontSize: 17, lineHeight: 23, fontWeight: "600", letterSpacing: -0.2 },
  body: { fontSize: 16, lineHeight: 22 },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: "600" },
  caption: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 12, lineHeight: 16, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
  center: { textAlign: "center" },
});
