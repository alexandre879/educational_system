import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Animated, PanResponder, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";

import type { Comment } from "@/api/types";
import { AppText } from "@/components/AppText";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { useI18n } from "@/i18n";
import { formatTime } from "@/lib/dates";
import { radius, spacing, useTheme } from "@/theme";

import { isJumboEmoji, splitLinks } from "./chat";

// Swiping a message this far to the right replies to it.
const SWIPE_TRIGGER = 56;
const SWIPE_MAX = 84;
const DOUBLE_TAP_MS = 280;
const QUICK_REACTION = "❤️";

interface ChatBubbleProps {
  comment: Comment;
  mine: boolean;
  startsGroup: boolean;
  endsGroup: boolean;
  highlighted: boolean;
  onReply: (comment: Comment) => void;
  onOpenMenu: (comment: Comment) => void;
  onReact: (comment: Comment, emoji: string) => void;
  onJump: (commentId: number) => void;
  onLayout: (commentId: number, event: LayoutChangeEvent) => void;
}

/** One message of an announcement's discussion. */
export const ChatBubble = memo(function ChatBubble({
  comment,
  mine,
  startsGroup,
  endsGroup,
  highlighted,
  onReply,
  onOpenMenu,
  onReact,
  onJump,
  onLayout,
}: ChatBubbleProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { author, reply_to: reply, deleted } = comment;
  const jumbo = !deleted && !reply && isJumboEmoji(comment.comment);
  const staff = author.role === "teacher" || author.role === "admin";

  const [swipe] = useState(() => new Animated.Value(0));
  const [flash] = useState(() => new Animated.Value(0));
  const [burst] = useState(() => new Animated.Value(0));
  const lastTap = useRef(0);

  // The pan responder is created once, so it reads the latest props through a ref.
  const latest = useRef({ comment, onReply });
  useEffect(() => {
    latest.current = { comment, onReply };
  });

  const pan = useMemo(() => {
    let armed = false;
    const settle = () => Animated.spring(swipe, { toValue: 0, useNativeDriver: true, bounciness: 8 }).start();
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        !latest.current.comment.deleted && g.dx > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
      onPanResponderGrant: () => {
        armed = false;
      },
      onPanResponderMove: (_, g) => {
        const dx = Math.max(0, g.dx);
        // Follows the finger up to the trigger point, then resists.
        swipe.setValue(dx < SWIPE_TRIGGER ? dx : Math.min(SWIPE_MAX, SWIPE_TRIGGER + (dx - SWIPE_TRIGGER) * 0.35));
        if (dx >= SWIPE_TRIGGER !== armed) {
          armed = !armed;
          if (armed) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        }
      },
      onPanResponderRelease: () => {
        if (armed) latest.current.onReply(latest.current.comment);
        armed = false;
        settle();
      },
      onPanResponderTerminate: () => {
        armed = false;
        settle();
      },
      onPanResponderTerminationRequest: () => false,
    });
  }, [swipe]);

  useEffect(() => {
    if (!highlighted) return;
    Animated.sequence([
      Animated.timing(flash, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(650),
      Animated.timing(flash, { toValue: 0, duration: 550, useNativeDriver: true }),
    ]).start();
  }, [highlighted, flash]);

  const onTap = () => {
    const now = Date.now();
    if (now - lastTap.current > DOUBLE_TAP_MS) {
      lastTap.current = now;
      return;
    }
    lastTap.current = 0;
    Haptics.selectionAsync().catch(() => undefined);
    const alreadyLoved = comment.reactions.some((r) => r.mine && r.emoji === QUICK_REACTION);
    if (!alreadyLoved) {
      burst.setValue(0);
      Animated.timing(burst, { toValue: 1, duration: 700, useNativeDriver: true }).start();
    }
    onReact(comment, QUICK_REACTION);
  };

  const onLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    onOpenMenu(comment);
  };

  const textColor = mine && !jumbo && !deleted ? colors.onPrimary : colors.text;
  const metaColor = mine && !jumbo && !deleted ? "rgba(255, 255, 255, 0.75)" : colors.textMuted;
  const bubbleStyle = deleted
    ? [styles.bubble, styles.deleted, { borderColor: colors.textMuted }]
    : jumbo
      ? [styles.bubble, styles.jumbo]
      : mine
        ? [styles.bubble, startsGroup ? styles.mineFirst : styles.mine, { backgroundColor: colors.primary }]
        : [
            styles.bubble,
            startsGroup ? styles.theirsFirst : styles.theirs,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ];

  return (
    <View
      style={[styles.row, startsGroup && styles.rowGroupStart]}
      onLayout={(event) => onLayout(comment.id, event)}
      {...pan.panHandlers}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.replyHint,
          {
            backgroundColor: colors.primaryMuted,
            opacity: swipe.interpolate({ inputRange: [12, SWIPE_TRIGGER], outputRange: [0, 1], extrapolate: "clamp" }),
            transform: [
              { scale: swipe.interpolate({ inputRange: [0, SWIPE_TRIGGER], outputRange: [0.5, 1], extrapolate: "clamp" }) },
            ],
          },
        ]}
      >
        <Icon name="reply" size={16} color={colors.primary} />
      </Animated.View>

      <Animated.View style={[styles.line, mine && styles.lineMine, { transform: [{ translateX: swipe }] }]}>
        {!mine ? (
          <View style={styles.avatarSlot}>{endsGroup ? <Avatar uri={author.photo} name={author.name} size={30} /> : null}</View>
        ) : null}

        <View style={[styles.stack, mine && styles.stackMine]}>
          <Pressable
            onPress={deleted ? undefined : onTap}
            onLongPress={deleted ? undefined : onLongPress}
            delayLongPress={280}
            accessibilityRole="text"
            accessibilityLabel={`${author.name}: ${deleted ? t("announcements.deletedMessage") : comment.comment}`}
            accessibilityActions={
              deleted
                ? undefined
                : [
                    { name: "reply", label: t("announcements.reply") },
                    { name: "menu", label: t("announcements.messageActions") },
                  ]
            }
            onAccessibilityAction={(event) => {
              if (event.nativeEvent.actionName === "reply") onReply(comment);
              else if (event.nativeEvent.actionName === "menu") onOpenMenu(comment);
            }}
          >
            <Animated.View
              style={[
                bubbleStyle,
                { transform: [{ scale: flash.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] }) }] },
              ]}
            >
              <Animated.View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  styles.flash,
                  {
                    backgroundColor: mine ? "#FFFFFF" : colors.primary,
                    opacity: flash.interpolate({ inputRange: [0, 1], outputRange: [0, mine ? 0.22 : 0.18] }),
                  },
                ]}
              />

              {!mine && startsGroup && !jumbo ? (
                <View style={styles.sender}>
                  <AppText variant="caption" tone="primary" numberOfLines={1} style={styles.senderName}>
                    {author.name}
                  </AppText>
                  {staff ? (
                    <View style={[styles.roleTag, { backgroundColor: colors.primaryMuted }]}>
                      <AppText style={[styles.roleText, { color: colors.primary }]}>{t(`roles.${author.role}` as "roles.teacher")}</AppText>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {reply ? (
                <Pressable
                  onPress={() => onJump(reply.id)}
                  style={[
                    styles.quote,
                    mine
                      ? { borderLeftColor: "rgba(255, 255, 255, 0.85)", backgroundColor: "rgba(255, 255, 255, 0.16)" }
                      : { borderLeftColor: colors.primary, backgroundColor: colors.primaryMuted },
                  ]}
                >
                  <AppText variant="caption" numberOfLines={1} style={[styles.bold, { color: mine ? colors.onPrimary : colors.primary }]}>
                    {reply.author}
                  </AppText>
                  <AppText variant="caption" numberOfLines={2} style={{ color: textColor, opacity: 0.85 }}>
                    {reply.deleted ? t("announcements.deletedMessage") : reply.comment}
                  </AppText>
                </Pressable>
              ) : null}

              {deleted ? (
                <View style={styles.deletedRow}>
                  <Icon name="blocked" size={14} color={colors.textMuted} />
                  <AppText tone="muted" style={styles.italic}>
                    {t("announcements.deletedMessage")}
                  </AppText>
                </View>
              ) : (
                <AppText style={[jumbo ? styles.jumboText : styles.body, { color: textColor }]}>
                  {splitLinks(comment.comment).map((part, index) =>
                    index % 2 === 1 ? (
                      <Text
                        key={index}
                        style={styles.link}
                        accessibilityRole="link"
                        onPress={() => void WebBrowser.openBrowserAsync(part, { controlsColor: colors.primary })}
                      >
                        {part}
                      </Text>
                    ) : (
                      part
                    )
                  )}
                </AppText>
              )}

              <View style={styles.meta}>
                {comment.edited_at && !deleted ? (
                  <AppText style={[styles.metaText, { color: metaColor }]}>{t("announcements.edited")}</AppText>
                ) : null}
                <AppText style={[styles.metaText, { color: metaColor }]}>{formatTime(comment.created_at)}</AppText>
              </View>
            </Animated.View>
          </Pressable>

          <Animated.Text
            pointerEvents="none"
            style={[
              styles.burst,
              mine ? styles.burstMine : styles.burstTheirs,
              {
                opacity: burst.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] }),
                transform: [
                  { scale: burst.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.3, 1.3, 1.1] }) },
                  { translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [0, -24] }) },
                ],
              },
            ]}
          >
            {QUICK_REACTION}
          </Animated.Text>

          {comment.reactions.length > 0 ? (
            <View style={[styles.reactions, mine && styles.reactionsMine]}>
              {comment.reactions.map((reaction) => (
                <Pressable
                  key={reaction.emoji}
                  accessibilityRole="button"
                  accessibilityState={{ selected: reaction.mine }}
                  accessibilityLabel={`${reaction.emoji} ${reaction.count}`}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => undefined);
                    onReact(comment, reaction.emoji);
                  }}
                  hitSlop={4}
                  style={[
                    styles.reaction,
                    reaction.mine
                      ? { backgroundColor: colors.primaryMuted, borderColor: colors.primary }
                      : { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                  <AppText style={[styles.reactionCount, { color: reaction.mine ? colors.primary : colors.textSecondary }]}>
                    {reaction.count}
                  </AppText>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
});

const BUBBLE_RADIUS = 18;
const JOINED_RADIUS = 6;

const styles = StyleSheet.create({
  row: { marginTop: 3 },
  rowGroupStart: { marginTop: spacing.md },
  line: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
  lineMine: { justifyContent: "flex-end" },
  avatarSlot: { width: 30 },
  stack: { maxWidth: "80%", alignItems: "flex-start" },
  stackMine: { alignItems: "flex-end" },
  replyHint: {
    position: "absolute",
    left: 4,
    top: "50%",
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 2, overflow: "hidden" },
  theirs: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BUBBLE_RADIUS,
    borderTopLeftRadius: JOINED_RADIUS,
    borderBottomLeftRadius: JOINED_RADIUS,
  },
  theirsFirst: { borderWidth: StyleSheet.hairlineWidth, borderRadius: BUBBLE_RADIUS, borderBottomLeftRadius: JOINED_RADIUS },
  mine: { borderRadius: BUBBLE_RADIUS, borderTopRightRadius: JOINED_RADIUS, borderBottomRightRadius: JOINED_RADIUS },
  mineFirst: { borderRadius: BUBBLE_RADIUS, borderBottomRightRadius: JOINED_RADIUS },
  jumbo: { paddingHorizontal: spacing.xs, paddingVertical: 0 },
  // iOS only draws dashes when every corner has the same radius.
  deleted: { borderWidth: 1, borderStyle: "dashed", borderRadius: BUBBLE_RADIUS },
  flash: { borderRadius: BUBBLE_RADIUS },
  sender: { flexDirection: "row", alignItems: "center", gap: 6 },
  senderName: { fontWeight: "700", flexShrink: 1 },
  roleTag: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.pill },
  roleText: { fontSize: 10, lineHeight: 14, fontWeight: "800", letterSpacing: 0.4, textTransform: "uppercase" },
  quote: {
    borderLeftWidth: 3,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    marginTop: 2,
    marginBottom: 4,
    gap: 1,
  },
  bold: { fontWeight: "700" },
  italic: { fontStyle: "italic" },
  body: { fontSize: 16, lineHeight: 22 },
  jumboText: { fontSize: 44, lineHeight: 52 },
  link: { textDecorationLine: "underline" },
  deletedRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  meta: { flexDirection: "row", alignSelf: "flex-end", gap: 6 },
  metaText: { fontSize: 11, lineHeight: 14 },
  burst: { position: "absolute", top: "30%", fontSize: 44 },
  burstTheirs: { left: "40%" },
  burstMine: { right: "40%" },
  reactions: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: -6, paddingHorizontal: spacing.sm },
  reactionsMine: { justifyContent: "flex-end" },
  reaction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  reactionEmoji: { fontSize: 14, lineHeight: 18 },
  reactionCount: { fontSize: 12, lineHeight: 16, fontWeight: "700", fontVariant: ["tabular-nums"] },
});
