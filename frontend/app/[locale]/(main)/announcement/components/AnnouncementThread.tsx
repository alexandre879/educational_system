"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { message } from "antd";
import { FaArrowDown, FaCheck, FaPaperPlane, FaPen, FaRegCommentDots, FaReply, FaTimes } from "react-icons/fa";
import { useLocale, useTranslations } from "next-intl";
import axios from "axios";

import api from "@/interceptors";
import { addDays, formatDay, formatTimestamp, toISODate } from "@/lib/dates";
import { getLocalizedValue } from "@/lib/localized";
import { useMe } from "../../components/MeContext";
import { NameAvatar, Pill, SubjectBadge } from "../../components/ui/Parts";
import type { Announcement, Comment } from "../interface";
import ChatMessage from "./ChatMessage";
import { buildTimeline, mergeComments, replaceComment, snippet, withReaction } from "./chat";
import styles from "./thread.module.scss";

// The website has no push notifications, so an open thread refreshes itself.
const POLL_MS = 10_000;
// How close to the bottom (px) still counts as "reading the latest messages".
const BOTTOM_SLACK = 80;
// Further up than this, a button offers to jump back down.
const JUMP_THRESHOLD = 320;
const MAX_INPUT_HEIGHT = 140;
const MAX_LENGTH = 5000;
const HIGHLIGHT_MS = 1600;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** An announcement with its comments as a chat, like the mobile app's announcement screen. */
export default function AnnouncementThread({
  announcement,
  onClose,
  onCountChange,
}: {
  announcement: Announcement;
  onClose: () => void;
  onCountChange: (announcementId: number, count: number) => void;
}) {
  const t = useTranslations("App");
  const locale = useLocale();
  const me = useMe();
  const myId = me?.id;
  const id = announcement.id;

  const [comments, setComments] = useState<Comment[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [editing, setEditing] = useState<Comment | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [pickerFor, setPickerFor] = useState<number | null>(null);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [unseen, setUnseen] = useState(0);
  const [showJump, setShowJump] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const followLatest = useRef(false);
  const knownIds = useRef(new Set<number>());
  // What was in the composer before editing a message, put back afterwards.
  const savedDraft = useRef("");
  const highlightTimer = useRef<number | undefined>(undefined);
  const onCountChangeRef = useRef(onCountChange);

  useEffect(() => {
    onCountChangeRef.current = onCountChange;
  });

  const load = useCallback(async () => {
    try {
      const res = await api.get<Comment[]>("comments/", { params: { announcement: id } });
      const known = knownIds.current;
      if (known.size > 0 && !followLatest.current) {
        const fresh = res.data.filter((c) => !known.has(c.id) && c.author.id !== myId).length;
        if (fresh) setUnseen((count) => count + fresh);
      }
      for (const comment of res.data) known.add(comment.id);
      setComments((current) => mergeComments(current, res.data));
      setLoadFailed(false);
    } catch {
      // Keep what's already on screen; only an empty thread shows the error.
      setLoadFailed(true);
    }
  }, [id, myId]);

  useEffect(() => {
    void load();
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    const timer = window.setInterval(refreshIfVisible, POLL_MS);
    document.addEventListener("visibilitychange", refreshIfVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [load]);

  useEffect(() => () => window.clearTimeout(highlightTimer.current), []);

  const visibleCount = comments?.filter((c) => !c.deleted).length;

  // Keep the list's comment counter in step with the thread.
  useEffect(() => {
    if (visibleCount !== undefined) onCountChangeRef.current(id, visibleCount);
  }, [visibleCount, id]);

  // New messages scroll into view only while the reader is at the bottom (or just sent one).
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && followLatest.current) el.scrollTop = el.scrollHeight;
  }, [comments]);

  // The composer grows with its text, up to a few lines.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_HEIGHT)}px`;
  }, [draft]);

  // The reaction picker closes on any click outside it.
  useEffect(() => {
    if (pickerFor === null) return;
    const close = (e: PointerEvent) => {
      if (!(e.target as Element | null)?.closest("[data-chat-popover]")) setPickerFor(null);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [pickerFor]);

  const timeline = useMemo(() => buildTimeline(comments ?? []), [comments]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    followLatest.current = distance < BOTTOM_SLACK;
    setShowJump(distance > JUMP_THRESHOLD);
    if (followLatest.current) setUnseen(0);
  };

  const scrollToLatest = () => {
    const el = scrollRef.current;
    el?.scrollTo({ top: el.scrollHeight, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    setUnseen(0);
  };

  const jumpTo = (commentId: number) => {
    const el = document.getElementById(`comment-${commentId}`);
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    setHighlightId(commentId);
    window.clearTimeout(highlightTimer.current);
    highlightTimer.current = window.setTimeout(() => setHighlightId(null), HIGHLIGHT_MS);
  };

  const focusComposer = (caretAtEnd = false) => {
    const el = inputRef.current;
    if (!el) return;
    // Right away, so typing straight after clicking Reply lands in the composer.
    el.focus();
    // Text put in for editing renders on the next frame; the caret goes after it.
    if (caretAtEnd) requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length));
  };

  const stopEditing = () => {
    setEditing(null);
    setDraft(savedDraft.current);
    savedDraft.current = "";
  };

  const cancelContext = () => {
    if (editing) stopEditing();
    setReplyTo(null);
  };

  const startReply = (comment: Comment) => {
    if (editing) stopEditing();
    setReplyTo(comment);
    setActiveId(null);
    focusComposer();
  };

  const startEdit = (comment: Comment) => {
    if (!editing) savedDraft.current = draft;
    setReplyTo(null);
    setEditing(comment);
    setDraft(comment.comment);
    setActiveId(null);
    focusComposer(true);
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;

    setSending(true);
    try {
      if (editing) {
        if (text !== editing.comment) {
          const res = await api.patch<Comment>(`comments/${editing.id}/`, { comment: text });
          setComments((current) => replaceComment(current, res.data));
        }
        stopEditing();
      } else {
        const res = await api.post<Comment>("comments/create/", {
          comment: text,
          announcement: id,
          reply_to: replyTo?.id ?? null,
        });
        knownIds.current.add(res.data.id);
        followLatest.current = true;
        setComments((current) => mergeComments(current, [res.data]));
        setDraft("");
        setReplyTo(null);
      }
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      if (editing) {
        message.error(t("announcements.editFailed"));
      } else if (status === 400 && replyTo) {
        message.error(t("announcements.replyUnavailable"));
        setReplyTo(null);
      } else {
        message.error(status === 404 ? t("announcements.notFound") : t("announcements.commentFailed"));
      }
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const react = async (comment: Comment, emoji: string) => {
    setPickerFor(null);
    setComments((current) => replaceComment(current, withReaction(comment, emoji)));
    try {
      const res = await api.post<Comment>(`comments/${comment.id}/react/`, { emoji });
      setComments((current) => replaceComment(current, res.data));
    } catch {
      setComments((current) => replaceComment(current, comment));
      message.error(t("announcements.reactFailed"));
    }
  };

  const remove = async (comment: Comment) => {
    try {
      const res = await api.delete<Comment>(`comments/${comment.id}/`);
      setComments((current) => replaceComment(current, res.data));
      if (replyTo?.id === comment.id) setReplyTo(null);
      if (editing?.id === comment.id) stopEditing();
    } catch {
      message.error(t("announcements.deleteFailed"));
    }
  };

  const dayLabel = (date: Date) => {
    const iso = toISODate(date);
    if (iso === toISODate(new Date())) return t("common.today");
    if (iso === toISODate(addDays(new Date(), -1))) return t("time.yesterday");
    const day = formatDay(date, t);
    return date.getFullYear() === new Date().getFullYear() ? day : `${day} ${date.getFullYear()}`;
  };

  const author = announcement.created_by.name || announcement.created_by.email;
  const subjectName = announcement.subject ? getLocalizedValue(announcement.subject.name, locale) : "";
  const grade = `${announcement.grade.name} ${getLocalizedValue(announcement.grade.category_name, locale)}`.trim();
  const canSend = draft.trim().length > 0 && !sending;
  const context = editing ?? replyTo;
  const remaining = MAX_LENGTH - draft.length;

  return (
    <section
      className={styles.thread}
      aria-label={announcement.title}
      onKeyDown={(e) => {
        if (e.key !== "Escape") return;
        if (pickerFor !== null) setPickerFor(null);
        else if (activeId !== null) setActiveId(null);
      }}
    >
      <div className={styles.scrollWrap}>
        <div ref={scrollRef} className={styles.scroll} onScroll={onScroll}>
          <article className={styles.post}>
            <div className={styles.postTop}>
              <div className={styles.badges}>
                {announcement.subject ? <SubjectBadge subjectId={announcement.subject.id} label={subjectName} /> : null}
                <Pill>{`${t("common.grade")} ${grade}`}</Pill>
              </div>
              <button type="button" className={styles.close} onClick={onClose} aria-label={t("common.close")} title={t("common.close")}>
                <FaTimes />
              </button>
            </div>

            <h2 className={styles.title}>{announcement.title}</h2>

            <div className={styles.author}>
              <NameAvatar name={author} size={36} />
              <div>
                <div className={styles.authorName}>{author}</div>
                <div className={styles.muted}>{formatTimestamp(announcement.created_at, t)}</div>
              </div>
            </div>

            <div className={styles.divider} />
            <p className={styles.body}>{announcement.content}</p>
          </article>

          <h3 className={styles.sectionTitle}>
            {t("announcements.comments")} · {visibleCount ?? announcement.len_comments}
            <span className={styles.live} title={t("announcements.live")} aria-hidden />
          </h3>

          {comments === null ? (
            loadFailed ? (
              <div className={styles.noComments}>
                <span>{t("common.networkError")}</span>
                <button type="button" className={styles.retry} onClick={() => void load()}>
                  {t("common.retry")}
                </button>
              </div>
            ) : (
              <div className={styles.loading} role="status" />
            )
          ) : comments.length === 0 ? (
            <div className={styles.noComments}>
              <FaRegCommentDots size={22} />
              <span>{t("announcements.noComments")}</span>
            </div>
          ) : (
            <ol className={styles.messages}>
              {timeline.map((item) =>
                item.kind === "day" ? (
                  <li key={`day-${item.key}`} className={styles.day} role="separator">
                    <span>{dayLabel(item.date)}</span>
                  </li>
                ) : (
                  <ChatMessage
                    key={item.key}
                    comment={item.comment}
                    mine={item.comment.author.id === myId}
                    startsGroup={item.startsGroup}
                    endsGroup={item.endsGroup}
                    highlighted={highlightId === item.comment.id}
                    active={activeId === item.comment.id}
                    pickerOpen={pickerFor === item.comment.id}
                    onActivate={() => setActiveId((current) => (current === item.comment.id ? null : item.comment.id))}
                    onTogglePicker={() => setPickerFor((current) => (current === item.comment.id ? null : item.comment.id))}
                    onReact={(emoji) => void react(item.comment, emoji)}
                    onReply={() => startReply(item.comment)}
                    onEdit={() => startEdit(item.comment)}
                    onDelete={() => void remove(item.comment)}
                    onJump={jumpTo}
                  />
                )
              )}
            </ol>
          )}
        </div>

        {showJump || unseen > 0 ? (
          <button type="button" className={styles.jump} onClick={scrollToLatest} aria-label={t("announcements.jumpToLatest")}>
            <FaArrowDown />
            {unseen > 0 ? <span>{t("announcements.newMessages", { count: unseen })}</span> : null}
          </button>
        ) : null}
      </div>

      <form
        className={styles.composer}
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        {context ? (
          <div className={styles.context}>
            <span className={styles.contextIcon}>{editing ? <FaPen /> : <FaReply />}</span>
            <button type="button" className={styles.contextBody} onClick={() => jumpTo(context.id)}>
              <strong>
                {editing ? t("announcements.editing") : t("announcements.replyingTo", { name: context.author.name })}
              </strong>
              <span>{snippet(context.comment)}</span>
            </button>
            <button type="button" className={styles.contextClose} onClick={cancelContext} aria-label={t("common.cancel")} title={t("common.cancel")}>
              <FaTimes />
            </button>
          </div>
        ) : null}

        <div className={styles.composerRow}>
          <textarea
            ref={inputRef}
            className={styles.input}
            rows={1}
            value={draft}
            maxLength={MAX_LENGTH}
            placeholder={replyTo ? t("announcements.replyPlaceholder") : t("announcements.commentPlaceholder")}
            aria-label={t("announcements.commentPlaceholder")}
            title={t("web.sendHint")}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send();
              } else if (e.key === "Escape" && context) {
                e.preventDefault();
                e.stopPropagation();
                cancelContext();
              } else if (e.key === "ArrowUp" && !draft && !context) {
                // Like most chat apps: ↑ in an empty composer edits your last message.
                const last = comments?.findLast((c) => c.can_edit && c.author.id === myId);
                if (last) {
                  e.preventDefault();
                  startEdit(last);
                }
              }
            }}
          />
          {remaining <= 300 ? <span className={styles.counter}>{remaining}</span> : null}
          <button
            type="submit"
            className={styles.send}
            disabled={!canSend}
            aria-label={editing ? t("common.save") : t("common.send")}
            title={editing ? t("common.save") : t("common.send")}
          >
            {sending ? <span className={styles.spinner} /> : editing ? <FaCheck /> : <FaPaperPlane />}
          </button>
        </div>
      </form>
    </section>
  );
}
