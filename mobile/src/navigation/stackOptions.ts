import { useMemo } from "react";

import { useTheme } from "@/theme";

/** Native header styling shared by every tab's stack (large titles on iOS). */
export function useStackScreenOptions() {
  const { colors } = useTheme();

  return useMemo(
    () => ({
      headerLargeTitleEnabled: true,
      headerShadowVisible: false,
      headerBackButtonDisplayMode: "minimal" as const,
      headerTintColor: colors.primary,
      headerStyle: { backgroundColor: colors.background },
      headerTitleStyle: { color: colors.text },
      headerLargeTitleStyle: { color: colors.text },
      contentStyle: { backgroundColor: colors.background },
    }),
    [colors]
  );
}
