/** Единый вход: игрок (по названию лобби) или мастер (создать лобби) */

const MASTER_SESSION_KEY = "dnd_master_session";
const PLAYER_SESSION_KEY = "dnd_player_session";

const ui = {
  rolePlayerBtn: document.getElementById("rolePlayerBtn"),
  roleMasterBtn: document.getElementById("roleMasterBtn"),
  formPlayer: document.getElementById("formPlayer"),
  formMaster: document.getElementById("formMaster"),
  playerName: document.getElementById("playerName"),
  playerLobbyTitle: document.getElementById("playerLobbyTitle"),
  masterName: document.getElementById("masterName"),
  masterLobbyTitle: document.getElementById("masterLobbyTitle"),
  playerEnterBtn: document.getElementById("playerEnterBtn"),
  masterEnterBtn: document.getElementById("masterEnterBtn"),
  loginError: document.getElementById("loginError")
};

let role = "player";

function setRole(next) {
  role = next === "master" ? "master" : "player";
  ui.rolePlayerBtn?.classList.toggle("active", role === "player");
  ui.roleMasterBtn?.classList.toggle("active", role === "master");
  ui.formPlayer?.classList.toggle("hidden", role !== "player");
  ui.formMaster?.classList.toggle("hidden", role !== "master");
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
    location.href = "/master";
  } catch (error) {
    ui.loginError.textContent = String(error.message || error);
  } finally {
    ui.masterEnterBtn.disabled = false;
  }
}

ui.rolePlayerBtn?.addEventListener("click", () => setRole("player"));
ui.roleMasterBtn?.addEventListener("click", () => setRole("master"));
ui.playerEnterBtn?.addEventListener("click", enterAsPlayer);
ui.masterEnterBtn?.addEventListener("click", enterAsMaster);

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

setRole("player");
