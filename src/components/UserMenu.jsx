"use client";

import { useEffect, useRef, useState } from "react";
import { User, LogOut } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

/** Fixed top-right user menu. Opens a small dropdown with the account
 *  page and logout. */
export default function UserMenu() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const menuRef = useRef(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email || "");
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const initial = email ? email[0].toUpperCase() : <User size={15} />;

  return (
    <div ref={menuRef} style={styles.wrap}>
      <button onClick={() => setOpen((o) => !o)} style={styles.avatarButton} aria-label="Account menu">
        {initial}
      </button>
      {open && (
        <div style={styles.dropdown}>
          {email && <div style={styles.email}>{email}</div>}
          <Link href="/account" style={styles.item} onClick={() => setOpen(false)}>
            <User size={14} /> Account
          </Link>
          <form action="/logout" method="post">
            <button type="submit" style={{ ...styles.item, ...styles.itemButton }}>
              <LogOut size={14} /> Log out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrap: { position: "relative" },
  avatarButton: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    border: "1px solid #2A3B5C",
    background: "#111A2C",
    color: "#E8E6DE",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  dropdown: {
    position: "absolute",
    top: 40,
    right: 0,
    width: 220,
    background: "#111A2C",
    border: "1px solid #24314C",
    borderRadius: 8,
    padding: 6,
    boxShadow: "0 12px 30px rgba(0,0,0,0.4)",
    fontFamily: "ui-sans-serif, system-ui",
  },
  email: {
    padding: "8px 10px 6px",
    fontSize: 12,
    color: "#7C8AA3",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    borderBottom: "1px solid #1E2A42",
    marginBottom: 4,
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    padding: "8px 10px",
    borderRadius: 6,
    border: "none",
    background: "transparent",
    color: "#E8E6DE",
    fontSize: 13,
    textDecoration: "none",
    cursor: "pointer",
    boxSizing: "border-box",
  },
  itemButton: { textAlign: "left" },
};
