/**
 * Persist lobbies + sessions across restarts / Vercel cold starts.
 *
 * Backends (auto):
 * 1. Upstash Redis REST — if UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 * 2. Local JSON files — default off-Vercel (DATA_DIR or apps/server/.data/persist)
 * 3. Memory-only — Vercel without Upstash (warn once)
 */

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DIR = path.resolve(__dirname, "../../.data/persist");

const SESSION_TTL_SEC = Number(process.env.DND_SESSION_TTL_SEC || 60 * 60 * 24 * 14); // 14 days
const LOBBY_TTL_SEC = Number(process.env.DND_LOBBY_TTL_SEC || 60 * 60 * 24 * 14);

function backendName() {
  if (
    (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) ||
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
  ) {
    return "upstash";
  }
  if (process.env.VERCEL) return "memory";
  return "file";
}

function upstashCredentials() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return { url, token };
}

let warnedMemory = false;

function warnMemoryOnce() {
  if (warnedMemory) return;
  warnedMemory = true;
  console.warn(
    "[lobby-persist] Vercel without Upstash/KV: state is in-memory only and will reset on cold start. Connect Upstash or set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (or KV_REST_API_URL + KV_REST_API_TOKEN)."
  );
}

/* ---------------- Upstash REST ---------------- */

async function upstash(command) {
  const { url, token } = upstashCredentials();
  if (!url || !token) throw new Error("Upstash credentials missing");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(command)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upstash ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.result;
}

const upstashStore = {
  async saveSession(token, session) {
    await upstash(["SET", `dnd:session:${token}`, JSON.stringify(session), "EX", String(SESSION_TTL_SEC)]);
  },
  async loadSession(token) {
    const raw = await upstash(["GET", `dnd:session:${token}`]);
    if (!raw) return null;
    try {
      return typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      return null;
    }
  },
  async saveLobby(lobby) {
    await upstash(["SET", `dnd:lobby:${lobby.id}`, JSON.stringify(lobby), "EX", String(LOBBY_TTL_SEC)]);
    if (lobby.isOpen) {
      await upstash(["SADD", "dnd:openLobbies", lobby.id]);
    } else {
      await upstash(["SREM", "dnd:openLobbies", lobby.id]);
    }
  },
  async loadLobby(lobbyId) {
    const raw = await upstash(["GET", `dnd:lobby:${lobbyId}`]);
    if (!raw) return null;
    try {
      return typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      return null;
    }
  },
  async listOpenLobbyIds() {
    const ids = await upstash(["SMEMBERS", "dnd:openLobbies"]);
    return Array.isArray(ids) ? ids.map(String) : [];
  }
};

/* ---------------- File ---------------- */

function filePaths(root) {
  return {
    root,
    sessions: path.join(root, "sessions"),
    lobbies: path.join(root, "lobbies"),
    index: path.join(root, "index.json")
  };
}

async function ensureFileDirs(paths) {
  await mkdir(paths.sessions, { recursive: true });
  await mkdir(paths.lobbies, { recursive: true });
}

async function readIndex(paths) {
  try {
    return JSON.parse(await readFile(paths.index, "utf8"));
  } catch {
    return { openLobbyIds: [] };
  }
}

async function writeIndex(paths, index) {
  await writeFile(paths.index, JSON.stringify(index, null, 2), "utf8");
}

function createFileStore(dataDir) {
  const paths = filePaths(dataDir);
  let ready = null;
  const ensure = () => {
    if (!ready) ready = ensureFileDirs(paths);
    return ready;
  };

  return {
    async saveSession(token, session) {
      await ensure();
      const safe = token.replace(/[^a-zA-Z0-9._-]/g, "_");
      await writeFile(path.join(paths.sessions, `${safe}.json`), JSON.stringify(session), "utf8");
    },
    async loadSession(token) {
      await ensure();
      const safe = token.replace(/[^a-zA-Z0-9._-]/g, "_");
      try {
        return JSON.parse(await readFile(path.join(paths.sessions, `${safe}.json`), "utf8"));
      } catch {
        return null;
      }
    },
    async saveLobby(lobby) {
      await ensure();
      const safe = String(lobby.id).replace(/[^a-zA-Z0-9._-]/g, "_");
      await writeFile(path.join(paths.lobbies, `${safe}.json`), JSON.stringify(lobby), "utf8");
      const index = await readIndex(paths);
      const set = new Set(index.openLobbyIds || []);
      if (lobby.isOpen) set.add(lobby.id);
      else set.delete(lobby.id);
      index.openLobbyIds = [...set];
      await writeIndex(paths, index);
    },
    async loadLobby(lobbyId) {
      await ensure();
      const safe = String(lobbyId).replace(/[^a-zA-Z0-9._-]/g, "_");
      try {
        return JSON.parse(await readFile(path.join(paths.lobbies, `${safe}.json`), "utf8"));
      } catch {
        return null;
      }
    },
    async listOpenLobbyIds() {
      await ensure();
      const index = await readIndex(paths);
      return Array.isArray(index.openLobbyIds) ? index.openLobbyIds : [];
    },
    async loadAllLobbiesInto(map) {
      await ensure();
      let files = [];
      try {
        files = await readdir(paths.lobbies);
      } catch {
        return 0;
      }
      let n = 0;
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        try {
          const lobby = JSON.parse(await readFile(path.join(paths.lobbies, file), "utf8"));
          if (lobby?.id) {
            map.set(lobby.id, lobby);
            n += 1;
          }
        } catch {
          /* skip */
        }
      }
      return n;
    }
  };
}

