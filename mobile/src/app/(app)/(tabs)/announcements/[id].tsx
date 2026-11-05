import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { errorStatus } from "@/api/client";
import { addComment, deleteComment, editComment, fetchAnnouncement, fetchComments, reactToComment } from "@/api/endpoints";
import type { Comment } from "@/api/types";
import { useCurrentUser } from "@/auth/AuthProvider";
import { AppText } from "@/components/AppText";
import { Avatar } from "@/components/Avatar";
import { Card, SectionHeader } from "@/components/Card";
import { Glass, GlassBackdrop, useLiquidGlass } from "@/components/Glass";
import { Icon } from "@/components/Icon";
import { SubjectBadge } from "@/components/Subject";
import { actionErrorMessage, EmptyState, ErrorState, LoadingState } from "@/components/States";
import { useToast } from "@/components/Toast";
import { ChatBubble } from "@/features/announcements/ChatBubble";
import { MessageMenu } from "@/features/announcements/MessageMenu";
import { buildTimeline, replaceComment, snippet, withReaction } from "@/features/announcements/chat";
import { useI18n } from "@/i18n";
import { addDays, formatDay, formatTimestamp, toISODate } from "@/lib/dates";
import { confirmAction } from "@/lib/dialogs";
import { localize } from "@/lib/localize";
import { radius, spacing, useTheme } from "@/theme";

// An open discussion refreshes itself; pushes only reach the people involved.
const POLL_MS = 10_000;
// How close to the bottom (pt) still counts as "reading the latest messages".
const BOTTOM_SLACK = 80;
// Further up than this, a button offers to jump back down.
const JUMP_THRESHOLD = 320;
const HIGHLIGHT_MS = 1400;

interface SendInput {
  text: string;
  editingId?: number;
  replyToId?: number;
}

