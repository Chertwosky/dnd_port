/**
 * Общая карточка NPC (мастер + игрок).
 */

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function abilityMod(score) {
  const n = Number(score ?? 10);
  if (!Number.isFinite(n)) return "—";
  const mod = Math.floor((n - 10) / 2);
  return mod >= 0 ? `+${mod}` : String(mod);
}

function abilityModNum(score) {
  const n = Number(score ?? 10);
  if (!Number.isFinite(n)) return 0;
  return Math.floor((n - 10) / 2);
}

function listBlock(title, items, { rollable = false } = {}) {
  if (!items || items.length === 0) return "";
  const lines = items
    .map((item) => {
      if (typeof item === "string") {
        if (!rollable) return `<li>${escapeHtml(item)}</li>`;
        const bonusMatch = item.match(/([+-]?\d+)/);
        const nameGuess = item.replace(/[+-]?\d+.*/, "").trim() || item;
        return `<li><button type="button" class="npc-skill-roll hs-rollable" data-roll="skill" data-skill-key="${escapeAttr(nameGuess)}" data-roll-label="${escapeAttr(nameGuess)}" title="Клик — бросок">${escapeHtml(item)}</button></li>`;
      }
      if (item.name && item.bonus) {
        if (!rollable) {
          return `<li><strong>${escapeHtml(item.name)}</strong> ${escapeHtml(item.bonus)}</li>`;
        }
        return `<li><button type="button" class="npc-skill-roll hs-rollable" data-roll="skill" data-skill-key="${escapeAttr(item.name)}" data-roll-label="${escapeAttr(item.name)}" title="Клик — бросок"><strong>${escapeHtml(item.name)}</strong> ${escapeHtml(item.bonus)}</button></li>`;
      }
      if (item.name && item.description) {
        return `<li><strong>${escapeHtml(item.name)}.</strong> ${escapeHtml(item.description)}</li>`;
      }
      return `<li>${escapeHtml(JSON.stringify(item))}</li>`;
    })
    .join("");
  return `<div class="npc-sheet-block"><div class="subtitle">${escapeHtml(title)}</div><ul class="npc-sheet-list">${lines}</ul></div>`;
}

function skillsList(skills) {
  if (!skills) return [];
  if (Array.isArray(skills)) return skills;
  if (typeof skills === "object") {
    return Object.entries(skills).map(([name, bonus]) =>
      typeof bonus === "object"
        ? { name, description: String(bonus.bonus ?? bonus.value ?? "") }
        : { name, bonus: String(bonus) }
    );
  }
  return [];
}

function derivedChecksHtml(npc) {
  const abs = npc.abilities || {};
  const wis = abilityModNum(abs.wis);
  const dex = abilityModNum(abs.dex);
  const str = abilityModNum(abs.str);
  const int = abilityModNum(abs.int);
  const cha = abilityModNum(abs.cha);
  const fmt = (n) => (n >= 0 ? `+${n}` : String(n));
  const rows = [
    ["initiative", "Инициатива", "dex", fmt(dex)],
    ["perception", "Пассивное восприятие", "wis", String(10 + wis)],
    ["athletics", "Атлетика (оценка)", "str", fmt(str)],
    ["acrobatics", "Акробатика (оценка)", "dex", fmt(dex)],
    ["investigation", "Анализ (оценка)", "int", fmt(int)],
    ["insight", "Проницательность (оценка)", "wis", fmt(wis)],
    ["persuasion", "Убеждение (оценка)", "cha", fmt(cha)]
  ];
  return `<div class="npc-sheet-block"><div class="subtitle">Проверки (по характеристикам)</div>
    <div class="npc-check-grid">${rows
      .map(([key, label, ability, val]) => {
        const isPassive = key === "perception" && String(val) === String(10 + wis);
        const rollKind = key === "initiative" ? "ability" : "skill";
        const attrs =
          rollKind === "ability"
            ? `data-roll="ability" data-ability="dex" data-roll-label="Инициатива (Лов)"`
            : `data-roll="skill" data-skill-key="${escapeAttr(key)}" data-ability="${escapeAttr(ability)}" data-roll-label="${escapeAttr(label)}"`;
        if (isPassive && key === "perception") {
          // passive perception is not a d20 check — still allow active Perception roll via skill
        }
        return `<button type="button" class="npc-check hs-rollable" ${attrs} title="Клик — бросок">
          <span class="muted">${escapeHtml(label)}</span><strong>${escapeHtml(val)}</strong>
        </button>`;
      })
      .join("")}</div>
  </div>`;
}

