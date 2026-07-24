/** Единый вход: игрок / мастер / зритель (ТВ) */

const MASTER_SESSION_KEY = "dnd_master_session";
const PLAYER_SESSION_KEY = "dnd_player_session";
const SPECTATOR_SESSION_KEY = "dnd_spectator_session";

const ui = {
  rolePlayerBtn: document.getElementById("rolePlayerBtn"),
  roleMasterBtn: document.getElementById("roleMasterBtn"),
  roleSpectatorBtn: document.getElementById("roleSpectatorBtn"),
  formPlayer: document.getElementById("formPlayer"),
  formMaster: document.getElementById("formMaster"),
  formSpectator: document.getElementById("formSpectator"),
  playerName: document.getElementById("playerName"),
  playerLobbyTitle: document.getElementById("playerLobbyTitle"),
  masterName: document.getElementById("masterName"),
  masterLobbyTitle: document.getElementById("masterLobbyTitle"),
  spectatorName: document.getElementById("spectatorName"),
  spectatorLobbyTitle: document.getElementById("spectatorLobbyTitle"),
  playerEnterBtn: document.getElementById("playerEnterBtn"),
  masterEnterBtn: document.getElementById("masterEnterBtn"),
  spectatorEnterBtn: document.getElementById("spectatorEnterBtn"),
  loginError: document.getElementById("loginError"),
  loginHint: document.getElementById("loginHint")
};

let role = "player";

const HINTS = {
  player: "Игрок вводит то же название лобби, которое указал мастер. Мастер создаёт открытую сессию.",
  master: "Мастер создаёт открытое лобби. Игроки и зритель подключаются по этому названию.",
  spectator: "Зритель — экран для ТВ: карта, инициатива, журнал. Карта следует за мастером, если она опубликована."
};

function setRole(next) {
  role = next === "master" ? "master" : next === "spectator" ? "spectator" : "player";
  ui.rolePlayerBtn?.classList.toggle("active", role === "player");
  ui.roleMasterBtn?.classList.toggle("active", role === "master");
  ui.roleSpectatorBtn?.classList.toggle("active", role === "spectator");
  ui.formPlayer?.classList.toggle("hidden", role !== "player");
  ui.formMaster?.classList.toggle("hidden", role !== "master");
  ui.formSpectator?.classList.toggle("hidden", role !== "spectator");
  if (ui.loginHint) ui.loginHint.textContent = HINTS[role] || HINTS.player;
  ui.loginError.textContent = "";
}

async function api(path, { method = "GET", body, token } = {}) {
  const headers = {
    "Content-Type": "application/json",
    "X-Session-Token": token || ""
  };
  const res = await fetch(path, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    let msg = await res.text();
    try {
      msg = JSON.parse(msg).error ?? msg;
    } catch {
      /* keep */
    }
    throw new Error(msg || `${res.status}`);
  }
  return res.json();
}

async function enterAsPlayer() {
  ui.loginError.textContent = "";
  const playerName = String(ui.playerName?.value || "").trim();
  const lobbyTitle = String(ui.playerLobbyTitle?.value || "").trim();
  if (!playerName) {
    ui.loginError.textContent = "Введите имя игрока";
    return;
  }
  if (!lobbyTitle) {
    ui.loginError.textContent = "Введите название лобби мастера";
    return;
  }
  ui.playerEnterBtn.disabled = true;
  try {
    const auth = await api("/auth/player/login", {
      method: "POST",
      body: { playerName }
    });
    await api("/lobbies/join-by-title", {
      method: "POST",
      token: auth.token,
      body: { lobbyTitle }
    });
    localStorage.setItem(PLAYER_SESSION_KEY, auth.token);
    localStorage.removeItem(MASTER_SESSION_KEY);
    localStorage.removeItem(SPECTATOR_SESSION_KEY);
    location.href = "/player";
  } catch (error) {
    let msg = String(error.message || error);
    try {
      const open = await api("/lobbies/open");
      if (Array.isArray(open) && open.length) {
        const list = open.map((l) => `«${l.title}»`).join(", ");
        if (!/открыты:/i.test(msg)) msg += ` Открыты сейчас: ${list}.`;
      }
    } catch {
      /* ignore */
    }
    ui.loginError.textContent = msg;
  } finally {
    ui.playerEnterBtn.disabled = false;
  }
}

async function enterAsMaster() {
  ui.loginError.textContent = "";
  const masterName = String(ui.masterName?.value || "").trim();
  const lobbyTitle = String(ui.masterLobbyTitle?.value || "").trim();
  if (!masterName || !lobbyTitle) {
    ui.loginError.textContent = "Укажите имя мастера и название лобби";
    return;
  }
  ui.masterEnterBtn.disabled = true;
  try {
    const data = await api("/auth/master/login", {
      method: "POST",
      body: { masterName, lobbyTitle }
    });
    localStorage.setItem(MASTER_SESSION_KEY, data.token);
    localStorage.removeItem(PLAYER_SESSION_KEY);
    localStorage.removeItem(SPECTATOR_SESSION_KEY);
    location.href = "/master";
  } catch (error) {
    ui.loginError.textContent = String(error.message || error);
  } finally {
    ui.masterEnterBtn.disabled = false;
  }
}

async function enterAsSpectator() {
  ui.loginError.textContent = "";
  const spectatorName = String(ui.spectatorName?.value || "ТВ").trim() || "ТВ";
  const lobbyTitle = String(ui.spectatorLobbyTitle?.value || "").trim();
  if (!lobbyTitle) {
    ui.loginError.textContent = "Введите название лобби мастера";
    return;
  }
  ui.spectatorEnterBtn.disabled = true;
  try {
    const auth = await api("/auth/spectator/login", {
      method: "POST",
      body: { spectatorName }
    });
    await api("/lobbies/join-by-title", {
      method: "POST",
      token: auth.token,
      body: { lobbyTitle }
    });
    localStorage.setItem(SPECTATOR_SESSION_KEY, auth.token);
    localStorage.removeItem(MASTER_SESSION_KEY);
    localStorage.removeItem(PLAYER_SESSION_KEY);
    location.href = "/spectator";
  } catch (error) {
    let msg = String(error.message || error);
    try {
      const open = await api("/lobbies/open");
      if (Array.isArray(open) && open.length) {
        const list = open.map((l) => `«${l.title}»`).join(", ");
        if (!/открыты:/i.test(msg)) msg += ` Открыты сейчас: ${list}.`;
      }
    } catch {
      /* ignore */
    }
    ui.loginError.textContent = msg;
  } finally {
    ui.spectatorEnterBtn.disabled = false;
  }
}

ui.rolePlayerBtn?.addEventListener("click", () => setRole("player"));
ui.roleMasterBtn?.addEventListener("click", () => setRole("master"));
ui.roleSpectatorBtn?.addEventListener("click", () => setRole("spectator"));
ui.playerEnterBtn?.addEventListener("click", enterAsPlayer);
ui.masterEnterBtn?.addEventListener("click", enterAsMaster);
ui.spectatorEnterBtn?.addEventListener("click", enterAsSpectator);

for (const el of [ui.playerName, ui.playerLobbyTitle]) {
  el?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") enterAsPlayer();
  });
}
for (const el of [ui.masterName, ui.masterLobbyTitle]) {
  el?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") enterAsMaster();
  });
}
for (const el of [ui.spectatorName, ui.spectatorLobbyTitle]) {
  el?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") enterAsSpectator();
  });
}

setRole("player");