export default function AnnouncementScreen() {
  // `comment` comes from a notification: the message to scroll to.
  const { id, comment: focusParam } = useLocalSearchParams<{ id: string; comment?: string }>();
  const announcementId = Number(id);
  const commentsKey = useMemo(() => ["comments", announcementId], [announcementId]);
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const glass = useLiquidGlass();
  const toast = useToast();
  const queryClient = useQueryClient();
  const headerHeight = useHeaderHeight();
  // On iOS the header is transparent and this view starts at the top of the screen.
  const keyboardOffset = Platform.OS === "ios" ? 0 : headerHeight;
  const insets = useSafeAreaInsets();
  const me = useCurrentUser();

  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [editing, setEditing] = useState<Comment | null>(null);
  const [menuFor, setMenuFor] = useState<Comment | null>(null);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [showJump, setShowJump] = useState(false);
  const [unseen, setUnseen] = useState(0);

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  // What was in the composer before editing a message, put back afterwards.
  const savedDraft = useRef("");
  // Where each message sits inside the list, for jumping to it.
  const rowY = useRef(new Map<number, number>());
  const listY = useRef(0);
  const viewportHeight = useRef(0);
  const nearBottom = useRef(false);
  const followNext = useRef(false);
  const pendingFocus = useRef(focusParam ? Number(focusParam) : null);
  const knownIds = useRef<Set<number> | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Read by the (memoized) reply handler without re-rendering every message.
  const editingRef = useRef<Comment | null>(null);

  useEffect(() => {
    editingRef.current = editing;
  }, [editing]);

  useEffect(() => () => clearTimeout(highlightTimer.current), []);

  const announcement = useQuery({
    queryKey: ["announcement", announcementId],
    queryFn: () => fetchAnnouncement(announcementId),
  });
  const comments = useQuery({
    queryKey: commentsKey,
    queryFn: async () => {
      const data = await fetchComments(announcementId);
      // Count what others wrote while the reader is scrolled up.
      const known = knownIds.current;
      if (known && !nearBottom.current) {
        const fresh = data.filter((c) => !known.has(c.id) && c.author.id !== me.id).length;
        if (fresh) setUnseen((count) => count + fresh);
      }
      knownIds.current = new Set(data.map((c) => c.id));
      return data;
    },
    enabled: announcement.isSuccess,
    refetchInterval: POLL_MS,
  });

  const timeline = useMemo(() => buildTimeline(comments.data ?? []), [comments.data]);
  const visibleCount = (comments.data ?? []).filter((c) => !c.deleted).length;

  const updateComment = useCallback(
    (comment: Comment) => queryClient.setQueryData<Comment[]>(commentsKey, (previous) => replaceComment(previous, comment)),
    [queryClient, commentsKey]
  );

  const refreshCounts = () => {
    // Comment counts on the list screens are now stale.
    void queryClient.invalidateQueries({ queryKey: ["announcements"] });
    void queryClient.invalidateQueries({ queryKey: ["announcement", announcementId] });
  };

  const stopEditing = useCallback(() => {
    setEditing(null);
    setDraft(savedDraft.current);
    savedDraft.current = "";
  }, []);

  const send = useMutation({
    mutationFn: ({ text, editingId, replyToId }: SendInput) =>
      editingId ? editComment(editingId, text) : addComment(announcementId, text, replyToId),
    onSuccess: (comment, { editingId }) => {
      if (editingId) {
        updateComment(comment);
        stopEditing();
        return;
      }
      knownIds.current?.add(comment.id);
      followNext.current = true;
      queryClient.setQueryData<Comment[]>(commentsKey, (previous = []) => [...previous, comment]);
      setDraft("");
      setReplyTo(null);
      refreshCounts();
    },
    onError: (error, { editingId, replyToId }) => {
      if (editingId) {
        toast(actionErrorMessage(error, t, t("announcements.editFailed")), "error");
      } else if (replyToId && errorStatus(error) === 400) {
        toast(t("announcements.replyUnavailable"), "error");
        setReplyTo(null);
      } else {
        toast(actionErrorMessage(error, t, t("announcements.commentFailed")), "error");
      }
    },
  });

  const submit = () => {
    const text = draft.trim();
    if (!text || send.isPending) return;
    if (editing && text === editing.comment) {
      stopEditing();
      return;
    }
    send.mutate({ text, editingId: editing?.id, replyToId: replyTo?.id });
  };

  const jumpTo = useCallback((commentId: number) => {
    const y = rowY.current.get(commentId);
    if (y === undefined) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, listY.current + y - viewportHeight.current / 3), animated: true });
    setHighlightId(commentId);
    clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightId(null), HIGHLIGHT_MS);
  }, []);

  const onRowLayout = useCallback(
    (commentId: number, event: LayoutChangeEvent) => {
      rowY.current.set(commentId, event.nativeEvent.layout.y);
      if (pendingFocus.current === commentId) {
        pendingFocus.current = null;
        // Let the rest of the list lay out first.
        setTimeout(() => jumpTo(commentId), 300);
      }
    },
    [jumpTo]
  );

  const startReply = useCallback(
    (comment: Comment) => {
      if (editingRef.current) stopEditing();
      setReplyTo(comment);
      inputRef.current?.focus();
    },
    [stopEditing]
  );

  const startEdit = (comment: Comment) => {
    if (!editing) savedDraft.current = draft;
    setReplyTo(null);
    setEditing(comment);
    setDraft(comment.comment);
    inputRef.current?.focus();
  };

  const cancelContext = () => {
    if (editing) stopEditing();
    setReplyTo(null);
  };

  const react = useCallback(
    async (comment: Comment, emoji: string) => {
      updateComment(withReaction(comment, emoji));
      try {
        updateComment(await reactToComment(comment.id, emoji));
      } catch (error) {
        updateComment(comment);
        toast(actionErrorMessage(error, t, t("announcements.reactFailed")), "error");
      }
    },
    [updateComment, toast, t]
  );

  const remove = (comment: Comment) =>
    confirmAction({
      title: t("announcements.deleteTitle"),
      message: comment.author.id === me.id ? t("announcements.deleteMessage") : t("announcements.deleteOthersMessage"),
      confirmText: t("announcements.delete"),
      cancelText: t("common.cancel"),
      destructive: true,
      onConfirm: async () => {
        try {
          updateComment(await deleteComment(comment.id));
          if (replyTo?.id === comment.id) setReplyTo(null);
          if (editing?.id === comment.id) stopEditing();
          refreshCounts();
        } catch (error) {
          toast(actionErrorMessage(error, t, t("announcements.deleteFailed")), "error");
        }
      },
    });

  const copy = async (comment: Comment) => {
    await Clipboard.setStringAsync(comment.comment);
    toast(t("announcements.copied"), "success");
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distance = contentSize.height - contentOffset.y - layoutMeasurement.height;
    nearBottom.current = distance < BOTTOM_SLACK;
    setShowJump(distance > JUMP_THRESHOLD);
    if (nearBottom.current) setUnseen(0);
  };

  const scrollToLatest = () => {
    scrollRef.current?.scrollToEnd({ animated: true });
    setUnseen(0);
  };

  const dayLabel = (date: Date) => {
    const iso = toISODate(date);
    if (iso === toISODate(new Date())) return t("common.today");
    if (iso === toISODate(addDays(new Date(), -1))) return t("time.yesterday");
    const day = formatDay(date, t);
    return date.getFullYear() === new Date().getFullYear() ? day : `${day} ${date.getFullYear()}`;
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
  const context = editing ?? replyTo;
  const canSend = draft.trim().length > 0 && !send.isPending;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={keyboardOffset}
    >
      <View style={styles.flex}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onScroll={onScroll}
          scrollEventThrottle={32}
          onLayout={(event) => {
            viewportHeight.current = event.nativeEvent.layout.height;
          }}
          onContentSizeChange={() => {
            // Follow new messages while reading the latest ones (or right after sending).
            if (followNext.current || nearBottom.current) scrollRef.current?.scrollToEnd({ animated: true });
            followNext.current = false;
          }}
        >
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

          <SectionHeader title={`${t("announcements.comments")} · ${visibleCount}`} />
          {comments.isPending ? (
            <ActivityIndicator color={colors.primary} />
          ) : timeline.length === 0 ? (
            <View style={[styles.noComments, { borderColor: colors.border }]}>
              <Icon name="comment" size={22} color={colors.textMuted} />
              <AppText tone="secondary" center>
                {t("announcements.noComments")}
              </AppText>
            </View>
          ) : (
            <View
              onLayout={(event) => {
                listY.current = event.nativeEvent.layout.y;
              }}
            >
              {timeline.map((item) =>
                item.kind === "day" ? (
                  <View key={`day-${item.key}`} style={styles.day}>
                    <Glass radius={radius.pill} style={styles.dayPill} fallbackStyle={{ backgroundColor: colors.surface }}>
                      <AppText variant="caption" tone="secondary" style={styles.bold}>
                        {dayLabel(item.date)}
                      </AppText>
                    </Glass>
                  </View>
                ) : (
                  <ChatBubble
                    key={item.key}
                    comment={item.comment}
                    mine={item.comment.author.id === me.id}
                    startsGroup={item.startsGroup}
                    endsGroup={item.endsGroup}
                    highlighted={highlightId === item.comment.id}
                    onReply={startReply}
                    onOpenMenu={setMenuFor}
                    onReact={react}
                    onJump={jumpTo}
                    onLayout={onRowLayout}
                  />
                )
              )}
            </View>
          )}
        </ScrollView>

        {showJump || unseen > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("announcements.jumpToLatest")}
            onPress={scrollToLatest}
            style={styles.jump}
          >
            <Glass
              radius={22}
              style={styles.jumpButton}
              fallbackStyle={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth }}
            >
              <Icon name="arrowDown" size={18} color={colors.text} />
            </Glass>
            {unseen > 0 ? (
              <View style={[styles.unseen, { backgroundColor: colors.primary }]}>
                <AppText style={[styles.unseenText, { color: colors.onPrimary }]}>{unseen}</AppText>
              </View>
            ) : null}
          </Pressable>
        ) : null}
      </View>

      <View
        style={[
          styles.composer,
          {
            backgroundColor: glass ? "transparent" : colors.surface,
            borderColor: colors.border,
            paddingBottom: insets.bottom + spacing.sm,
          },
        ]}
      >
        <GlassBackdrop radius={0} />
        {context ? (
          <View style={[styles.context, { backgroundColor: colors.primaryMuted, borderLeftColor: colors.primary }]}>
            <Icon name={editing ? "edit" : "reply"} size={16} color={colors.primary} />
            <Pressable style={styles.contextBody} onPress={() => jumpTo(context.id)}>
              <AppText variant="caption" tone="primary" numberOfLines={1} style={styles.bold}>
                {editing ? t("announcements.editing") : t("announcements.replyingTo", { name: context.author.name })}
              </AppText>
              <AppText variant="caption" tone="secondary" numberOfLines={1}>
                {snippet(context.comment)}
              </AppText>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={t("common.cancel")} onPress={cancelContext} hitSlop={10}>
              <Icon name="close" size={16} color={colors.textSecondary} />
            </Pressable>
          </View>
        ) : null}

        <View style={styles.composerRow}>
          <TextInput
            ref={inputRef}
            value={draft}
            onChangeText={setDraft}
            placeholder={replyTo ? t("announcements.replyPlaceholder") : t("announcements.commentPlaceholder")}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={5000}
            style={[styles.input, { color: colors.text, backgroundColor: colors.surfaceMuted }]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={editing ? t("common.save") : t("common.send")}
            onPress={submit}
            disabled={!canSend}
            hitSlop={8}
            style={[styles.sendButton, { backgroundColor: draft.trim() ? colors.primary : colors.surfaceMuted }]}
          >
            {send.isPending ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Icon name={editing ? "checkmark" : "send"} size={20} color={draft.trim() ? colors.onPrimary : colors.textMuted} />
            )}
          </Pressable>
        </View>
      </View>

      <MessageMenu
        comment={menuFor}
        onClose={() => setMenuFor(null)}
        onReact={react}
        onReply={startReply}
        onCopy={(comment) => void copy(comment)}
        onEdit={startEdit}
        onDelete={remove}
      />
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
  day: { alignItems: "center", marginTop: spacing.lg, marginBottom: spacing.xs },
  dayPill: { paddingHorizontal: spacing.md, paddingVertical: 4, overflow: "hidden" },
  jump: { position: "absolute", right: spacing.lg, bottom: spacing.md },
  jumpButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  unseen: {
    position: "absolute",
    top: -6,
    right: -4,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  unseenText: { fontSize: 11, lineHeight: 14, fontWeight: "800" },
  composer: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  context: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 6,
    paddingLeft: spacing.sm + 2,
    paddingRight: spacing.sm,
    borderLeftWidth: 3,
    borderRadius: radius.sm,
  },
  contextBody: { flex: 1, gap: 1 },
  composerRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
  sendButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
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
