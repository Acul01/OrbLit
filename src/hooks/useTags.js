"use client";

import { useState, useEffect } from "react";
import { TAG_PALETTE } from "@/lib/citation-graph";

// TODO(phase 7): tags/paperTags currently persist to localStorage. This
// hook is the seam where that gets swapped for the Supabase `projects`
// table — call sites elsewhere only see { tags, paperTags, createTag,
// deleteTag, assignTagToSelected }, so the storage swap stays contained
// here.
function loadStoredTags() {
  try {
    const raw = localStorage.getItem("orblit-tags");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadStoredPaperTags() {
  try {
    const raw = localStorage.getItem("orblit-paper-tags");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Tag CRUD + persistence. Node coloring (nodesRef[i].tagId) and re-selecting
 * the currently-open node after a tag change stay in OrbLitApp, since both
 * touch the D3 node refs and simulation tick that this hook doesn't own.
 */
export function useTags() {
  const [tags, setTags] = useState(loadStoredTags);
  const [paperTags, setPaperTags] = useState(loadStoredPaperTags);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_PALETTE[0]);
  const [tagError, setTagError] = useState("");

  useEffect(() => {
    localStorage.setItem("orblit-tags", JSON.stringify(tags));
  }, [tags]);

  useEffect(() => {
    localStorage.setItem("orblit-paper-tags", JSON.stringify(paperTags));
  }, [paperTags]);

  function createTag() {
    const name = newTagName.trim();
    if (!name) return;
    if (tags.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      setTagError("A tag with that name already exists.");
      setTimeout(() => setTagError(""), 3000);
      return;
    }
    const tag = { id: `tag-${Date.now()}`, name, color: newTagColor };
    setTags((prev) => [...prev, tag]);
    setNewTagName("");
    setNewTagColor(TAG_PALETTE[(tags.length + 1) % TAG_PALETTE.length]);
  }

  function deleteTag(tagId) {
    setTags((prev) => prev.filter((t) => t.id !== tagId));
    setPaperTags((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((paperId) => {
        if (next[paperId] === tagId) delete next[paperId];
      });
      return next;
    });
  }

  function assignTag(paperId, tagId) {
    setPaperTags((prev) => {
      const next = { ...prev };
      if (!tagId) delete next[paperId];
      else next[paperId] = tagId;
      return next;
    });
  }

  return {
    tags,
    setTags,
    paperTags,
    setPaperTags,
    newTagName,
    setNewTagName,
    newTagColor,
    setNewTagColor,
    tagError,
    createTag,
    deleteTag,
    assignTag,
  };
}
