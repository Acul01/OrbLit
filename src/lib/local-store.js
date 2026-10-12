import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const root = path.join(process.cwd(), "data");
const projectsDir = path.join(root, "projects");
const zoteroFile = path.join(root, "zotero.json");
const mendeleyFile = path.join(root, "mendeley.json");

function assertId(id) {
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) {
    const error = new Error("Invalid id");
    error.status = 400;
    throw error;
  }
  return id;
}

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(value), { mode: 0o600 });
}

export async function listLocalProjects() {
  await fs.mkdir(projectsDir, { recursive: true });
  const names = await fs.readdir(projectsDir);
  const projects = [];
  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    const row = await readJson(path.join(projectsDir, name));
    if (!row?.id) continue;
    projects.push({ id: row.id, name: row.name || "Untitled Map", updated_at: row.updated_at || null });
  }
  projects.sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")));
  return projects;
}

export async function getLocalProjectData(id) {
  const row = await readJson(path.join(projectsDir, `${assertId(id)}.json`));
  return row?.data || null;
}

export async function createLocalProject(name = "Untitled Map") {
  const row = {
    id: crypto.randomUUID(),
    name: String(name || "Untitled Map").slice(0, 200),
    updated_at: new Date().toISOString(),
    data: {},
  };
  await writeJson(path.join(projectsDir, `${row.id}.json`), row);
  return { id: row.id, name: row.name, updated_at: row.updated_at };
}

export async function updateLocalProject(id, patch) {
  const file = path.join(projectsDir, `${assertId(id)}.json`);
  const row = await readJson(file);
  if (!row) return null;
  if (typeof patch.name === "string") row.name = patch.name.slice(0, 200) || row.name;
  if (patch.data && typeof patch.data === "object") row.data = patch.data;
  row.updated_at = new Date().toISOString();
  await writeJson(file, row);
  return { id: row.id, name: row.name, updated_at: row.updated_at };
}

export async function deleteLocalProject(id) {
  await fs.unlink(path.join(projectsDir, `${assertId(id)}.json`)).catch((error) => {
    if (error?.code !== "ENOENT") throw error;
  });
}

export async function readLocalZotero() {
  const file = await readJson(zoteroFile);
  if (file?.disconnected) return null;
  if (file?.zoteroUserId && file?.apiKey) {
    return { zoteroUserId: String(file.zoteroUserId), apiKey: String(file.apiKey) };
  }
  const zoteroUserId = process.env.ZOTERO_USER_ID?.trim();
  const apiKey = process.env.ZOTERO_API_KEY?.trim();
  if (zoteroUserId && apiKey) return { zoteroUserId, apiKey };
  return null;
}

export async function writeLocalZotero(zoteroUserId, apiKey) {
  await writeJson(zoteroFile, { zoteroUserId, apiKey });
}

export async function disconnectLocalZotero() {
  await writeJson(zoteroFile, { disconnected: true });
}

export async function readLocalMendeley() {
  const file = await readJson(mendeleyFile);
  if (!file?.refreshToken) return null;
  return {
    profileId: file.profileId || "",
    accessToken: file.accessToken || "",
    refreshToken: file.refreshToken,
    expiresAt: file.expiresAt || null,
  };
}

export async function writeLocalMendeley(value) {
  await writeJson(mendeleyFile, value);
}

export async function disconnectLocalMendeley() {
  await fs.unlink(mendeleyFile).catch((error) => {
    if (error?.code !== "ENOENT") throw error;
  });
}
