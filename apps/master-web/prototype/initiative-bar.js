/**
 * Общая полоса инициативы (мастер + игрок).
 * Анимация «падения» портретов при появлении новых бросков.
 * Клик по бойцу открывает карточку (персонаж / NPC) через opts.onOpenSheet.
 */

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

function fmtMod(n) {
  const v = Number(n) || 0;
  return v >= 0 ? `+${v}` : `${v}`;
}

function portraitHtml(c) {
  if (c.portraitUrl) {
    return `<img class="init-portrait" src="${escapeAttr(c.portraitUrl)}" alt="" />`;
  }
  const letter = String(c.name || "?").trim().charAt(0).toUpperCase() || "?";
  const kind = c.type === "player" ? "hero" : c.type === "monster" ? "mob" : "npc";
  return `<div class="init-portrait placeholder ${kind}" aria-hidden="true">${escapeHtml(letter)}</div>`;
}

function isHeroCombatant(c) {
  return Boolean(c?.characterId) || c?.type === "player";
}

function hasSheet(combat, c) {
  if (isHeroCombatant(c)) return true;
  if (combat?.npcSheets?.[c.id]) return true;
  return c.type === "npc" || c.type === "monster";
}

function sheetTitle(c) {
  return isHeroCombatant(c) ? "Открыть карточку персонажа" : "Открыть карточку NPC";
}

/**
 * @param {HTMLElement} root
 * @param {object|null} combat
 * @param {{
 *   highlightTokenId?: string|null,
 *   animate?: boolean,
 *   onOpenSheet?: (combatant: object, sheet: object|null) => void,
 *   onOpenNpc?: (combatant: object, sheet: object|null) => void
 * }} [opts]
 */
export function renderInitiativeBar(root, combat, opts = {}) {
  if (!root) return;
  if (!combat?.active) {
    root.classList.add("hidden");
    root.innerHTML = "";
    root.dataset.sig = "";
    return;
  }

  root.classList.remove("hidden");
  const order = Array.isArray(combat.order) ? combat.order : [];
  const pending = Array.isArray(combat.pending) ? combat.pending : [];
  const currentId = combat.current?.id || order[combat.currentIndex || 0]?.id || null;
  const sig = JSON.stringify({
    phase: combat.phase,
    round: combat.round,
    currentIndex: combat.currentIndex,
    order: order.map((c) => `${c.id}:${c.total}`),
    pending: pending.map((c) => c.id),
    sheets: Object.keys(combat.npcSheets || {}).length
  });
  const prevSig = root.dataset.sig || "";
  const shouldAnimate = opts.animate !== false && prevSig && prevSig !== sig;
  root.dataset.sig = sig;

  const orderCards = order
    .map((c, i) => {
      const isCurrent = c.id === currentId;
      const isMine = opts.highlightTokenId && c.tokenId === opts.highlightTokenId;
      const openable = hasSheet(combat, c);
      const classes = [
        "init-card",
        "init-card--rolled",
        isCurrent ? "is-current" : "",
        isMine ? "is-mine" : "",
        openable ? "init-card--openable" : "",
        shouldAnimate ? "init-fall" : ""
      ]
        .filter(Boolean)
        .join(" ");
      const delay = shouldAnimate ? `style="animation-delay:${Math.min(i, 12) * 55}ms"` : "";
      return `<article class="${classes}" data-id="${escapeAttr(c.id)}" data-combatant-id="${escapeAttr(c.id)}" ${
        openable
          ? `data-open-sheet="1" title="${escapeAttr(sheetTitle(c))}" role="button" tabindex="0"`
          : ""
      } ${delay}>
        ${portraitHtml(c)}
        <div class="init-meta">
          <div class="init-name" title="${escapeAttr(c.name)}">${escapeHtml(c.name)}</div>
          <div class="init-total mono" title="к20 ${c.roll} ${fmtMod(c.dexMod)}">${c.total ?? "—"}</div>
          ${openable ? `<div class="init-card-hint muted">карточка</div>` : ""}
        </div>
      </article>`;
    })
    .join("");

  const pendingCards = pending
    .map((c) => {
      const isMine = opts.highlightTokenId && c.tokenId === opts.highlightTokenId;
      const openable = hasSheet(combat, c);
      return `<article class="init-card init-card--pending ${isMine ? "is-mine" : ""} ${
        openable ? "init-card--openable" : ""
      }" data-id="${escapeAttr(c.id)}" data-combatant-id="${escapeAttr(c.id)}" ${
        openable
          ? `data-open-sheet="1" title="${escapeAttr(sheetTitle(c))}" role="button" tabindex="0"`
          : ""
      }>
        ${portraitHtml(c)}
        <div class="init-meta">
          <div class="init-name" title="${escapeAttr(c.name)}">${escapeHtml(c.name)}</div>
          <div class="init-total mono muted">…</div>
          ${openable ? `<div class="init-card-hint muted">карточка</div>` : ""}
        </div>
      </article>`;
    })
    .join("");

  const roundLabel = combat.phase === "ordered" || order.length ? `Раунд ${combat.round || 1}` : "Набор инициативы";
  const pendingHint = pending.length ? ` · ждут броска: ${pending.length}` : "";

  root.innerHTML = `
    <div class="init-bar-head">
      <span class="init-bar-title">Порядок боя</span>
      <span class="init-bar-sub muted">${escapeHtml(roundLabel)}${escapeHtml(pendingHint)}</span>
    </div>
    <div class="init-track" role="list">
      ${orderCards || `<div class="init-empty muted">Пока нет бросков</div>`}
      ${pending.length ? `<div class="init-sep" aria-hidden="true"></div>${pendingCards}` : ""}
    </div>
  `;

  const openHandler = opts.onOpenSheet || opts.onOpenNpc;
  if (typeof openHandler === "function") {
    root.querySelectorAll("[data-open-sheet]").forEach((el) => {
      const open = () => {
        const id = el.getAttribute("data-combatant-id");
        const cbt =
          [...(combat.order || []), ...(combat.pending || []), ...(combat.combatants || [])].find((x) => x.id === id) ||
          null;
        if (!cbt) return;
        const sheet = combat.npcSheets?.[cbt.id] || null;
        openHandler(cbt, sheet);
      };
      el.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        open();
      });
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      });
    });
  }

  if (shouldAnimate) {
    const current = root.querySelector(".init-card.is-current");
    current?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }
}