function hpControlsHtml(npc, opts) {
  const token = opts.token || null;
  const canEdit = opts.viewerRole === "master" && token?.id;
  const hpNow = token?.hpCurrent ?? npc.hpCurrent ?? npc.hp ?? "—";
  const hpMax = token?.hpMax ?? npc.hpMax ?? npc.hp ?? "—";
  if (!canEdit) {
    return `<span class="pill" data-npc-hp-pill>ХП ${escapeHtml(String(hpNow))}/${escapeHtml(String(hpMax))}</span>`;
  }
  return `
    <div class="npc-hp-panel card stack" data-npc-hp-panel>
      <div class="row" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <div>
          <div class="subtitle" style="margin:0">Хиты</div>
          <div class="npc-hp-value mono" data-npc-hp-value>${escapeHtml(String(hpNow))}<span class="muted">/${escapeHtml(String(hpMax))}</span></div>
        </div>
        <div class="row npc-hp-btns">
          <button type="button" data-npc-hp="-5" class="warn">−5</button>
          <button type="button" data-npc-hp="-1">−1</button>
          <button type="button" data-npc-hp="+1">+1</button>
          <button type="button" data-npc-hp="+5" class="primary">+5</button>
        </div>
      </div>
      <div class="row" style="flex-wrap:wrap;gap:6px;align-items:center">
        <input type="number" data-npc-hp-custom inputmode="numeric" placeholder="±N" style="width:88px" />
        <button type="button" data-npc-hp-apply>Применить</button>
        <span class="muted" data-npc-hp-status style="font-size:12px"></span>
      </div>
    </div>
  `;
}

/**
 * Собирает HTML тела карточки NPC.
 * @param {object} npc
 * @param {{ token?: object|null, viewerRole?: string }} [opts]
 */
export function buildNpcSheetHtml(npc, opts = {}) {
  if (!npc) return `<div class="muted">Нет данных NPC</div>`;
  const token = opts.token || null;
  const abs = npc.abilities || {};
  const skills = skillsList(npc.skills);
  const showNotes = Boolean(npc.notes) && opts.viewerRole !== "player";
  const hpNow = token?.hpCurrent ?? npc.hpCurrent ?? npc.hp ?? "—";
  const hpMax = token?.hpMax ?? npc.hpMax ?? npc.hp ?? "—";
  const showSimpleHp = !(opts.viewerRole === "master" && token?.id);

  return `
    <div class="row">
      <div class="title">${escapeHtml(npc.name)}</div>
      <button type="button" data-npc-sheet-close>Закрыть</button>
    </div>
    <div class="muted">${escapeHtml([npc.size, npc.type, npc.alignment].filter(Boolean).join(" · ") || "NPC")}${
      npc.challengeRating ? ` · КС ${escapeHtml(String(npc.challengeRating))}` : ""
    }</div>
    <div class="row" style="flex-wrap:wrap;gap:6px">
      <span class="pill">КД ${escapeHtml(String(npc.ac ?? "—"))}</span>
      ${showSimpleHp ? `<span class="pill" data-npc-hp-pill>ХП ${escapeHtml(String(hpNow))}/${escapeHtml(String(hpMax))}</span>` : ""}
      <span class="pill">Скорость ${escapeHtml(String(npc.speed || "—"))}</span>
      ${token ? `<span class="pill">токен: ${escapeHtml(token.name || npc.name)}</span>` : ""}
    </div>
    ${hpControlsHtml(npc, opts)}
    <div class="stat-grid">
      ${["str", "dex", "con", "int", "wis", "cha"]
        .map(
          (k) => `
        <button type="button" class="stat-box hs-rollable" data-roll="ability" data-ability="${k}" data-roll-label="${k.toUpperCase()}" title="Клик — бросок">
          <div class="label">${k.toUpperCase()}</div>
          <div class="value">${escapeHtml(String(abs[k] ?? "—"))} (${abilityMod(abs[k])})</div>
        </button>`
        )
        .join("")}
    </div>
    ${
      showNotes
        ? `<div class="card npc-sheet-notes"><div class="subtitle">Заметки мастера</div><div>${escapeHtml(npc.notes)}</div></div>`
        : ""
    }
    ${listBlock("Действия и атаки", npc.actions)}
    ${listBlock("Бонусные / реакции", npc.bonusActions || npc.reactions)}
    ${listBlock("Особенности", npc.traits)}
    ${listBlock("Навыки", skills, { rollable: true })}
    ${skills.length ? "" : derivedChecksHtml(npc)}
    ${listBlock("Чувства", npc.senses)}
    ${listBlock("Языки", npc.languages)}
    ${listBlock("Иммунитеты", npc.immunities)}
    ${listBlock("Сопротивления", npc.resistances)}
    ${listBlock("Уязвимости", npc.vulnerabilities)}
  `;
}

