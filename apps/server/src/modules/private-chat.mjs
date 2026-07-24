/** Private whisper chat: master ↔ one player (text + dice). Not in public combatLog. */

export const CHAT_DICE = [4, 6, 8, 10, 12, 20];
const MAX_MESSAGES = 120;

function randomId(prefix = "chat") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function ensurePrivateChats(game) {
  if (!game.privateChats || typeof game.privateChats !== "object") {
    game.privateChats = {};
  }
  return game.privateChats;
}

function playerMembers(lobby) {
  return (lobby?.members || []).filter((m) => m.role === "player");
}

function characterNameForMember(game, member) {
  if (!member?.characterId) return null;
  const ch = (game.characters || []).find((c) => c.id === member.characterId);
  return ch?.name || null;
}

export function ensureThread(game, lobby, playerId) {
  ensurePrivateChats(game);
  const member = playerMembers(lobby).find((m) => m.id === playerId);
  if (!member) return null;
  let thread = game.privateChats[playerId];
  if (!thread) {
    thread = {
      playerId,
      playerName: member.name || "Игрок",
      characterId: member.characterId || null,
      characterName: characterNameForMember(game, member),
      messages: []
    };
    game.privateChats[playerId] = thread;
  } else {
    thread.playerName = member.name || thread.playerName || "Игрок";
    thread.characterId = member.characterId || thread.characterId || null;
    thread.characterName = characterNameForMember(game, member) || thread.characterName || null;
  }
  if (!Array.isArray(thread.messages)) thread.messages = [];
  return thread;
}

function trimMessages(thread) {
  if (thread.messages.length > MAX_MESSAGES) {
    thread.messages = thread.messages.slice(-MAX_MESSAGES);
  }
}

function publicMessage(msg) {
  return {
    id: msg.id,
    type: msg.type,
    fromRole: msg.fromRole,
    fromName: msg.fromName,
    text: msg.text || "",
    die: msg.die ?? null,
    roll: msg.roll ?? null,
    createdAt: msg.createdAt
  };
}

function threadPublic(thread, { includeMessages = true } = {}) {
  const messages = includeMessages
    ? (thread.messages || []).slice(-80).map(publicMessage)
    : [];
  return {
    playerId: thread.playerId,
    playerName: thread.playerName,
    characterId: thread.characterId,
    characterName: thread.characterName,
    messageCount: (thread.messages || []).length,
    lastAt: thread.messages?.length ? thread.messages[thread.messages.length - 1].createdAt : null,
    messages
  };
}

/** Master sees all player threads (empty shells for online players). */
export function privateChatViewForMaster(game, lobby) {
  ensurePrivateChats(game);
  const threads = [];
  const seen = new Set();
  for (const member of playerMembers(lobby)) {
    const thread = ensureThread(game, lobby, member.id);
    if (thread) {
      threads.push(threadPublic(thread));
      seen.add(member.id);
    }
  }
  for (const [playerId, thread] of Object.entries(game.privateChats)) {
    if (seen.has(playerId)) continue;
    if (!thread?.messages?.length) continue;
    threads.push(threadPublic(thread));
  }
  threads.sort((a, b) => String(b.lastAt || "").localeCompare(String(a.lastAt || "")));
  return { threads, dice: CHAT_DICE };
}

/** Player sees only own thread. */
export function privateChatViewForPlayer(game, lobby, playerId) {
  if (!playerId) return { thread: null, dice: CHAT_DICE };
  const thread = ensureThread(game, lobby, playerId);
  if (!thread) return { thread: null, dice: CHAT_DICE };
  return { thread: threadPublic(thread), dice: CHAT_DICE };
}

export function appendChatText(game, lobby, { playerId, fromRole, fromName, text }) {
  const clean = String(text ?? "").trim().slice(0, 800);
  if (!clean) throw new Error("Пустое сообщение");
  const thread = ensureThread(game, lobby, playerId);
  if (!thread) throw new Error("Игрок не найден");
  const entry = {
    id: randomId("msg"),
    type: "text",
    fromRole,
    fromName: fromName || (fromRole === "master" ? "Мастер" : "Игрок"),
    text: clean,
    createdAt: new Date().toISOString()
  };
  thread.messages.push(entry);
  trimMessages(thread);
  return entry;
}

export function appendChatRoll(game, lobby, { playerId, fromRole, fromName, die }) {
  const sides = Number(die);
  if (!CHAT_DICE.includes(sides)) {
    throw new Error(`Кубик: ${CHAT_DICE.map((d) => `d${d}`).join(", ")}`);
  }
  const thread = ensureThread(game, lobby, playerId);
  if (!thread) throw new Error("Игрок не найден");
  const roll = 1 + Math.floor(Math.random() * sides);
  const entry = {
    id: randomId("msg"),
    type: "roll",
    fromRole,
    fromName: fromName || (fromRole === "master" ? "Мастер" : "Игрок"),
    text: "",
    die: sides,
    roll,
    createdAt: new Date().toISOString()
  };
  thread.messages.push(entry);
  trimMessages(thread);
  return entry;
}
