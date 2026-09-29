"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { authFormStyles as s } from "@/components/authFormStyles";
import OAuthSignInButtons from "@/components/OAuthSignInButtons";
import BackToHomeLink from "@/components/BackToHomeLink";
import { safeNextPath } from "@/lib/safe-next";

function LoginForm() {
  const t = useTranslations("auth.login");
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const oauthFailed = searchParams.get("error") === "oauth_failed";

  return (
    <div style={s.card}>
      <h1 style={s.title}>{t("title")}</h1>
      <OAuthSignInButtons googleLabel={t("google")} githubLabel={t("github")} next={next} />
      {oauthFailed && <p style={s.error}>{t("oauthFailed")}</p>}
      <p style={s.footer}>
        {t("noAccount")} <Link href="/signup">{t("signupLink")}</Link>
      </p>
    </div>
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
