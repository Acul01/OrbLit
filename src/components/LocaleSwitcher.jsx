"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

const LABELS = { en: "EN", de: "DE" };

// Shows only the active locale as a small button. Clicking it reveals
// the other language(s) as an option below; picking one switches and
// closes. Clicking outside (or the active button again) closes without
// switching. Uses next-intl's locale-aware router so switching preserves
// the current page.
export default function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function switchTo(next) {
    setOpen(false);
    router.replace(pathname, { locale: next });
  }

  const others = Object.keys(LABELS).filter((l) => l !== locale);

  return (
    <div ref={wrapRef} style={styles.wrap}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Change language"
        aria-expanded={open}
        style={styles.active}
      >
        {LABELS[locale]}
      </button>
      {open && (
        <div style={styles.dropdown}>
          {others.map((l) => (
            <button key={l} onClick={() => switchTo(l)} style={styles.option}>
              {LABELS[l]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  wrap: { position: "relative" },
  active: {
    padding: "5px 10px",
    borderRadius: 999,
    border: "1px solid #2c3b5a",
    background: "#0B1220",
    color: "#E8E6DE",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
  },
  dropdown: {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    background: "#111A2C",
    border: "1px solid #24314C",
    borderRadius: 8,
    padding: 4,
    boxShadow: "0 12px 30px rgba(0,0,0,0.4)",
    zIndex: 10,
  },
  option: {
    display: "block",
    width: "100%",
    padding: "5px 10px",
    borderRadius: 6,
    border: "none",
    background: "transparent",
    color: "#B9C2D0",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
    textAlign: "left",
  },
};
