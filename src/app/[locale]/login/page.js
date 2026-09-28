"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { authFormStyles as s } from "@/components/authFormStyles";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import BackToHomeLink from "@/components/BackToHomeLink";

function LoginForm() {
  const t = useTranslations("auth.login");
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/app";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(next);
    router.refresh();
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
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <p style={s.footer}>
        <Link href="/forgot-password">{t("forgotPassword")}</Link>
      </p>
      {error && <p style={s.error}>{error}</p>}
      <button style={s.button} type="submit" disabled={loading}>
        {loading ? t("submitting") : t("submit")}
      </button>
      <p style={s.footer}>
        {t("noAccount")} <Link href="/signup">{t("signupLink")}</Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div style={s.page}>
      <BackToHomeLink />
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
