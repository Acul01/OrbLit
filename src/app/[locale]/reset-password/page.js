"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { authFormStyles as s } from "@/components/authFormStyles";
import BackToHomeLink from "@/components/BackToHomeLink";

// Landed on after clicking the reset-password email link — by then
// /auth/confirm has already verified the recovery token_hash and
// established a (recovery-scoped) session, so this page only needs to
// collect the new password and call updateUser().
function ResetPasswordForm() {
  const t = useTranslations("auth.resetPassword");
  const router = useRouter();
  const [sessionState, setSessionState] = useState("checking"); // "checking" | "ready" | "invalid"
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setSessionState(data.user ? "ready" : "invalid");
    });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => {
      router.push("/app");
      router.refresh();
    }, 1500);
  }

  if (done) {
    return (
      <div style={s.card}>
        <h1 style={s.title}>{t("successTitle")}</h1>
        <p style={s.notice}>{t("successBody")}</p>
      </div>
    );
  }

  if (sessionState === "checking") {
    return <div style={s.card} />;
  }

  if (sessionState === "invalid") {
    return (
      <div style={s.card}>
        <h1 style={s.title}>{t("invalidTitle")}</h1>
        <p style={s.footer}>{t("invalidBody")}</p>
      </div>
    );
  }

  return (
    <form style={s.card} onSubmit={handleSubmit}>
      <h1 style={s.title}>{t("title")}</h1>
      <label style={s.label}>
        {t("newPassword")}
        <input
          style={s.input}
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error && <p style={s.error}>{error}</p>}
      <button style={s.button} type="submit" disabled={loading}>
        {loading ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div style={s.page}>
      <BackToHomeLink />
      <ResetPasswordForm />
    </div>
  );
}
