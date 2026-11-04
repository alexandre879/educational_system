"use client";

import type { ReactNode } from "react";
import { Avatar } from "@mui/material";
import { Popconfirm } from "antd";
import { FaBan, FaPen, FaRegSmile, FaReply, FaTrashAlt } from "react-icons/fa";
import { useTranslations } from "next-intl";

import { formatTime } from "@/lib/dates";
import { mediaUrl } from "@/lib/media";
import { NameAvatar } from "../../components/ui/Parts";
import { REACTIONS, type Comment } from "../interface";
import { isJumboEmoji } from "./chat";
import styles from "./thread.module.scss";

const URL_PATTERN = /(https?:\/\/[^\s<]+[^\s<.,:;"')\]!?])/g;

/** Text with its web addresses turned into links. */
function linkify(text: string): ReactNode[] {
  // Splitting on a capturing group alternates plain text and URLs.
  return text.split(URL_PATTERN).map((part, index) =>
    index % 2 === 1 ? (
      <a key={index} href={part} target="_blank" rel="noopener noreferrer nofollow" onClick={(e) => e.stopPropagation()}>
        {part}
      </a>
    ) : (
      part
    )
  );
}

interface ChatMessageProps {
  comment: Comment;
  mine: boolean;
  startsGroup: boolean;
  endsGroup: boolean;
  highlighted: boolean;
  /** Keeps the action bar visible (touch screens have no hover). */
  active: boolean;
  pickerOpen: boolean;
  onActivate: () => void;
  onTogglePicker: () => void;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onJump: (commentId: number) => void;
}

export default function ChatMessage({
  comment,
  mine,
  startsGroup,
  endsGroup,
  highlighted,
  active,
  pickerOpen,
  onActivate,
  onTogglePicker,
  onReact,
  onReply,
  onEdit,
  onDelete,
  onJump,
}: ChatMessageProps) {
  const t = useTranslations("App");
  const { author, reply_to: reply } = comment;
  const jumbo = !comment.deleted && !reply && isJumboEmoji(comment.comment);
  const staff = author.role === "teacher" || author.role === "admin";

  const className = [
    styles.message,
    mine && styles.mine,
    startsGroup && styles.groupStart,
    highlighted && styles.highlight,
    active && styles.active,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <li id={`comment-${comment.id}`} className={className}>
      {!mine ? (
        <div className={styles.avatarSlot}>
          {endsGroup ? (
            author.photo ? (
              <Avatar src={mediaUrl(author.photo)} alt="" sx={{ width: 32, height: 32 }} />
            ) : (
              <NameAvatar name={author.name} size={32} />
            )
          ) : null}
        </div>
      ) : null}

      <div className={styles.stack}>
        {pickerOpen ? (
          <div className={styles.picker} role="menu" data-chat-popover>
            {REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                role="menuitem"
                className={comment.reactions.some((r) => r.mine && r.emoji === emoji) ? styles.pickedEmoji : undefined}
                onClick={() => onReact(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : null}

        <div className={styles.bubbleRow}>
          <div className={`${styles.bubble} ${jumbo ? styles.jumbo : ""} ${comment.deleted ? styles.deleted : ""}`} onClick={onActivate}>
            {!mine && startsGroup ? (
              <span className={styles.sender}>
                <span className={styles.senderName}>{author.name}</span>
                {staff ? <span className={styles.roleTag}>{t(`roles.${author.role}`)}</span> : null}
              </span>
            ) : null}

            {reply ? (
              <button
                type="button"
                className={styles.quote}
                onClick={(e) => {
                  e.stopPropagation();
                  onJump(reply.id);
                }}
              >
                <span className={styles.quoteAuthor}>{reply.author}</span>
                <span className={styles.quoteText}>
                  {reply.deleted ? t("announcements.deletedMessage") : reply.comment}
                </span>
              </button>
            ) : null}

            {comment.deleted ? (
              <span className={styles.text}>
                <FaBan aria-hidden /> {t("announcements.deletedMessage")}
              </span>
            ) : (
              <span className={styles.text}>{linkify(comment.comment)}</span>
            )}

            <span className={styles.meta}>
              {comment.edited_at && !comment.deleted ? (
                <span title={new Date(comment.edited_at).toLocaleString()}>{t("announcements.edited")}</span>
              ) : null}
              <time dateTime={comment.created_at} title={new Date(comment.created_at).toLocaleString()}>
                {formatTime(comment.created_at)}
              </time>
            </span>
          </div>

          {!comment.deleted ? (
            <div className={styles.actions} role="toolbar" aria-label={t("announcements.messageActions")}>
              <button
                type="button"
                data-chat-popover
                onClick={onTogglePicker}
                aria-label={t("announcements.react")}
                title={t("announcements.react")}
                aria-expanded={pickerOpen}
              >
                <FaRegSmile />
              </button>
              <button type="button" onClick={onReply} aria-label={t("announcements.reply")} title={t("announcements.reply")}>
                <FaReply />
              </button>
              {comment.can_edit ? (
                <button type="button" onClick={onEdit} aria-label={t("announcements.edit")} title={t("announcements.edit")}>
                  <FaPen />
                </button>
              ) : null}
              {comment.can_delete ? (
                <Popconfirm
                  title={t("announcements.deleteTitle")}
                  description={mine ? t("announcements.deleteMessage") : t("announcements.deleteOthersMessage")}
                  okText={t("announcements.delete")}
                  cancelText={t("common.cancel")}
                  okButtonProps={{ danger: true }}
                  onConfirm={onDelete}
                >
                  <button type="button" className={styles.danger} aria-label={t("announcements.delete")} title={t("announcements.delete")}>
                    <FaTrashAlt />
                  </button>
                </Popconfirm>
              ) : null}
            </div>
          ) : null}
        </div>

        {comment.reactions.length > 0 ? (
          <div className={styles.reactions}>
            {comment.reactions.map((reaction) => (
              <button
                key={reaction.emoji}
                type="button"
                className={`${styles.reaction} ${reaction.mine ? styles.reactionMine : ""}`}
                aria-pressed={reaction.mine}
                onClick={() => onReact(reaction.emoji)}
              >
                <span>{reaction.emoji}</span>
                <span className={styles.reactionCount}>{reaction.count}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </li>
  );
}
