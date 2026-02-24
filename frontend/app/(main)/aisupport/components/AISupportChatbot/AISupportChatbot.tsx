"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import api from "@/interceptors";
import styles from "./aisupport.module.scss";

type Role = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
};

const STORAGE_KEY = "ai_support_chat_history_v2";

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function AISupportChatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as ChatMessage[]) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const hasMessages = messages.length > 0;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      console.log('error has been caught')
    }
  }, [messages]);

  // auto scroll
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, isThinking]);

  const intro = useMemo<ChatMessage>(
    () => ({
      id: "intro",
      role: "assistant",
      content:
        "Hi 👋 I’m your AI support agent. Ask me anything about the platform, homework, exams, or technical issues.",
      createdAt: Date.now(),
    }),
    []
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

    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await api.post("/aisupport/", { message: text });

      const reply = String(res.data?.reply ?? "").trim() || "…";

      const botMsg: ChatMessage = {
        id: uid(),
        role: "assistant",
        content: reply,
        createdAt: Date.now(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error("AI support error:", err);
      setErrorText("AI service failed. Try again in a moment.");

      const botMsg: ChatMessage = {
        id: uid(),
        role: "assistant",
        content:
          "Sorry — I couldn’t reach the AI service right now. Please try again in a moment.",
        createdAt: Date.now(),
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
              <div className={styles.title}>AI Support</div>
              <div className={styles.subtitle}>
                {isThinking ? "Thinking…" : "Online"}
              </div>
            </div>
          </div>

          <div className={styles.headerActions}>
            <button
              className={styles.secondaryBtn}
              type="button"
              onClick={newChat}
              disabled={isThinking && messages.length === 0}
              title="Clear chat"
            >
              New chat
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
                  {m.role === "user" ? "You" : "Assistant"}
                </div>
                <div className={styles.bubbleText}>{m.content}</div>
              </div>
            </div>
          ))}

          {isThinking && (
            <div className={`${styles.row} ${styles.rowBot}`}>
              <div className={styles.bubble} data-role="assistant">
                <div className={styles.bubbleRole}>Assistant</div>
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
              placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
              rows={1}
            />
            <button
              className={styles.sendBtn}
              type="button"
              onClick={send}
              disabled={!canSend}
            >
              Send
            </button>
          </div>

          <div className={styles.hint}>
            Don’t share passwords or private data. This chat may be saved for
            debugging.
          </div>
        </footer>
      </div>
    </div>
  );
}