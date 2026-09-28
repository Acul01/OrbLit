import { Link } from "@/i18n/navigation";
import OrbitIcon from "@/components/OrbitIcon";

/** Shared shell for the legal pages (Impressum, Datenschutz, AGB) — nav
 *  back to the landing page, a persistent "this is a draft, get it
 *  reviewed" banner, and consistent prose styling for long-form text. */
export default function LegalPage({ title, draftNotice, children }) {
  return (
    <div style={s.page}>
      <header style={s.nav}>
        <Link href="/" style={s.logoGroup}>
          <OrbitIcon size={20} />
          <span style={s.logo}>OrbLit</span>
        </Link>
      </header>

      <div style={s.content}>
        {draftNotice && <div style={s.banner}>{draftNotice}</div>}
        <h1 style={s.title}>{title}</h1>
        <div style={s.prose}>{children}</div>
      </div>
    </div>
  );
}

// Reused by each legal page for section headings / paragraphs / lists
// within the prose body, so every page reads consistently.
export const proseStyles = {
  h2: { fontSize: 18, color: "#E8E6DE", margin: "32px 0 10px" },
  h3: { fontSize: 15, color: "#E8E6DE", margin: "20px 0 8px" },
  p: { margin: "0 0 14px" },
  ul: { margin: "0 0 14px", paddingLeft: 20 },
  li: { marginBottom: 6 },
  placeholder: { color: "#E8C275", fontStyle: "italic" },
  a: { color: "#4FD1C5" },
};

const s = {
  page: {
    background: "#0B1220",
    color: "#E8E6DE",
    fontFamily: "system-ui, sans-serif",
    minHeight: "100vh",
  },
  nav: {
    padding: "20px 32px",
    borderBottom: "1px solid #1E2A42",
  },
  logoGroup: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    textDecoration: "none",
    color: "#E8E6DE",
    width: "fit-content",
  },
  logo: { fontSize: 16, fontWeight: 700 },
  content: { maxWidth: 720, margin: "0 auto", padding: "40px 24px 80px" },
  banner: {
    background: "#2A1F14",
    border: "1px solid #5A4426",
    color: "#E8C275",
    borderRadius: 8,
    padding: "12px 16px",
    fontSize: 13,
    lineHeight: 1.5,
    marginBottom: 32,
  },
  title: { fontSize: 28, margin: "0 0 24px" },
  prose: { fontSize: 14, lineHeight: 1.7, color: "#C7CEDB" },
};
