"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import api from "@/interceptors";
import styles from "./aisupport.module.scss";
import { useTranslations } from "next-intl";

type Role = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  // Local fallback text shown when a request failed; never sent back as context.
  isError?: boolean;
};

const STORAGE_KEY = "ai_support_chat_history_v2";
// How many previous messages are sent along so the assistant can follow the conversation.
const CONTEXT_MESSAGES = 10;

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function AISupportChatbot() {
  const t = useTranslations("AISupport");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [restored, setRestored] = useState(false);

  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const hasMessages = messages.length > 0;

  // Restore after mount: reading localStorage during render would make the
  // first client render differ from the server HTML (hydration error).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) setMessages(parsed as ChatMessage[]);
    } catch {
      // ignore unreadable history
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // storage full or disabled
    }
  }, [messages, restored]);

  // auto scroll
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, isThinking]);

  const intro = useMemo<ChatMessage>(
    () => ({
      id: "intro",
      role: "assistant",
      content: t("intro"),
      createdAt: Date.now(),
    }),
    [t]
  );

  const visibleMessages = hasMessages ? messages : [intro];

  const canSend = input.trim().length > 0 && !isThinking;

  const newChat = () => {
    setMessages([]);
    setInput("");
    setErrorText(null);
    setIsThinking(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const send = async () => {
    const text = input.trim();
    if (!text || isThinking) return;

    setErrorText(null);
    setIsThinking(true);
    setInput("");

    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      content: text,
      createdAt: Date.now(),
    };

    const history = messages
      .filter((m) => !m.isError)
      .slice(-CONTEXT_MESSAGES)
      .map(({ role, content }) => ({ role, content }));

    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await api.post("/aisupport/", { message: text, history });

      const reply = String(res.data?.reply ?? "").trim() || t("fallbackReply");

      const botMsg: ChatMessage = {
        id: uid(),
        role: "assistant",
        content: reply,
        createdAt: Date.now(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error("AI support error:", err);
      setErrorText(t("errorBar"));

      const botMsg: ChatMessage = {
        id: uid(),
        role: "assistant",
        content: t("errorMessage"),
        createdAt: Date.now(),
        isError: true,
      };

      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setIsThinking(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    // Enter = send, Shift+Enter = newline
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.titleWrap}>
            <div className={styles.logoDot} />
            <div>
              <div className={styles.title}>{t("title")}</div>
              <div className={styles.subtitle}>
                {isThinking ? t("thinking") : t("online")}
              </div>
            </div>
          </div>

          <div className={styles.headerActions}>
            <button
              className={styles.secondaryBtn}
              type="button"
              onClick={newChat}
              disabled={isThinking && messages.length === 0}
              title={t("clearChatTitle")}
            >
              {t("newChat")}
            </button>
          </div>
        </header>

        <div className={styles.chatArea} ref={listRef}>
          {visibleMessages.map((m) => (
            <div
              key={m.id}
              className={`${styles.row} ${
                m.role === "user" ? styles.rowUser : styles.rowBot
              }`}
            >
              <div className={styles.bubble} data-role={m.role}>
                <div className={styles.bubbleRole}>
                  {m.role === "user" ? t("you") : t("assistant")}
                </div>
                <div className={styles.bubbleText}>{m.content}</div>
              </div>
            </div>
          ))}

          {isThinking && (
            <div className={`${styles.row} ${styles.rowBot}`}>
              <div className={styles.bubble} data-role="assistant">
                <div className={styles.bubbleRole}>{t("assistant")}</div>
                <div className={styles.typing}>
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          )}
        </div>

        <footer className={styles.footer}>
          {errorText && <div className={styles.errorBar}>{errorText}</div>}

          <div className={styles.composer}>
            <textarea
              ref={inputRef}
              className={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={t("placeholder")}
              rows={1}
            />
            <button
              className={styles.sendBtn}
              type="button"
              onClick={send}
              disabled={!canSend}
            >
              {t("send")}
            </button>
          </div>

          <div className={styles.hint}>{t("hint")}</div>
        </footer>
      </div>
    </div>
  );
}