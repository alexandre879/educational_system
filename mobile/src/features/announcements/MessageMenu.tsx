import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { Animated, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { REACTIONS, type Comment } from "@/api/types";
import { AppText } from "@/components/AppText";
import { ListGroup, ListRow } from "@/components/Controls";
import { Glass } from "@/components/Glass";
import { useI18n } from "@/i18n";
import { radius, spacing, useTheme } from "@/theme";

interface MessageMenuProps {
  /** The message the menu is for; null hides it. */
  comment: Comment | null;
  onClose: () => void;
  onReact: (comment: Comment, emoji: string) => void;
  onReply: (comment: Comment) => void;
  onCopy: (comment: Comment) => void;
  onEdit: (comment: Comment) => void;
  onDelete: (comment: Comment) => void;
}

/** What a long press on a message opens: quick reactions above the message's actions. */
export function MessageMenu({ comment, onClose, onReact, onReply, onCopy, onEdit, onDelete }: MessageMenuProps) {
  const { t } = useI18n();
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  // Keeps showing the last message while the menu fades out.
  const [shown, setShown] = useState<Comment | null>(comment);
  if (comment && comment !== shown) setShown(comment);

  const [rise] = useState(() => new Animated.Value(0));
  const [pops] = useState(() => REACTIONS.map(() => new Animated.Value(0)));

  useEffect(() => {
    if (!comment) return;
    rise.setValue(0);
    pops.forEach((value) => value.setValue(0));
    Animated.parallel([
      Animated.spring(rise, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 220 }),
      Animated.stagger(
        35,
        pops.map((value) => Animated.spring(value, { toValue: 1, useNativeDriver: true, damping: 11, stiffness: 260 }))
      ),
    ]).start();
  }, [comment, rise, pops]);

  if (!shown) return null;

  // Each action closes the menu first.
  const run = (action: (comment: Comment) => void) => () => {
    onClose();
    action(shown);
  };

  return (
    <Modal visible={comment !== null} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        style={[StyleSheet.absoluteFill, { backgroundColor: scheme === "dark" ? "rgba(0, 0, 0, 0.55)" : "rgba(15, 23, 42, 0.3)" }]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t("common.close")}
      />

      <Animated.View
        style={[
          styles.sheet,
          {
            paddingBottom: insets.bottom + spacing.md,
            opacity: rise,
            transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
          },
        ]}
      >
        <Glass radius={radius.pill} style={styles.reactions} fallbackStyle={{ backgroundColor: colors.surface }}>
          {REACTIONS.map((emoji, index) => {
            const picked = shown.reactions.some((r) => r.mine && r.emoji === emoji);
            return (
              <Animated.View key={emoji} style={{ transform: [{ scale: pops[index] }] }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: picked }}
                  accessibilityLabel={emoji}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => undefined);
                    run((c) => onReact(c, emoji))();
                  }}
                  style={({ pressed }) => [
                    styles.emojiButton,
                    picked && { backgroundColor: colors.primaryMuted },
                    pressed && styles.emojiPressed,
                  ]}
                >
                  <Text style={styles.emoji}>{emoji}</Text>
                </Pressable>
              </Animated.View>
            );
          })}
        </Glass>

        <Glass radius={radius.lg} style={styles.preview} fallbackStyle={{ backgroundColor: colors.surface }}>
          <AppText variant="caption" tone="primary" numberOfLines={1} style={styles.bold}>
            {shown.author.name}
          </AppText>
          <AppText numberOfLines={4}>{shown.comment}</AppText>
        </Glass>

        <ListGroup>
          <ListRow icon="reply" title={t("announcements.reply")} onPress={run(onReply)} right={<View />} />
          <ListRow icon="copy" title={t("announcements.copy")} onPress={run(onCopy)} right={<View />} />
          {shown.can_edit ? (
            <ListRow icon="edit" title={t("announcements.edit")} onPress={run(onEdit)} right={<View />} />
          ) : null}
          {shown.can_delete ? (
            <ListRow icon="trash" title={t("announcements.delete")} onPress={run(onDelete)} destructive />
          ) : null}
        </ListGroup>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.lg, gap: spacing.md },
  reactions: {
    flexDirection: "row",
    alignSelf: "center",
    gap: 2,
    padding: spacing.xs,
    overflow: "hidden",
  },
  emojiButton: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  emojiPressed: { transform: [{ scale: 1.2 }] },
  emoji: { fontSize: 28, lineHeight: 34 },
  preview: { padding: spacing.lg, gap: 4, overflow: "hidden" },
  bold: { fontWeight: "700" },
});
