import { renderInitiativeBar } from "/initiative-bar.js?v=4";

const SESSION_KEY = "dnd_spectator_session";

const ui = {
  gate: document.getElementById("spectatorGate"),
  app: document.getElementById("spectatorApp"),
  lobbyTitle: document.getElementById("spectatorLobbyTitle"),
  mapMeta: document.getElementById("spectatorMapMeta"),
  initiativeBar: document.getElementById("spectatorInitiativeBar"),
  mapWrap: document.getElementById("spectatorMapWrap"),
  mapGrid: document.getElementById("spectatorMapGrid"),
  combatLog: document.getElementById("spectatorCombatLog")
};

const state = {
  token: localStorage.getItem(SESSION_KEY) || "",
  vision: null,
  mapFitCols: 0,
  mapFitRows: 0,
  lobbyTitle: ""
};

const TILE_ICONS = {
  wall: "🧱",
  brick: "🟫",
  metal: "⬛",
  column: "▮",
  window: "🪟",
  glass: "🔷",
  door: "🚪",
  door_open: "🔓",
  stairs: "📶",
  rail: "═",
  platform: "▭",
  coupler: "⛓",
  cargo: "🧳",
  floor: "·",
  stone: "⬜",
  grass: "🌿",
  water: "💧",
  rubble: "🪨",
  mist: "☁",
  table: "▤",
  chair: "🪑",
  bench: "🪑",
  bed: "🛏",
  crate: "🗃",
  barrel: "🛢",
  conductor: "⚡",
  rune: "✦",
  crystal: "💎"
};
const OVERLAY_ICONS = { chest: "📦", stash: "✦" };

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function call(path, opts = {}) {
  const headers = {
    "Content-Type": "application/json",
    "X-Session-Token": state.token || ""
  };
  const res = await fetch(path, { ...opts, headers });
  if (!res.ok) {
    let msg = await res.text();
    try {
      msg = JSON.parse(msg).error ?? msg;
    } catch {
      /* keep */
    }
    throw new Error(msg || `${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function fitMapCellSize(wrapEl, cols, rows) {
  const pad = 8;
  const w = Math.max(120, (wrapEl.clientWidth || 800) - pad);
  const h = Math.max(120, (wrapEl.clientHeight || 600) - pad);
  const byW = Math.floor(w / Math.max(1, cols));
  const byH = Math.floor(h / Math.max(1, rows));
  return Math.max(6, Math.min(byW, byH, 48));
}

function applyMapFit(wrapEl, gridEl, cols, rows) {
  if (!wrapEl || !gridEl) return;
  const size = fitMapCellSize(wrapEl, cols, rows);
  wrapEl.style.setProperty("--map-cell-size", `${size}px`);
  gridEl.style.gridTemplateColumns = `repeat(${cols}, ${size}px)`;
  wrapEl.classList.toggle("map-compact", size < 11);
  return size;
}

let mapFitObserver = null;
function ensureMapFitObserver() {
  if (!ui.mapWrap || mapFitObserver) return;
  mapFitObserver = new ResizeObserver(() => {
    if (!state.mapFitCols || !state.mapFitRows) return;
    applyMapFit(ui.mapWrap, ui.mapGrid, state.mapFitCols, state.mapFitRows);
  });
  mapFitObserver.observe(ui.mapWrap);
}

function fillMapGrid(width, height) {
  if (!ui.mapGrid) return;
  const visible = new Set((state.vision?.visibleCells || []).map((c) => `${c.x}:${c.y}`));
  const tiles = state.vision?.tiles || {};
  const overlays = state.vision?.overlays || {};
  const tokenMap = new Map();
  for (const t of state.vision?.tokens || []) {
    tokenMap.set(`${t.position.x}:${t.position.y}`, t);
  }

  ui.mapGrid.innerHTML = "";
  ui.mapGrid.style.gridTemplateColumns = `repeat(${width}, var(--map-cell-size))`;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const cellKey = `${x}:${y}`;
      const isVisible = visible.has(cellKey);
      const tileId = tiles[cellKey];
      const overlay = overlays[cellKey];
      const cell = document.createElement("div");
      const classes = ["cell"];
      if (isVisible) classes.push("visible");
      if (isVisible && tileId) classes.push(`tex-${tileId}`);
      cell.className = classes.join(" ");

      if (isVisible && tileId && TILE_ICONS[tileId]) {
        const label = document.createElement("span");
        label.className = "tile-label";
        label.textContent = TILE_ICONS[tileId];
        cell.appendChild(label);
      }

      if (isVisible && overlay) {
        const mark = document.createElement("span");
        mark.className = `overlay-mark ${overlay.type}`;
        mark.textContent = OVERLAY_ICONS[overlay.type] ?? "✦";
        cell.appendChild(mark);
      }

      if (isVisible && tokenMap.has(cellKey)) {
        const t = tokenMap.get(cellKey);
        const token = document.createElement("div");
        token.className = `token ${t.type || "npc"}`;
        if (t.portraitUrl) {
          token.classList.add("has-portrait");
          token.style.backgroundImage = `url("${t.portraitUrl}")`;
          token.innerHTML = `<span class="token-name-tag">${escapeHtml(String(t.name || "").slice(0, 10))}</span>`;
        } else {
          token.textContent = String(t.name || "?").slice(0, 2).toUpperCase();
        }
        if (t.hpCurrent != null && t.hpMax != null) {
          token.title = `${t.name} · ${t.hpCurrent}/${t.hpMax}`;
        } else {
          token.title = t.name || "";
        }
        cell.appendChild(token);
      }

      ui.mapGrid.appendChild(cell);
    }
  }
}

function renderMap() {
  const width = Number(state.vision?.width) || 20;
  const height = Number(state.vision?.height) || 15;
  state.mapFitCols = width;
  state.mapFitRows = height;
  fillMapGrid(width, height);
  ensureMapFitObserver();
  applyMapFit(ui.mapWrap, ui.mapGrid, width, height);
}

function renderInitiative() {
  renderInitiativeBar(ui.initiativeBar, state.vision?.combat || null, {
    animate: true,
    onOpenSheet: null
  });
}

function renderCombatLog() {
  if (!ui.combatLog) return;
  const entries = state.vision?.combatLog || [];
  ui.combatLog.innerHTML = "";
  if (!entries.length) {
    ui.combatLog.innerHTML = `<div class="muted spectator-log-empty">Пока пусто — броски появятся здесь</div>`;
    return;
  }
  for (const log of entries.slice(0, 24)) {
    const row = document.createElement("div");
    if (log.type === "roll") {
      row.className = "card combat-log-roll spectator-log-card";
      const who = log.actorName || log.rollerName || "—";
      row.innerHTML = `<strong>${escapeHtml(who)}</strong> · ${escapeHtml(log.label || "бросок")}
        <div class="mono spectator-log-detail">${escapeHtml(log.detail || "")}</div>`;
    } else {
      row.className = "card combat-log-hp spectator-log-card";
      const delta = Number(log.delta) || 0;
      const sign = delta > 0 ? "+" : "";
      const name = log.tokenName || "Токен";
      const hp =
        log.hpCurrent != null && log.hpMax != null ? ` · ${log.hpCurrent}/${log.hpMax}` : "";
      row.innerHTML = `<strong>${escapeHtml(name)}</strong> <span class="mono">${sign}${delta}</span> ХП${escapeHtml(
        hp
      )}
        <div class="muted">${escapeHtml(log.reason || (delta < 0 ? "урон" : "лечение"))}</div>`;
    }
    ui.combatLog.appendChild(row);
  }
}

function renderMeta() {
  const name = state.vision?.mapName || "—";
  const publishedFollow =
    state.vision?.mapId && state.vision?.activeMapId && state.vision.mapId === state.vision.activeMapId
      ? "· следует за мастером"
      : "· карта для игроков";
  if (ui.mapMeta) {
    ui.mapMeta.textContent = `${name} ${publishedFollow}`;
  }
  if (ui.lobbyTitle) {
    ui.lobbyTitle.textContent = state.lobbyTitle || "сессия";
  }
}

async function refreshVision() {
  const data = await call("/map/vision");
  state.vision = data;
  renderMeta();
  renderInitiative();
  renderCombatLog();
  renderMap();
}

function showApp() {
  ui.gate?.classList.add("hidden");
  ui.app?.classList.remove("hidden");
}

function showGate() {
  ui.gate?.classList.remove("hidden");
  ui.app?.classList.add("hidden");
}

async function bootstrap() {
  if (!state.token) {
    showGate();
    return;
  }
  try {
    const session = await call("/auth/session");
    if (session.role !== "spectator" || !session.lobby) {
      localStorage.removeItem(SESSION_KEY);
      state.token = "";
      showGate();
      return;
    }
    state.lobbyTitle = session.lobby?.title || "";
    showApp();
    await refreshVision();
    setInterval(() => {
      refreshVision().catch((err) => {
        if (ui.mapMeta) ui.mapMeta.textContent = `Ошибка: ${String(err.message || err)}`;
      });
    }, 2000);
  } catch (error) {
    console.error(error);
    localStorage.removeItem(SESSION_KEY);
    state.token = "";
    showGate();
  }
}

bootstrap();
