"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const AUTOSAVE_DEBOUNCE_MS = 2000;

/**
 * Persistence for saved maps. On orblit.io this is the Supabase
 * "projects" table. With ORBLIT_MODE=local the same functions read and
 * write JSON files through /api/local/projects.
 * Multiple maps per user are supported — the projects panel in OrbLitApp
 * lists them, and the component owns which one is "active" (this hook is
 * deliberately stateless about that beyond the ref scheduleSave() reads,
 * to avoid two places racing to track the same thing).
 *
 * - listProjects/getProjectData/createProject/deleteProject/renameProject:
 *   thin CRUD wrappers. On the hosted app they are RLS-scoped via the
 *   browser client.
 * - setActiveProjectId + scheduleSave: the debounced-autosave seam —
 *   the payload is only *built* when the debounce timer fires, so
 *   scheduleSave is cheap to call from a high-frequency effect.
 */
export function useProject(localMode = false) {
  const [status, setStatus] = useState("loading"); // "loading" | "ready" | "error"
  const [saveStatus, setSaveStatus] = useState("idle"); // "idle" | "saving" | "saved" | "error"
  const userIdRef = useRef(null);
  const activeIdRef = useRef(null);
  const saveTimerRef = useRef(null);
  const [supabase] = useState(() => (localMode ? null : createClient()));

  useEffect(() => {
    if (localMode) {
      setStatus("ready");
      return;
    }
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      userIdRef.current = user.id;
      setStatus("ready");
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `supabase` is a
    // stable useState singleton, not a changing dependency
  }, [localMode]);

  async function listProjects() {
    if (localMode) {
      const res = await fetch("/api/local/projects");
      if (!res.ok) return [];
      return res.json();
    }
    if (!userIdRef.current) return [];
    const { data } = await supabase
      .from("projects")
      .select("id, name, updated_at")
      .eq("user_id", userIdRef.current)
      .order("updated_at", { ascending: false });
    return data || [];
  }

  async function getProjectData(id) {
    if (localMode) {
      const res = await fetch(`/api/local/projects/${id}`);
      if (!res.ok) return null;
      return res.json();
    }
    const { data } = await supabase.from("projects").select("data").eq("id", id).maybeSingle();
    return data?.data || null;
  }

  async function createProject(name = "Untitled Map") {
    if (localMode) {
      const res = await fetch("/api/local/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) return null;
      return res.json();
    }
    const { data } = await supabase
      .from("projects")
      .insert({ user_id: userIdRef.current, name, data: {} })
      .select("id, name, updated_at")
      .single();
    return data;
  }

  async function deleteProject(id) {
    if (localMode) {
      await fetch(`/api/local/projects/${id}`, { method: "DELETE" });
      return;
    }
    await supabase.from("projects").delete().eq("id", id);
  }

  async function renameProject(id, name) {
    if (localMode) {
      await fetch(`/api/local/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      return;
    }
    await supabase.from("projects").update({ name }).eq("id", id);
  }

  function setActiveProjectId(id) {
    activeIdRef.current = id;
  }

  function scheduleSave(buildPayloadFn) {
    if (!activeIdRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const id = activeIdRef.current;
    saveTimerRef.current = setTimeout(async () => {
      setSaveStatus("saving");
      if (localMode) {
        const res = await fetch(`/api/local/projects/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: buildPayloadFn() }),
        });
        setSaveStatus(res.ok ? "saved" : "error");
        return;
      }
      const { error } = await supabase
        .from("projects")
        .update({ data: buildPayloadFn() })
        .eq("id", id);
      setSaveStatus(error ? "error" : "saved");
    }, AUTOSAVE_DEBOUNCE_MS);
  }

  /** Immediately commits any pending debounced save (and cancels its
   *  timer) — call before switching the active project so a recent edit
   *  within the last debounce window isn't lost when scheduleSave's next
   *  call reassigns the shared timer to a different project id. */
  async function flushSave(buildPayloadFn) {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (!activeIdRef.current) return;
    setSaveStatus("saving");
    if (localMode) {
      const res = await fetch(`/api/local/projects/${activeIdRef.current}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: buildPayloadFn() }),
      });
      setSaveStatus(res.ok ? "saved" : "error");
      return;
    }
    const { error } = await supabase
      .from("projects")
      .update({ data: buildPayloadFn() })
      .eq("id", activeIdRef.current);
    setSaveStatus(error ? "error" : "saved");
  }

  return {
    status,
    saveStatus,
    listProjects,
    getProjectData,
    createProject,
    deleteProject,
    renameProject,
    setActiveProjectId,
    scheduleSave,
    flushSave,
  };
}
