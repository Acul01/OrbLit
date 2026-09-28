import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import BackToHomeLink from "@/components/BackToHomeLink";

export default async function AccountPage() {
  const t = await getTranslations("account");
  const locale = await getLocale();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login?next=/account", locale });
  }

  return (
    <div style={s.page}>
      <BackToHomeLink href="/app" label="Back to dashboard" />
      <div style={s.card}>
        <h1 style={s.title}>{t("title")}</h1>
        <p style={s.row}>
          <span style={s.label}>{t("email")}</span> {user.email}
        </p>
        <form action="/logout" method="post">
          <button style={s.logout} type="submit">
            {t("logout")}
          </button>
        </form>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0B1220",
    color: "#E8E6DE",
    fontFamily: "system-ui, sans-serif",
  },
  card: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    width: 360,
    padding: 28,
    borderRadius: 10,
    background: "#111A2C",
    border: "1px solid #22304a",
  },
  title: { margin: "0 0 6px", fontSize: 20, fontWeight: 600 },
  row: { margin: 0, fontSize: 14, color: "#E8E6DE" },
  label: { color: "#8593A8", marginRight: 6 },
  logout: {
    marginTop: 6,
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid #2A3B5C",
    background: "transparent",
    color: "#B9C2D0",
    cursor: "pointer",
    width: "100%",
  },
};
