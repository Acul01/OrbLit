"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { authFormStyles as s } from "@/components/authFormStyles";
import BackToHomeLink from "@/components/BackToHomeLink";

function ForgotPasswordForm() {
  const t = useTranslations("auth.forgotPassword");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(
        "/reset-password"
      )}`,
    });
    setLoading(false);
    // Always show the "check your inbox" state, even on error — this
    // avoids leaking whether an email address has an account.
    if (error) {
      console.error("resetPasswordForEmail failed:", error.message);
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div style={s.card}>
        <h1 style={s.title}>{t("checkInboxTitle")}</h1>
        <p style={s.notice}>{t("checkInboxBody", { email })}</p>
      </div>
    );
  }

  return (
    <form style={s.card} onSubmit={handleSubmit}>
      <h1 style={s.title}>{t("title")}</h1>
      <p style={s.footer}>{t("subtitle")}</p>
      <label style={s.label}>
        {t("email")}
        <input
          style={s.input}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      {error && <p style={s.error}>{error}</p>}
      <button style={s.button} type="submit" disabled={loading}>
        {loading ? t("submitting") : t("submit")}
      </button>
      <p style={s.footer}>
        <Link href="/login">{t("backToLogin")}</Link>
      </p>
    </form>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div style={s.page}>
      <BackToHomeLink />
      <ForgotPasswordForm />
    </div>
  );
}
