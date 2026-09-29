"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { authFormStyles as s } from "@/components/authFormStyles";
import OAuthSignInButtons from "@/components/OAuthSignInButtons";
import BackToHomeLink from "@/components/BackToHomeLink";
import { safeNextPath } from "@/lib/safe-next";

function SignupForm() {
  const t = useTranslations("auth.signup");
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const oauthFailed = searchParams.get("error") === "oauth_failed";

  return (
    <div style={s.card}>
      <h1 style={s.title}>{t("title")}</h1>
      <OAuthSignInButtons googleLabel={t("google")} githubLabel={t("github")} next={next} />
      {oauthFailed && <p style={s.error}>{t("oauthFailed")}</p>}
      <p style={s.footer}>
        {t("haveAccount")} <Link href="/login">{t("loginLink")}</Link>
      </p>
    </div>
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