const memoryStore = {
  async saveSession() {},
  async loadSession() {
    return null;
  },
  async saveLobby() {},
  async loadLobby() {
    return null;
  },
  async listOpenLobbyIds() {
    return [];
  }
};

function createStore() {
  const kind = backendName();
  if (kind === "upstash") {
    console.log("[lobby-persist] backend=upstash");
    return upstashStore;
  }
  if (kind === "file") {
    const dir = process.env.DND_DATA_DIR || DEFAULT_DIR;
    console.log(`[lobby-persist] backend=file dir=${dir}`);
    return createFileStore(dir);
  }
  warnMemoryOnce();
  return memoryStore;
}

const store = createStore();

const pendingLobbySaves = new Map();
const DEBOUNCE_MS = 250;

export function getPersistBackend() {
  return backendName();
}

export async function persistSession(token, session) {
  if (!token || !session) return;
  try {
    await store.saveSession(token, session);
  } catch (error) {
    console.warn("[lobby-persist] saveSession failed:", error.message || error);
  }
}

export async function persistLobbyNow(lobby) {
  if (!lobby?.id) return;
  try {
    await store.saveLobby(lobby);
  } catch (error) {
    console.warn("[lobby-persist] saveLobby failed:", error.message || error);
  }
}

/** Debounced lobby save (safe for high-frequency map paints). */
export function schedulePersistLobby(lobby) {
  if (!lobby?.id) return;
  const id = lobby.id;
  const prev = pendingLobbySaves.get(id);
  if (prev) clearTimeout(prev);
  pendingLobbySaves.set(
    id,
    setTimeout(() => {
      pendingLobbySaves.delete(id);
      persistLobbyNow(lobby);
    }, DEBOUNCE_MS)
  );
}

export async function loadSession(token) {
  if (!token) return null;
  try {
    return await store.loadSession(token);
  } catch (error) {
    console.warn("[lobby-persist] loadSession failed:", error.message || error);
    return null;
  }
}

export async function loadLobby(lobbyId) {
  if (!lobbyId) return null;
  try {
    return await store.loadLobby(lobbyId);
  } catch (error) {
    console.warn("[lobby-persist] loadLobby failed:", error.message || error);
    return null;
  }
}

export async function loadOpenLobbies(lobbiesMap) {
  try {
    const ids = await store.listOpenLobbyIds();
    for (const id of ids) {
      if (lobbiesMap.has(id)) continue;
      const lobby = await store.loadLobby(id);
      if (lobby?.id) lobbiesMap.set(lobby.id, lobby);
    }
    if (typeof store.loadAllLobbiesInto === "function" && backendName() === "file") {
      // file: also hydrate closed lobbies so master restore still works by token
      await store.loadAllLobbiesInto(lobbiesMap);
    }
  } catch (error) {
    console.warn("[lobby-persist] loadOpenLobbies failed:", error.message || error);
  }
}

/**
 * Ensure session (+lobby) are in memory Maps for this request.
 * @param {string|null} token
 * @param {Map} sessions
 * @param {Map} lobbies
 */
export async function hydrateSession(token, sessions, lobbies) {
  if (!token) return null;
  let session = sessions.get(String(token)) ?? null;
  if (!session) {
    session = await loadSession(token);
    if (!session) return null;
    sessions.set(String(token), session);
  }
  if (session.lobbyId && !lobbies.has(session.lobbyId)) {
    const lobby = await loadLobby(session.lobbyId);
    if (lobby) lobbies.set(lobby.id, lobby);
  }
  return session;
}