function updateHpDisplay(body, token) {
  if (!body || !token) return;
  const value = body.querySelector("[data-npc-hp-value]");
  if (value) {
    value.innerHTML = `${escapeHtml(String(token.hpCurrent))}<span class="muted">/${escapeHtml(String(token.hpMax))}</span>`;
  }
  const pill = body.querySelector("[data-npc-hp-pill]");
  if (pill) {
    pill.textContent = `ХП ${token.hpCurrent}/${token.hpMax}`;
  }
}

/**
 * Открывает модалку с карточкой NPC.
 * @param {{ modal: HTMLElement, body: HTMLElement }} ui
 * @param {object} npc
 * @param {{ token?: object|null, viewerRole?: string, onClose?: () => void, onHpChange?: (payload: { tokenId: string, action?: string, delta?: number, reason?: string }) => Promise<{ token?: object, log?: object }|void> }} [opts]
 */
export function openNpcSheetModal(ui, npc, opts = {}) {
  if (!ui?.modal || !ui?.body || !npc) return;
  ui.body.classList.add("npc-sheet-card", "modal-card", "stack");
  ui.body.innerHTML = buildNpcSheetHtml(npc, opts);
  ui.modal.classList.remove("hidden");
  const close = () => {
    ui.modal.classList.add("hidden");
    ui.body.classList.remove("npc-sheet-card");
    ui.body.innerHTML = "";
    opts.onClose?.();
  };
  ui.body.querySelector("[data-npc-sheet-close]")?.addEventListener("click", close);
  ui.modal.querySelector("[data-npc-sheet-backdrop], .modal-backdrop")?.addEventListener("click", close, { once: true });

  if (typeof opts.onRoll === "function") {
    ui.body.querySelectorAll("[data-roll]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const kind = el.getAttribute("data-roll");
        if (kind !== "ability" && kind !== "skill") return;
        opts.onRoll({
          kind,
          ability: el.getAttribute("data-ability") || undefined,
          skillKey: el.getAttribute("data-skill-key") || undefined,
          label: el.getAttribute("data-roll-label") || undefined,
          el,
          npc,
          token: opts.token || null
        });
      });
    });
  }

  const tokenId = opts.token?.id;
  if (opts.viewerRole === "master" && tokenId && typeof opts.onHpChange === "function") {
    const statusEl = ui.body.querySelector("[data-npc-hp-status]");
    const run = async (payload) => {
      if (statusEl) statusEl.textContent = "…";
      try {
        const result = await opts.onHpChange({ tokenId, ...payload });
        if (result?.token) {
          if (opts.token) {
            opts.token.hpCurrent = result.token.hpCurrent;
            opts.token.hpMax = result.token.hpMax;
          }
          updateHpDisplay(ui.body, result.token);
        }
        if (statusEl) {
          const d = result?.log?.delta ?? payload.delta ?? payload.action;
          statusEl.textContent = d != null ? `${Number(d) > 0 ? "+" : ""}${d}` : "ок";
        }
      } catch (error) {
        if (statusEl) statusEl.textContent = String(error.message || error);
      }
    };
    ui.body.querySelectorAll("[data-npc-hp]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.getAttribute("data-npc-hp");
        run({ action, reason: `${npc.name} · кнопка ${action}` });
      });
    });
    ui.body.querySelector("[data-npc-hp-apply]")?.addEventListener("click", () => {
      const input = ui.body.querySelector("[data-npc-hp-custom]");
      const delta = Number(input?.value);
      if (!Number.isFinite(delta) || delta === 0) {
        if (statusEl) statusEl.textContent = "укажите ±N";
        return;
      }
      run({ delta, reason: `${npc.name} · правка ${delta > 0 ? "+" : ""}${delta}` });
      if (input) input.value = "";
    });
  }
}

export function closeNpcSheetModal(ui) {
  if (!ui?.modal) return;
  ui.modal.classList.add("hidden");
  ui.body?.classList.remove("npc-sheet-card");
  if (ui.body) ui.body.innerHTML = "";
}
