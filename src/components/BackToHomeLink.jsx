import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";

// Small fixed-position back arrow — used on the auth pages (back to the
// landing page) and the account page (back to the dashboard). Mirrors
// LogoutButton/UserMenu's placement pattern.
export default function BackToHomeLink({ href = "/", label = "Back" }) {
  return (
    <Link href={href} style={styles.link} aria-label={label}>
      <ArrowLeft size={18} />
    </Link>
  );
}

const styles = {
  link: {
    position: "fixed",
    top: 16,
    left: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 34,
    height: 34,
    borderRadius: 8,
    border: "1px solid #2A3B5C",
    background: "#111A2C",
    color: "#B9C2D0",
    textDecoration: "none",
    zIndex: 1000,
  },
};
