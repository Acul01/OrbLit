"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

export default function DeleteAccountButton() {
  const t = useTranslations("account");
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function remove() {
    setBusy(true);
    setError(false);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) throw new Error("delete failed");
      router.push("/");
      router.refresh();
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} style={styles.danger}>
        {t("delete")}
      </button>
    );
  }

  return (
    <div style={styles.confirm}>
      <p style={styles.confirmText}>{t("deleteConfirm")}</p>
      <button type="button" onClick={remove} disabled={busy} style={styles.danger}>
        {busy ? t("deleting") : t("deleteYes")}
      </button>
      <button type="button" onClick={() => setConfirming(false)} disabled={busy} style={styles.cancel}>
        {t("deleteNo")}
      </button>
      {error && <p style={styles.error}>{t("deleteError")}</p>}
    </div>
  );
}

const styles = {
  confirm: { display: "flex", flexDirection: "column", gap: 8 },
  confirmText: { margin: 0, fontSize: 13, color: "#E8E6DE", lineHeight: 1.4 },
  danger: {
    marginTop: 6,
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid #8C3A3A",
    background: "transparent",
    color: "#E7B4B4",
    cursor: "pointer",
    width: "100%",
  },
  cancel: {
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid #2A3B5C",
    background: "transparent",
    color: "#B9C2D0",
    cursor: "pointer",
    width: "100%",
  },
  error: { margin: 0, fontSize: 13, color: "#E7B4B4" },
};
