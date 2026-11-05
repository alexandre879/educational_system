import AsyncStorage from "@react-native-async-storage/async-storage";
import { isAxiosError } from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { errorStatus, isNetworkError } from "@/api/client";
import { requestOtp, verifyOtp } from "@/api/endpoints";
import { useAuth } from "@/auth/AuthProvider";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { OtpInput } from "@/components/OtpInput";
import { TextField } from "@/components/TextField";
import { SUPPORTED_LANGUAGES } from "@/config";
import { LANGUAGE_NAMES, useI18n, type Translate } from "@/i18n";
import { radius, spacing, useBackdropStyle, useTheme } from "@/theme";

const LAST_EMAIL_KEY = "auth.lastEmail";
// Matches the server's default OTP_RATE_LIMIT.
const RESEND_SECONDS = 30;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function requestErrorMessage(error: unknown, t: Translate): string {
  if (isNetworkError(error)) return t("common.networkError");
  switch (errorStatus(error)) {
    case 404:
      return t("auth.notFound");
    case 400:
      return t("auth.notLinked");
    case 429:
      return t("auth.tooMany");
    default:
      return t("auth.sendFailed");
  }
}

function verifyErrorMessage(error: unknown, t: Translate): string {
  if (isNetworkError(error)) return t("common.networkError");
  const status = errorStatus(error);
  if (status === 429) return t("auth.tooMany");
  if (status === 400 && isAxiosError(error)) {
    const message = String((error.response?.data as { error?: string } | undefined)?.error ?? "");
    return message.toLowerCase().includes("expired") ? t("auth.expired") : t("auth.invalidCode");
  }
  return t("common.genericError");
}

export default function SignInScreen() {
  const { t, language, setLanguage } = useI18n();
  const { colors } = useTheme();
  const backdrop = useBackdropStyle();
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const codeInput = useRef<TextInput>(null);

  useEffect(() => {
    AsyncStorage.getItem(LAST_EMAIL_KEY)
      .then((saved) => saved && setEmail((current) => current || saved))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const normalizedEmail = email.trim().toLowerCase();

  const sendCode = async () => {
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError(t("auth.invalidEmail"));
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await requestOtp(normalizedEmail);
      AsyncStorage.setItem(LAST_EMAIL_KEY, normalizedEmail).catch(() => undefined);
      setCode("");
      setStep("code");
      setResendIn(RESEND_SECONDS);
      setTimeout(() => codeInput.current?.focus(), 300);
    } catch (requestError) {
      setError(requestErrorMessage(requestError, t));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value: string) => {
    if (busy || value.length !== 6) return;

    setBusy(true);
    setError(null);
    try {
      const tokens = await verifyOtp(normalizedEmail, value);
      // Navigation to the app happens automatically once the session is set.
      await signIn(tokens);
    } catch (verifyError) {
      setError(verifyErrorMessage(verifyError, t));
      setCode("");
      setBusy(false);
    }
  };

  const onCodeChange = (digits: string) => {
    setCode(digits);
    if (error) setError(null);
    if (digits.length === 6) void verify(digits);
  };

  return (
    <View style={[styles.flex, backdrop]}>
      <LinearGradient
        colors={colors.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { height: 300 + insets.top }]}
      >
        <View style={[styles.circle, styles.circleLarge]} />
        <View style={[styles.circle, styles.circleSmall]} />
      </LinearGradient>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Icon name="school" size={34} color={colors.primary} />
            </View>
            <AppText variant="title" style={styles.white} center>
              {t("auth.welcome")}
            </AppText>
            <AppText style={styles.whiteMuted} center>
              {step === "email" ? t("auth.subtitle") : t("auth.codeSentTo", { email: normalizedEmail })}
            </AppText>
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border, boxShadow: "0px 16px 40px rgba(16, 24, 40, 0.12)" },
            ]}
          >
            {step === "email" ? (
              <>
                <TextField
                  label={t("auth.emailLabel")}
                  placeholder={t("auth.emailPlaceholder")}
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    if (error) setError(null);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="send"
                  onSubmitEditing={sendCode}
                  editable={!busy}
                />
                <Button title={t("auth.sendCode")} icon="telegram" variant="gradient" onPress={sendCode} loading={busy} />
              </>
            ) : (
              <>
                <AppText variant="caption" tone="secondary">
                  {t("auth.codeLabel")}
                </AppText>
                <OtpInput ref={codeInput} value={code} onChange={onCodeChange} editable={!busy} hasError={!!error} />
                <Button
                  title={t("auth.verify")}
                  variant="gradient"
                  onPress={() => verify(code)}
                  loading={busy}
                  disabled={code.length !== 6}
                />
                <View style={styles.links}>
                  <Pressable disabled={resendIn > 0 || busy} onPress={sendCode} accessibilityRole="button" hitSlop={8}>
                    <AppText variant="caption" tone={resendIn > 0 ? "muted" : "primary"} style={styles.link}>
                      {resendIn > 0 ? t("auth.resendIn", { seconds: resendIn }) : t("auth.resend")}
                    </AppText>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setStep("email");
                      setError(null);
                    }}
                    accessibilityRole="button"
                    hitSlop={8}
                  >
                    <AppText variant="caption" tone="primary" style={styles.link}>
                      {t("auth.changeEmail")}
                    </AppText>
                  </Pressable>
                </View>
              </>
            )}

            {error ? (
              <View style={[styles.error, { backgroundColor: colors.dangerMuted }]}>
                <Icon name="warning" size={18} color={colors.danger} />
                <AppText variant="caption" tone="danger" style={styles.flex}>
                  {error}
                </AppText>
              </View>
            ) : null}
          </View>

          <View style={[styles.hint, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Icon name="telegram" size={18} color={colors.primary} />
            <AppText variant="caption" tone="secondary" style={styles.flex}>
              {t("auth.telegramHint")}
            </AppText>
          </View>

          <View style={[styles.languages, { backgroundColor: colors.surfaceMuted }]}>
            {SUPPORTED_LANGUAGES.map((code) => {
              const selected = code === language;
              return (
                <Pressable
                  key={code}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setLanguage(code)}
                  style={[styles.language, selected && { backgroundColor: colors.surface, boxShadow: colors.shadow }]}
                >
                  <AppText variant="caption" style={{ fontWeight: selected ? "700" : "500", color: selected ? colors.text : colors.textSecondary }}>
                    {LANGUAGE_NAMES[code]}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    overflow: "hidden",
  },
  circle: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255, 255, 255, 0.10)" },
  circleLarge: { width: 260, height: 260, top: -80, right: -80 },
  circleSmall: { width: 140, height: 140, bottom: -40, left: -30, backgroundColor: "rgba(255, 255, 255, 0.07)" },
  content: { flexGrow: 1, paddingHorizontal: spacing.xl, gap: spacing.lg },
  brand: { alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    marginBottom: spacing.sm,
    boxShadow: "0px 10px 30px rgba(0, 0, 0, 0.18)",
  },
  white: { color: "#FFFFFF" },
  whiteMuted: { color: "rgba(255, 255, 255, 0.85)" },
  card: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  links: { flexDirection: "row", justifyContent: "space-between" },
  link: { fontWeight: "600" },
  error: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  languages: { flexDirection: "row", alignSelf: "center", padding: 4, borderRadius: radius.pill, gap: 4 },
  language: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill },
});
