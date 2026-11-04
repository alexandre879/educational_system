import { toISODate } from "@/lib/dates";
import { REACTIONS, type Comment } from "../interface";

// Messages from one person this close together share a bubble group (one name, one avatar).
const GROUP_GAP_MS = 5 * 60_000;

/** Comments from the server merged with what's already shown (oldest first, no duplicates). */
export function mergeComments(current: Comment[] | null, incoming: Comment[]): Comment[] {
  const byId = new Map((current ?? []).map((c) => [c.id, c]));
  for (const comment of incoming) byId.set(comment.id, comment);
  return [...byId.values()].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime() || a.id - b.id
  );
}

/** Swaps in an updated comment, refreshing the quotes of replies to it too. */
export function replaceComment(current: Comment[] | null, comment: Comment): Comment[] | null {
  if (!current) return current;
  return current.map((c) => {
    if (c.id === comment.id) return comment;
    if (c.reply_to?.id !== comment.id) return c;
    return {
      ...c,
      reply_to: { ...c.reply_to, comment: comment.comment.slice(0, 200), deleted: comment.deleted },
    };
  });
}

/** The comment as it will look once the server applies `emoji` (one reaction per person). */
export function withReaction(comment: Comment, emoji: string): Comment {
  const previous = comment.reactions.find((r) => r.mine)?.emoji;
  const counts = new Map(comment.reactions.map((r) => [r.emoji, r.count]));
  if (previous) counts.set(previous, (counts.get(previous) ?? 1) - 1);
  if (previous !== emoji) counts.set(emoji, (counts.get(emoji) ?? 0) + 1);

  return {
    ...comment,
    reactions: REACTIONS.filter((e) => (counts.get(e) ?? 0) > 0).map((e) => ({
      emoji: e,
      count: counts.get(e)!,
      mine: previous !== emoji && e === emoji,
    })),
  };
}

export type TimelineItem =
  | { kind: "day"; key: string; date: Date }
  | { kind: "message"; key: number; comment: Comment; startsGroup: boolean; endsGroup: boolean };

/** Comments with a separator before each new day, and the edges of each person's message groups. */
export function buildTimeline(comments: Comment[]): TimelineItem[] {
  const items: TimelineItem[] = [];
  comments.forEach((comment, index) => {
    const date = new Date(comment.created_at);
    const previous = comments[index - 1];
    const next = comments[index + 1];
    const newDay = !previous || toISODate(new Date(previous.created_at)) !== toISODate(date);

    if (newDay) items.push({ kind: "day", key: toISODate(date), date });
    items.push({
      kind: "message",
      key: comment.id,
      comment,
      startsGroup: newDay || !continues(previous, comment),
      endsGroup: !next || !continues(comment, next) || toISODate(new Date(next.created_at)) !== toISODate(date),
    });
  });
  return items;
}

function continues(a: Comment | undefined, b: Comment): boolean {
  return (
    !!a &&
    a.author.id === b.author.id &&
    !b.reply_to &&
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime() < GROUP_GAP_MS
  );
}

const JUMBO_EMOJI = /^(?:\p{Extended_Pictographic}(?:️|\p{Emoji_Modifier}|‍\p{Extended_Pictographic})*\s*){1,3}$/u;

/** Messages of one to three emoji are shown large, without a bubble. */
export function isJumboEmoji(text: string): boolean {
  return JUMBO_EMOJI.test(text.trim());
}

/** Shortened text for reply previews. */
export function snippet(text: string, length = 120): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > length ? `${flat.slice(0, length - 1)}…` : flat;
}
