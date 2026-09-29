"use client";

import { useState } from "react";
import { Star, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/** Fixed top-right feedback button, positioned just left of UserMenu's
 *  avatar button. Opens a small modal: 1-5 star rating + free-text
 *  suggestion, insert-only into the `feedback` table (RLS: users can
 *  write their own row, can't read any back). */
export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(false);

  function close() {
    setOpen(false);
    // Reset after the close animation would run, so a reopened modal
    // starts fresh rather than showing the last submission's state.
    setTimeout(() => {
      setRating(0);
      setMessage("");
      setSubmitted(false);
      setError(false);
    }, 200);
  }

  async function handleSubmit() {
    if (!rating) return;
    setSubmitting(true);
    setError(false);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");

      const trimmed = message.trim().slice(0, 2000);
      const { error: insertError } = await supabase.from("feedback").insert({
        user_id: user.id,
        rating,
        message: trimmed || null,
      });
      if (insertError) throw insertError;
      setSubmitted(true);
    } catch {
      setError(true);
    }
    setSubmitting(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={styles.trigger}
        aria-label="Send feedback"
        title="Send feedback"
      >
        Feedback
      </button>

      {open && (
        <div style={styles.overlay} onClick={close}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button style={styles.closeButton} onClick={close} aria-label="Close">
              <X size={16} />
            </button>

            {submitted ? (
              <div style={styles.thanks}>
                <p style={styles.thanksTitle}>Thanks for the feedback!</p>
                <p style={styles.thanksBody}>It really helps shape what we build next.</p>
              </div>
            ) : (
              <>
                <h2 style={styles.title}>Feedback &amp; suggestions</h2>
                <p style={styles.subtitle}>
                  How&apos;s OrbLit working for you? Ideas for new features are welcome too.
                </p>

                <div style={styles.stars}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      onMouseEnter={() => setHoverRating(n)}
                      onMouseLeave={() => setHoverRating(0)}
                      style={styles.starButton}
                      aria-label={`${n} star${n > 1 ? "s" : ""}`}
                    >
                      <Star
                        size={26}
                        fill={n <= (hoverRating || rating) ? "#F5C451" : "none"}
                        color={n <= (hoverRating || rating) ? "#F5C451" : "#3A4A6B"}
                      />
                    </button>
                  ))}
                </div>

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={2000}
                  placeholder="What's working, what's missing, what would you like to see?"
                  style={styles.textarea}
                  rows={4}
                />

                {error && (
                  <p style={styles.error}>Couldn&apos;t send that. Please try again.</p>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={!rating || submitting}
                  style={{
                    ...styles.submitButton,
                    ...((!rating || submitting) ? styles.submitButtonDisabled : {}),
                  }}
                >
                  {submitting ? "Sending…" : "Send feedback"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  trigger: {
    height: 32,
    padding: "0 14px",
    borderRadius: 999,
    border: "1px solid #2A3B5C",
    background: "#111A2C",
    color: "#E8E6DE",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "ui-sans-serif, system-ui",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(6, 10, 18, 0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1100,
    padding: 20,
  },
  modal: {
    position: "relative",
    width: "100%",
    maxWidth: 380,
    background: "#111A2C",
    border: "1px solid #24314C",
    borderRadius: 12,
    padding: 24,
    boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
    fontFamily: "ui-sans-serif, system-ui",
    color: "#E8E6DE",
  },
  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 26,
    height: 26,
    borderRadius: 6,
    border: "none",
    background: "transparent",
    color: "#7C8AA3",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { margin: "0 0 6px", fontSize: 17, fontWeight: 600 },
  subtitle: { margin: "0 0 18px", fontSize: 13, color: "#8593A8", lineHeight: 1.5 },
  stars: { display: "flex", gap: 4, marginBottom: 16 },
  starButton: {
    border: "none",
    background: "transparent",
    padding: 2,
    cursor: "pointer",
    display: "flex",
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    background: "#0B1220",
    border: "1px solid #2A3B5C",
    borderRadius: 8,
    color: "#E8E6DE",
    fontSize: 13,
    fontFamily: "inherit",
    padding: 10,
    resize: "vertical",
    marginBottom: 14,
  },
  error: { margin: "0 0 10px", fontSize: 13, color: "#E8977A" },
  submitButton: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 6,
    border: "none",
    background: "#4FD1C5",
    color: "#0B1220",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
  },
  submitButtonDisabled: { opacity: 0.5, cursor: "not-allowed" },
  thanks: { padding: "12px 0 4px", textAlign: "center" },
  thanksTitle: { margin: "0 0 6px", fontSize: 16, fontWeight: 600 },
  thanksBody: { margin: 0, fontSize: 13, color: "#8593A8" },
};
