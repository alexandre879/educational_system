import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { errorStatus } from "@/api/client";
import { addComment, fetchAnnouncement, fetchComments } from "@/api/endpoints";
import type { Comment } from "@/api/types";
import { useCurrentUser } from "@/auth/AuthProvider";
import { AppText } from "@/components/AppText";
import { Avatar } from "@/components/Avatar";
import { Card, SectionHeader } from "@/components/Card";
import { SubjectBadge } from "@/components/Subject";
import { Icon } from "@/components/Icon";
import { actionErrorMessage, EmptyState, ErrorState, LoadingState } from "@/components/States";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/i18n";
import { formatRelative, formatTimestamp } from "@/lib/dates";
import { localize } from "@/lib/localize";
import { radius, spacing, useTheme } from "@/theme";

export default function AnnouncementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const announcementId = Number(id);
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState("");
  const me = useCurrentUser();

  const announcement = useQuery({
    queryKey: ["announcement", announcementId],
    queryFn: () => fetchAnnouncement(announcementId),
  });
  const comments = useQuery({
    queryKey: ["comments", announcementId],
    queryFn: () => fetchComments(announcementId),
    enabled: announcement.isSuccess,
  });

  const send = useMutation({
    mutationFn: (text: string) => addComment(announcementId, text),
    onSuccess: (comment) => {
      setDraft("");
      queryClient.setQueryData<Comment[]>(["comments", announcementId], (previous = []) => [...previous, comment]);
      // Comment counts on the list screens are now stale.
      void queryClient.invalidateQueries({ queryKey: ["announcements"] });
      void queryClient.invalidateQueries({ queryKey: ["announcement", announcementId] });
    },
    onError: (sendError) => toast(actionErrorMessage(sendError, t, t("announcements.commentFailed")), "error"),
  });

  const submit = () => {
    const text = draft.trim();
    if (text && !send.isPending) send.mutate(text);
  };

  if (announcement.isPending) return <LoadingState variant="spinner" />;
  if (announcement.error) {
    return errorStatus(announcement.error) === 404 ? (
      <EmptyState icon="announcements" title={t("announcements.notFound")} />
    ) : (
      <ErrorState error={announcement.error} onRetry={announcement.refetch} />
    );
  }

  const data = announcement.data;
  const grade = `${data.grade.name} ${localize(data.grade.category_name, language)}`.trim();

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={styles.post}>
          <View style={styles.badges}>
            {data.subject ? <SubjectBadge subjectId={data.subject.id} label={localize(data.subject.name, language)} /> : null}
            <View style={[styles.gradePill, { backgroundColor: colors.surfaceMuted }]}>
              <AppText variant="caption" tone="secondary" style={styles.bold}>
                {`${t("common.grade")} ${grade}`}
              </AppText>
            </View>
          </View>
          <AppText variant="title">{data.title}</AppText>
          <View style={styles.author}>
            <Avatar name={data.created_by.name || data.created_by.email} size={36} />
            <View>
              <AppText variant="bodyStrong">{data.created_by.name || data.created_by.email}</AppText>
              <AppText variant="caption" tone="muted">
                {formatTimestamp(data.created_at, t)}
              </AppText>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <AppText selectable style={styles.body}>
            {data.content}
          </AppText>
        </Card>

        <SectionHeader title={`${t("announcements.comments")} · ${(comments.data ?? []).length}`} />
        {comments.isPending ? (
          <ActivityIndicator color={colors.primary} />
        ) : (comments.data ?? []).length === 0 ? (
          <View style={[styles.noComments, { borderColor: colors.border }]}>
            <Icon name="comment" size={22} color={colors.textMuted} />
            <AppText tone="secondary" center>
              {t("announcements.noComments")}
            </AppText>
          </View>
        ) : (
          (comments.data ?? []).map((comment) => {
            const mine = comment.user === me.email;
            return (
              <View key={comment.id} style={[styles.commentRow, mine && styles.commentRowMine]}>
                {!mine ? <Avatar name={comment.user} size={32} /> : null}
                <View
                  style={[
                    styles.bubble,
                    mine
                      ? [styles.bubbleMine, { backgroundColor: colors.primary }]
                      : [styles.bubbleTheirs, { backgroundColor: colors.surface, borderColor: colors.border }],
                  ]}
                >
                  {!mine ? (
                    <AppText variant="caption" tone="primary" numberOfLines={1} style={styles.bold}>
                      {comment.user}
                    </AppText>
                  ) : null}
                  <AppText selectable style={mine ? { color: colors.onPrimary } : undefined}>
                    {comment.comment}
                  </AppText>
                  <AppText
                    variant="caption"
                    style={[styles.commentTime, { color: mine ? "rgba(255, 255, 255, 0.75)" : colors.textMuted }]}
                  >
                    {formatRelative(comment.created_at, t)}
                  </AppText>
                </View>
              </View>
            );
          })
        )}
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
          placeholder={t("announcements.commentPlaceholder")}
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={5000}
          style={[styles.input, { color: colors.text, backgroundColor: colors.surfaceMuted }]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.send")}
          onPress={submit}
          disabled={!draft.trim() || send.isPending}
          hitSlop={8}
          style={[styles.sendButton, { backgroundColor: draft.trim() ? colors.primary : colors.surfaceMuted }]}
        >
          {send.isPending ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Icon name="send" size={20} color={draft.trim() ? colors.onPrimary : colors.textMuted} />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  bold: { fontWeight: "700" },
  post: { gap: spacing.md, padding: spacing.xl },
  gradePill: { paddingHorizontal: spacing.sm + 2, paddingVertical: 4, borderRadius: radius.pill },
  author: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  divider: { height: StyleSheet.hairlineWidth },
  body: { fontSize: 17, lineHeight: 26 },
  noComments: {
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  commentRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
  commentRowMine: { justifyContent: "flex-end" },
  bubble: { maxWidth: "80%", paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.lg, gap: 2 },
  bubbleMine: { borderBottomRightRadius: 6 },
  bubbleTheirs: { borderBottomLeftRadius: 6, borderWidth: StyleSheet.hairlineWidth },
  commentTime: { alignSelf: "flex-end", fontSize: 11 },
  sendButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
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
});
