import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { askAssistant } from "@/api/endpoints";
import type { ChatTurn } from "@/api/types";
import { AppText } from "@/components/AppText";
import { Icon } from "@/components/Icon";
import { useI18n } from "@/i18n";
import { radius, spacing, useTheme } from "@/theme";

interface ChatMessage extends ChatTurn {
  id: string;
  /** Local fallback shown when a request failed; never sent back as context. */
  isError?: boolean;
}

const STORAGE_KEY = "assistant.history.v1";
// How many previous messages go along so the assistant can follow the conversation.
const CONTEXT_MESSAGES = 10;

const newId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export default function AssistantScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const headerHeight = useHeaderHeight();
  // On iOS the header is transparent and this view starts at the top of the screen.
  const keyboardOffset = Platform.OS === "ios" ? 0 : headerHeight;
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [restored, setRestored] = useState(false);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) setMessages(parsed as ChatMessage[]);
      })
      .catch(() => undefined)
      .finally(() => setRestored(true));
  }, []);

  useEffect(() => {
    if (restored) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(messages)).catch(() => undefined);
  }, [messages, restored]);

  const send = async (preset?: string) => {
    const text = (preset ?? draft).trim();
    if (!text || thinking) return;

    const history = messages
      .filter((m) => !m.isError)
      .slice(-CONTEXT_MESSAGES)
      .map(({ role, content }) => ({ role, content }));

    setDraft("");
    setMessages((previous) => [...previous, { id: newId(), role: "user", content: text }]);
    setThinking(true);

    try {
      const reply = await askAssistant(text, history);
      setMessages((previous) => [...previous, { id: newId(), role: "assistant", content: reply || "…" }]);
    } catch {
      setMessages((previous) => [
        ...previous,
        { id: newId(), role: "assistant", content: t("assistant.error"), isError: true },
      ]);
    } finally {
      setThinking(false);
    }
  };

  const suggestions = [t("assistant.suggestion1"), t("assistant.suggestion2"), t("assistant.suggestion3")];
  const canSend = !!draft.trim() && !thinking;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () =>
            messages.length ? (
              <Pressable accessibilityRole="button" onPress={() => setMessages([])} hitSlop={12}>
                <AppText tone="primary">{t("assistant.newChat")}</AppText>
              </Pressable>
            ) : null,
        }}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={keyboardOffset}
      >
        <ScrollView
          ref={scrollRef}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[styles.messages, !messages.length && styles.welcomeContainer]}
          onContentSizeChange={() => {
            if (messages.length) scrollRef.current?.scrollToEnd({ animated: true });
          }}
          keyboardShouldPersistTaps="handled"
        >
          {!messages.length && restored ? (
            <View style={styles.welcome}>
              <AssistantMark size={72} />
              <AppText variant="title" center>
                {t("assistant.title")}
              </AppText>
              <AppText tone="secondary" center style={styles.welcomeText}>
                {t("assistant.intro")}
              </AppText>
              <View style={styles.suggestions}>
                {suggestions.map((suggestion) => (
                  <Pressable
                    key={suggestion}
                    accessibilityRole="button"
                    onPress={() => send(suggestion)}
                    style={({ pressed }) => [
                      styles.suggestion,
                      { backgroundColor: colors.surface, borderColor: colors.border, boxShadow: colors.shadow },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Icon name="assistant" size={16} color={colors.primary} />
                    <AppText style={styles.flex}>{suggestion}</AppText>
                    <Icon name="chevronRight" size={14} color={colors.textMuted} />
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {messages.map((message) =>
            message.role === "user" ? (
              <View key={message.id} style={[styles.bubble, styles.mine]}>
                <LinearGradient
                  colors={colors.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <AppText selectable tone="onPrimary">
                  {message.content}
                </AppText>
              </View>
            ) : (
              <View key={message.id} style={styles.theirsRow}>
                <AssistantMark size={28} />
                <View
                  style={[
                    styles.bubble,
                    styles.theirs,
                    {
                      backgroundColor: message.isError ? colors.dangerMuted : colors.surface,
                      boxShadow: message.isError ? undefined : colors.shadow,
                    },
                  ]}
                >
                  <AppText selectable tone={message.isError ? "danger" : "text"}>
                    {message.content}
                  </AppText>
                </View>
              </View>
            ),
          )}
          {thinking ? (
            <View style={styles.theirsRow}>
              <AssistantMark size={28} />
              <View style={[styles.bubble, styles.theirs, styles.thinking, { backgroundColor: colors.surface }]}>
                <ActivityIndicator size="small" color={colors.primary} />
                <AppText tone="secondary">{t("assistant.thinking")}</AppText>
              </View>
            </View>
          ) : null}
          <AppText variant="caption" tone="muted" center style={styles.hint}>
            {t("assistant.hint")}
          </AppText>
        </ScrollView>

        <View
          style={[
            styles.composer,
            { backgroundColor: colors.surface, borderColor: colors.border, paddingBottom: insets.bottom + spacing.sm },
          ]}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={t("assistant.placeholder")}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={4000}
            style={[styles.input, { color: colors.text, backgroundColor: colors.surfaceMuted }]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.send")}
            onPress={() => send()}
            disabled={!canSend}
            hitSlop={8}
            style={[styles.sendButton, { backgroundColor: canSend ? colors.primary : colors.surfaceMuted }]}
          >
            <Icon name="send" size={20} color={canSend ? colors.onPrimary : colors.textMuted} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

/** Round gradient badge with a sparkle, used as the assistant's avatar. */
function AssistantMark({ size }: { size: number }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.mark, { width: size, height: size, borderRadius: size / 2 }]}>
      <LinearGradient
        colors={colors.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Icon name="assistant" size={size * 0.5} color="#FFFFFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  messages: { padding: spacing.lg, gap: spacing.md },
  welcomeContainer: { flexGrow: 1, justifyContent: "center" },
  welcome: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl },
  welcomeText: { maxWidth: 320, marginBottom: spacing.md },
  suggestions: { alignSelf: "stretch", gap: spacing.sm },
  suggestion: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  mark: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  bubble: {
    maxWidth: "82%",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  mine: { alignSelf: "flex-end", borderBottomRightRadius: radius.sm },
  theirsRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
  theirs: { flexShrink: 1, borderBottomLeftRadius: radius.sm },
  thinking: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  hint: { marginTop: spacing.md },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 16,
  },
  sendButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
