import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo } from "react";

import { AuthProvider, useAuth } from "@/auth/AuthProvider";
import { ToastProvider } from "@/components/Toast";
import { I18nProvider, useI18n } from "@/i18n";
import { withCrashReporting } from "@/lib/sentry";
import { QueryProvider } from "@/providers/QueryProvider";
import { AppLockProvider } from "@/security/AppLock";
import { ThemeProvider, useTheme } from "@/theme";

// Keep the splash screen up until the stored session and language are restored.
SplashScreen.preventAutoHideAsync();

function RootLayout() {
  return (
    <QueryProvider>
      <I18nProvider>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <AppLockProvider>
                <RootNavigator />
              </AppLockProvider>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </I18nProvider>
    </QueryProvider>
  );
}

export default withCrashReporting(RootLayout);

function RootNavigator() {
  const { status } = useAuth();
  const { ready } = useI18n();
  const { colors, scheme } = useTheme();
  const loading = status === "loading" || !ready;

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync().catch(() => undefined);
  }, [loading]);

  const navigationTheme = useMemo(() => {
    const base = scheme === "dark" ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
      },
    };
  }, [scheme, colors]);

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      {/* While the session is being restored (behind the splash screen) the app area
          stays reachable, so a deep link such as a tapped notification isn't
          redirected away before we know whether the user is signed in. */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={status !== "signedOut"}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={status === "signedOut"}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
      </Stack>
    </NavigationThemeProvider>
  );
}
