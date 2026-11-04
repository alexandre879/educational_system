import type { Comment } from "@/api/types";
import {
  buildTimeline,
  isJumboEmoji,
  replaceComment,
  snippet,
  splitLinks,
  withReaction,
} from "@/features/announcements/chat";

let nextId = 1;
function comment(authorId: number, createdAt: string, extra: Partial<Comment> = {}): Comment {
  return {
    id: nextId++,
    user: `${authorId}@school.edu`,
    author: { id: authorId, name: `User ${authorId}`, role: "student", photo: null },
    comment: "Hello",
    created_at: createdAt,
    edited_at: null,
    deleted: false,
    reply_to: null,
    reactions: [],
    can_edit: false,
    can_delete: false,
    ...extra,
  };
}

describe("withReaction", () => {
  const base = comment(1, "2026-10-20T10:00:00", {
    reactions: [{ emoji: "👍", count: 2, mine: false }],
  });

  it("adds a reaction in the palette's order", () => {
    expect(withReaction(base, "❤️").reactions).toEqual([
      { emoji: "👍", count: 2, mine: false },
      { emoji: "❤️", count: 1, mine: true },
    ]);
  });

  it("replaces your previous reaction", () => {
    const loved = withReaction(base, "❤️");
    expect(withReaction(loved, "😂").reactions).toEqual([
      { emoji: "👍", count: 2, mine: false },
      { emoji: "😂", count: 1, mine: true },
    ]);
  });

  it("takes the same reaction back", () => {
    const liked = withReaction(base, "👍");
    expect(liked.reactions).toEqual([{ emoji: "👍", count: 3, mine: true }]);
    expect(withReaction(liked, "👍").reactions).toEqual([{ emoji: "👍", count: 2, mine: false }]);
  });
});

describe("buildTimeline", () => {
  it("separates days and groups one person's quick messages", () => {
    const a = comment(1, "2026-10-20T10:00:00");
    const b = comment(1, "2026-10-20T10:02:00");
    const c = comment(2, "2026-10-20T10:03:00");
    const d = comment(2, "2026-10-21T09:00:00");

    const items = buildTimeline([a, b, c, d]);
    expect(items.map((item) => (item.kind === "day" ? "day" : item.comment.id))).toEqual([
      "day", a.id, b.id, c.id, "day", d.id,
    ]);

    const messages = items.flatMap((item) => (item.kind === "message" ? [item] : []));
    expect(messages.map((m) => [m.startsGroup, m.endsGroup])).toEqual([
      [true, false],
      [false, true],
      [true, true],
      [true, true],
    ]);
  });

  it("starts a new group for a reply or after a pause", () => {
    const a = comment(1, "2026-10-20T10:00:00");
    const reply = comment(1, "2026-10-20T10:01:00", {
      reply_to: { id: 99, author: "User 2", comment: "Hi", deleted: false },
    });
    const later = comment(1, "2026-10-20T10:30:00");

    const messages = buildTimeline([a, reply, later]).flatMap((item) => (item.kind === "message" ? [item] : []));
    expect(messages.map((m) => m.startsGroup)).toEqual([true, true, true]);
  });
});

describe("replaceComment", () => {
  it("updates the quotes of replies to the changed message", () => {
    const original = comment(1, "2026-10-20T10:00:00", { comment: "Old text" });
    const reply = comment(2, "2026-10-20T10:01:00", {
      reply_to: { id: original.id, author: "User 1", comment: "Old text", deleted: false },
    });

    const removed = { ...original, comment: "", deleted: true };
    const [updatedOriginal, updatedReply] = replaceComment([original, reply], removed)!;

    expect(updatedOriginal).toBe(removed);
    expect(updatedReply.reply_to).toEqual({ id: original.id, author: "User 1", comment: "", deleted: true });
  });
});

describe("text helpers", () => {
  it("spots short emoji-only messages", () => {
    expect(isJumboEmoji("🎉")).toBe(true);
    expect(isJumboEmoji(" 👍🏽❤️ ")).toBe(true);
    expect(isJumboEmoji("👨‍👩‍👧")).toBe(true);
    expect(isJumboEmoji("🎉🎉🎉🎉")).toBe(false);
    expect(isJumboEmoji("ok 👍")).toBe(false);
    expect(isJumboEmoji("123")).toBe(false);
  });

  it("finds links without trailing punctuation", () => {
    expect(splitLinks("See https://example.org/a?b=1. Thanks")).toEqual(["See ", "https://example.org/a?b=1", ". Thanks"]);
    expect(splitLinks("no links")).toEqual(["no links"]);
  });

  it("shortens previews to one line", () => {
    expect(snippet("a\n\nb   c")).toBe("a b c");
    expect(snippet("x".repeat(10), 5)).toBe("xxxx…");
  });
});
