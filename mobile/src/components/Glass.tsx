import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";
import { useEffect, useState, type ReactNode } from "react";
import { AccessibilityInfo, Platform, StyleSheet, View, type ColorValue, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "@/theme";

// Some iOS 26 betas lack the API and crash on GlassView (expo/expo#40911), so check both.
const SUPPORTED = (() => {
  if (Platform.OS !== "ios") return false;
  try {
    return isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
  } catch {
    return false;
  }
})();

/** True when iOS 26 Liquid Glass can be drawn and the user hasn't turned on Reduce Transparency. */
export function useLiquidGlass(): boolean {
  const [reduceTransparency, setReduceTransparency] = useState(false);

  useEffect(() => {
    if (!SUPPORTED) return;
    AccessibilityInfo.isReduceTransparencyEnabled()
      .then(setReduceTransparency)
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener("reduceTransparencyChanged", setReduceTransparency);
    return () => subscription.remove();
  }, []);

  return SUPPORTED && !reduceTransparency;
}

/**
 * A pane of native Liquid Glass filling its parent (put it first, behind the content).
 * Renders nothing where Liquid Glass isn't available, so the parent's own background shows.
 */
export function GlassBackdrop({
  radius,
  tint,
  variant = "regular",
}: {
  radius: number;
  tint?: ColorValue;
  variant?: "regular" | "clear";
}) {
  const glass = useLiquidGlass();
  const { scheme } = useTheme();
  if (!glass) return null;

  return (
    <GlassView
      pointerEvents="none"
      glassEffectStyle={variant}
      colorScheme={scheme}
      tintColor={tint}
      style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
    />
  );
}

/** A view that is Liquid Glass on iOS 26 and `fallbackStyle` (e.g. a solid surface) elsewhere. */
export function Glass({
  children,
  style,
  fallbackStyle,
  radius,
  tint,
  variant,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  fallbackStyle?: StyleProp<ViewStyle>;
  radius: number;
  tint?: ColorValue;
  variant?: "regular" | "clear";
}) {
  const glass = useLiquidGlass();

  return (
    <View style={[{ borderRadius: radius }, style, !glass && fallbackStyle]}>
      <GlassBackdrop radius={radius} tint={tint} variant={variant} />
      {children}
    </View>
  );
}
