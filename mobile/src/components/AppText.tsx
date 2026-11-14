import { Children, type ReactNode } from "react";
import { StyleSheet, Text, type TextProps } from "react-native";

import { mtavruli } from "@/lib/mtavruli";
import { useTheme, type Colors } from "@/theme";

type Variant = "display" | "title" | "heading" | "subheading" | "body" | "bodyStrong" | "caption" | "label";
type Tone = "text" | "secondary" | "muted" | "primary" | "danger" | "success" | "onPrimary" | "onGradient";

const TONE_TO_COLOR: Record<Tone, keyof Colors> = {
  text: "text",
  secondary: "textSecondary",
  muted: "textMuted",
  primary: "primary",
  danger: "danger",
  success: "success",
  onPrimary: "onPrimary",
  onGradient: "onGradient",
};

export interface AppTextProps extends TextProps {
  variant?: Variant;
  tone?: Tone;
  center?: boolean;
}

export function AppText({ variant = "body", tone = "text", center, style, children, ...rest }: AppTextProps) {
  const { colors } = useTheme();
  // Text styled in capitals shows Georgian in its capital alphabet, Mtavruli (see lib/mtavruli).
  const uppercase = variant === "label" || (style != null && StyleSheet.flatten(style)?.textTransform === "uppercase");

  return (
    <Text
      style={[styles[variant], { color: colors[TONE_TO_COLOR[tone]] as string }, center && styles.center, style]}
      {...rest}
    >
      {uppercase ? toMtavruli(children) : children}
    </Text>
  );
}

function toMtavruli(children: ReactNode): ReactNode {
  return typeof children === "string"
    ? mtavruli(children)
    : Children.map(children, (child) => (typeof child === "string" ? mtavruli(child) : child));
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
