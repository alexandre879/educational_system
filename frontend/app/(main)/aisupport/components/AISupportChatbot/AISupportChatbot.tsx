'use client';

import { useMemo, useState } from "react";
import ChatBot from "react-chatbotify";
import api from "@/interceptors";
import styles from "./aisupport..module.scss";

type FlowParams = { userInput?: string };

export default function AISupportChatbot() {
  const [isThinking, setIsThinking] = useState(false);

  const settings = useMemo(
    () => ({
      general: {
        embedded: true,
        showHeader: true,
        showFooter: true,
      },
      chatHistory: {
        storageKey: "ai_support_chat_history",
      },
    }),
    []
  );

  const flow = useMemo(
    () => ({
      start: {
        message: "Hi 👋 Ask me anything.",
        path: "ask",
      },

      ask: {
        message: async (params: FlowParams) => {
          const userText = String(params?.userInput ?? "").trim();
          if (!userText) return "Write something 🙂";

          setIsThinking(true);

          try {
            const res = await api.post("/aisupport/", { message: userText });
            return String(res.data?.reply ?? "...");
          } catch (err) {
            console.error("AI support error:", err);
            return "AI service failed. Try again in a moment.";
          } finally {
            setIsThinking(false);
          }
        },
        path: "ask",
      },
    }),
    []
  );

  return (
    <div className={styles.botWrapper}>
      <ChatBot settings={settings} flow={flow} />
      {isThinking && <div className={styles.thinkingBadge}>Thinking…</div>}
    </div>
  );
}