"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/sentry";

// Last-resort boundary for errors in the root layout itself (it replaces <html>, so no translations or theme).
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#090b10",
          color: "#f2f4f8",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", display: "grid", gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 22 }}>Something went wrong</h1>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "10px 18px",
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(135deg, #1677ff, #8b5cf6)",
              color: "#fff",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
