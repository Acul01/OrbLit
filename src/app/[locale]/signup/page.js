"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { authFormStyles as s } from "@/components/authFormStyles";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import BackToHomeLink from "@/components/BackToHomeLink";

function SignupForm() {
  const t = useTranslations("auth.signup");
  const router = useRouter();
  const searchParams = useSearchParams();
  // Matches login's default (see login/page.js).
  const next = searchParams.get("next") || "/app";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(
          next
        )}`,
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data.session) {
      // Email confirmation is disabled for this project — signUp already
      // returns an active session, so skip straight to `next` (usually /app).
      router.push(next);
      router.refresh();
      return;
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
      <GoogleSignInButton label={t("google")} next={next} />
      <div style={s.divider}>
        <span style={s.dividerLine} />
        {t("or")}
        <span style={s.dividerLine} />
      </div>
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
      <label style={s.label}>
        {t("password")}
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
      <p style={s.footer}>
        {t("haveAccount")} <Link href="/login">{t("loginLink")}</Link>
      </p>
    </form>
  );
}

export default function SignupPage() {
  return (
    <div style={s.page}>
      <BackToHomeLink />
      <Suspense fallback={null}>
        <SignupForm />
      </Suspense>
    </div>
  );
}
