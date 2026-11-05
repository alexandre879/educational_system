import { useMemo } from "react";
import { Platform } from "react-native";

import { useLiquidGlass } from "@/components/Glass";
import { useBackdropStyle, useTheme } from "@/theme";

/**
 * Native header styling shared by every tab's stack. Tab roots hide this header and draw their
 * own large title (see Screen's `title`); pushed screens get a standard inline title.
 *
 * On iOS the header is transparent, so the screen's backdrop runs behind it edge to edge: iOS 26
 * adds its own Liquid Glass edge effect when content scrolls under it, and older iOS versions
 * get a system blur instead.
 */
export function useStackScreenOptions() {
  const { colors, scheme } = useTheme();
  const backdrop = useBackdropStyle();
  const liquidGlass = useLiquidGlass();
  const ios = Platform.OS === "ios";

  return useMemo(
    () => ({
      headerLargeTitleEnabled: false,
      headerShadowVisible: false,
      headerBackButtonDisplayMode: "minimal" as const,
      headerTintColor: colors.primary,
      headerTransparent: ios,
      headerBlurEffect:
        ios && !liquidGlass ? (scheme === "dark" ? ("systemChromeMaterialDark" as const) : ("systemChromeMaterialLight" as const)) : undefined,
      headerStyle: { backgroundColor: ios ? "transparent" : colors.background },
      headerTitleStyle: { color: colors.text },
      contentStyle: backdrop,
    }),
    [colors, scheme, backdrop, liquidGlass, ios]
  );
}
