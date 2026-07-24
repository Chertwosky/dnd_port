/** Общий HTML листа персонажа (мастер / игрок, readonly) */

const SKILL_LABELS_RU = {
  acrobatics: "Акробатика",
  "animal handling": "Уход за животными",
  animalhandling: "Уход за животными",
  arcana: "Магия",
  athletics: "Атлетика",
  deception: "Обман",
  history: "История",
  insight: "Проницательность",
  intimidation: "Запугивание",
  investigation: "Анализ",
  medicine: "Медицина",
  nature: "Природа",
  perception: "Внимательность",
  performance: "Выступление",
  persuasion: "Убеждение",
  religion: "Религия",
  "sleight of hand": "Ловкость рук",
  sleightofhand: "Ловкость рук",
  stealth: "Скрытность",
  survival: "Выживание"
};

function normalizeSkillKey(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function skillLabelRu(skill) {
  if (typeof skill === "string") {
    const k = normalizeSkillKey(skill);
    return SKILL_LABELS_RU[k] || SKILL_LABELS_RU[k.replace(/\s/g, "")] || skill;
  }
  const key = normalizeSkillKey(skill?.key);
  const label = normalizeSkillKey(skill?.label);
  return (
    SKILL_LABELS_RU[key] ||
    SKILL_LABELS_RU[key.replace(/\s/g, "")] ||
    SKILL_LABELS_RU[label] ||
    SKILL_LABELS_RU[label.replace(/\s/g, "")] ||
    skill?.label ||
    skill?.key ||
    "—"
  );
}

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

function fmtMod(n) {
  const v = Number(n) || 0;
  return v >= 0 ? `+${v}` : `${v}`;
}

function skillBonus(character, skill) {
  const abs = character.abilities?.[skill.baseAbility];
  const mod = abs?.modifier ?? 0;
  const prof = Number(skill.proficiencyLevel || 0) * (character.proficiencyBonus || 2);
  return mod + prof;
}

function equipIcon(text) {
  const t = String(text || "").toLowerCase();
  if (/кольчуг|доспех|латы|кирас|шкурн|кожан/.test(t)) return "🛡️";
  if (/щит/.test(t)) return "🔰";
  if (/меч|скимитар|клинок/.test(t)) return "⚔️";
  if (/копь|копье|пика|трезуб/.test(t)) return "🗡️";
  if (/лук|арбалет|стрел|болт/.test(t)) return "🏹";
  if (/кинжал/.test(t)) return "🔪";
  if (/символ|фокус|амулет|ожерел/.test(t)) return "✝️";
  if (/набор|рюкзак|сумк/.test(t)) return "🎒";
  if (/инструмент|каллиграф/.test(t)) return "✒️";
  if (/книг|молитв|пергамент/.test(t)) return "📖";
  if (/роба|одежд|плащ/.test(t)) return "🧥";
  if (/зм|см|мм|монет|бабк|золот|серебр/.test(t)) return "🪙";
  if (/зелье|флакон/.test(t)) return "🧪";
  if (/кольц/.test(t)) return "💍";
  return "📦";
}

function weaponIcon(name) {
  const t = String(name || "").toLowerCase();
  if (/лук|арбалет/.test(t)) return "🏹";
  if (/копь|копье/.test(t)) return "🗡️";
  if (/кинжал/.test(t)) return "🔪";
  if (/булав|молот|топор/.test(t)) return "🪓";
  return "⚔️";
}

function sectionTitle(icon, title) {
  return `<div class="hs-title"><span class="hs-ico" aria-hidden="true">${icon}</span><span>${title}</span></div>`;
}

function accordionSection(icon, title, bodyHtml, { open = false } = {}) {
  if (!bodyHtml) return "";
  return `<details class="hs-accordion"${open ? " open" : ""}>
    <summary class="hs-accordion-summary">
      <span class="hs-accordion-title">${sectionTitle(icon, title)}</span>
      <span class="hs-accordion-chevron" aria-hidden="true"></span>
    </summary>
    <div class="hs-accordion-body">${bodyHtml}</div>
  </details>`;
}

/** Краткие подписи мировоззрения — полный текст в title */
function alignmentShort(raw) {
  const t = String(raw || "").trim().toLowerCase();
  if (!t || t === "—") return { short: "—", full: "—" };
  const map = [
    [/законн\w*\s+добр/, "ЗД"],
    [/нейтральн\w*\s+добр|добр\w*\s+нейтральн/, "НД"],
    [/хаотичн\w*\s+добр/, "ХД"],
    [/законн\w*\s+нейтральн/, "ЗН"],
    [/хаотичн\w*\s+нейтральн/, "ХН"],
    [/законн\w*\s+зл/, "ЗЗ"],
    [/нейтральн\w*\s+зл|зл\w*\s+нейтральн/, "НЗ"],
    [/хаотичн\w*\s+зл/, "ХЗ"],
    [/истинн\w*\s+нейтральн|^нейтральн/, "ИН"]
  ];
  for (const [re, short] of map) {
    if (re.test(t)) return { short, full: String(raw).trim() };
  }
  const full = String(raw).trim();
  return { short: full.length > 14 ? `${full.slice(0, 12)}…` : full, full };
}

function tagHtml(icon, text, title) {
  const full = title || text;
  return `<span class="hs-tag" title="${escapeAttr(full)}">${icon} ${escapeHtml(text)}</span>`;
}

function localizeFeatureText(text) {
  let t = String(text || "");
  const map = [
    [/\bResourceful\b/g, "Находчивость"],
    [/\bSkillful\b/g, "Умелый"],
    [/\bVersatile\b/g, "Универсальность"],
    [/\bAlways[- ]prepared\b/gi, "Всегда подготовлено"],
    [/\bAlways prepared\b/gi, "Всегда подготовлено"],
    [/\bChannel Divinity\b/gi, "Божественный канал"],
    [/\bDivine Sense\b/gi, "Божественное чувство"],
    [/\bDivine Smite\b/gi, "Божественная кара"],
    [/\bDivine Favor\b/gi, "Божественное благоволение"],
    [/\bLay on Hands\b/gi, "Возложение рук"],
    [/\bMagic Initiate\b/gi, "Магический посвящённый"],
    [/\bSkilled\b/g, "Одарённый"],
    [/\bLong Rest\b/gi, "продолжительный отдых"],
    [/\bShort Rest\b/gi, "короткий отдых"],
    [/\bPerception\b/g, "Внимательность"],
    [/\bGuidance\b/g, "Наставление"],
    [/\bSacred Flame\b/g, "Священное пламя"],
    [/\bBless\b/g, "Благословение"],
    [/\s*\[[A-Za-z][A-Za-z '\-]+\]/g, ""]
  ];
  for (const [re, ru] of map) t = t.replace(re, ru);
  return t.replace(/\s{2,}/g, " ").trim();
}

function openSection(icon, title, bodyHtml) {
  if (!bodyHtml) return "";
  return `<section class="hs-section">${sectionTitle(icon, title)}<div class="hs-accordion-body" style="padding:0;border:0">${bodyHtml}</div></section>`;
}

/** Категории умений из заметок */
const FEATURE_CATEGORY_META = {
  class: { icon: "⚜️", title: "Умения класса" },
  subclass: { icon: "🕊️", title: "Клятва / подкласс" },
  race: { icon: "🧬", title: "Расовые" },
  background: { icon: "📜", title: "Предыстория" },
  feat: { icon: "🧩", title: "Черты" },
  other: { icon: "📝", title: "Прочее" }
};

const SPELL_LIST_SKIP =
  /^(подготовлено|всегда подготовлены|заговоры\s*[—\-]|magic initiate \(жрец\)\s*[—\-]\s*1 круг|навыки\s*:|ячейки\s*:)/i;

const SKILL_DUMP_SKIP = /<strong>|внимательность:|проницательность:|всего:|порог/i;

/**
 * Разбивает сырые заметки на карточки умений и раскладывает по категориям.
 * @param {object} c
 * @returns {{ category: string, icon: string, title: string, items: { name: string, description: string }[] }[]}
 */
export function parseFeatureBlocksFromCharacter(c) {
  const rawChunks = [];
  for (const block of [...(c.notes || []), ...(c.feats || []), ...(c.traits || [])]) {
    const text = String(block || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .trim();
    if (!text) continue;
    if (SKILL_DUMP_SKIP.test(text) && /навыки/i.test(text)) continue;
    rawChunks.push(...text.split(/\n+/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean));
  }

  /** @type {{ name: string, description: string, category: string }[]} */
  const entries = [];
  let currentCategory = "other";

  const pushEntry = (name, description, category) => {
    const n = localizeFeatureText(
      String(name || "")
        .replace(/\s*[—:\-]\s*$/, "")
        .replace(/\s+/g, " ")
        .trim()
    );
    const d = localizeFeatureText(
      String(description || "")
        .replace(/\s+/g, " ")
        .trim()
    );
    if (!n || n.length < 2) return;
    if (SPELL_LIST_SKIP.test(n) || SPELL_LIST_SKIP.test(`${n}: ${d}`)) return;
    if (/^(навыки|инструмент|всего|спасброски)$/i.test(n)) return;
    if (entries.some((e) => e.name.toLowerCase() === n.toLowerCase())) {
      // дополнить описание, если новое длиннее
      const ex = entries.find((e) => e.name.toLowerCase() === n.toLowerCase());
      if (ex && d && d.length > ex.description.length) ex.description = d;
      return;
    }
    entries.push({ name: n, description: d, category: category || "other" });
  };

  const categorize = (name) => {
    const t = String(name || "").toLowerCase();
    if (/клятва|священное оружие|подкласс|архетип|дуэлянт(?!\s)/.test(t) && !/воровской|жаргон|хитрое|скрытая|экспертиза|ловкая|лихая/.test(t)) {
      return "subclass";
    }
    if (/resourceful|skillful|versatile|находчивость|умелый\b|раса\b|тёмное зрение|скорость/.test(t)) return "race";
    if (/послушник|предыстория|magic initiate|одарённый|skilled|черта/.test(t)) return "feat";
    if (
      /возложение|колдовство|мастерство оружия|боевой стиль|кара паладина|божественный канал|божественное чувство|lay on hands|channel|divine sense|паладин|экспертиза|скрытая атака|воровской жаргон|хитрое действие|ловкая работа|лихая удаль|cunning|thieves.?cant|sneak attack|expertise|uncanny|плутов|плут/.test(
        t
      )
    ) {
      return "class";
    }
    return currentCategory || "other";
  };

  /** Склеивает «Заголовок» + следующие абзацы, если в LSS они шли отдельными строками */
  const isHeadingLike = (line) => {
    const t = String(line || "").trim();
    if (t.length < 2 || t.length > 60) return false;
    if (/[.!?…]$/.test(t)) return false;
    if (/^[,.;:«"'\d]/.test(t)) return false;
    if (/^[•\-*]/.test(t)) return false;
    if (!/^[A-ZА-ЯЁ]/.test(t)) return false;
    if (
      /^(если|бонусным|он |она |геррит|вы |ваш|когда|один раз|пока |до конца|совершить|отойти|спрятаться)/i.test(t)
    ) {
      return false;
    }
    return true;
  };

  const coalesceTitleLines = (lines) => {
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (/^.{2,70}?\s*:\s+.+/.test(line) || /^[•\-*]\s/.test(line)) {
        out.push(line);
        i += 1;
        continue;
      }
      // Уже «Имя — короткое уточнение» без длинного описания — не трогаем, если нет продолжения
      if (isHeadingLike(line) && i + 1 < lines.length) {
        const parts = [];
        let j = i + 1;
        while (j < lines.length) {
          const next = lines[j];
          if (isHeadingLike(next) && parts.length > 0) break;
          if (isHeadingLike(next) && parts.length === 0) break;
          parts.push(next);
          j += 1;
        }
        if (parts.length) {
          out.push(`${line}: ${parts.join(" ")}`);
          i = j;
          continue;
        }
      }
      out.push(line);
      i += 1;
    }
    return out;
  };

  const pairedChunks = coalesceTitleLines(rawChunks);

  for (const line of pairedChunks) {
    // Заголовок секции без описания
    if (/^умения\s+(паладина|класса|плута|воина|волшебника|жреца)\b/i.test(line)) {
      currentCategory = "class";
      continue;
    }
    if (/^раса\s*:/i.test(line) || /^раса\b.+\(srd/i.test(line)) {
      currentCategory = "race";
      // "Раса: Человек (SRD 2024)" — кратко
      const m = line.match(/^раса\s*:\s*(.+)$/i);
      if (m) pushEntry("Раса", m[1].trim(), "race");
      continue;
    }
    if (/^предыстория\b/i.test(line)) {
      currentCategory = "background";
      const m = line.match(/^предыстория\s+(.+?)(?::\s*(.*))?$/i);
      if (m) {
        const label = m[1].replace(/:\s*$/, "").trim();
        const rest = (m[2] || "").trim();
        if (rest) pushEntry(`Предыстория: ${label}`, rest, "background");
        else if (label) pushEntry(`Предыстория: ${label}`, "", "background");
      }
      continue;
    }
    if (/^послушник\s*→|^человек\s*\(versatile\)\s*→/i.test(line)) {
      currentCategory = "feat";
      const m = line.match(/^(.+?)\s*:\s*(.+)$/);
      if (m) pushEntry(m[1].trim(), m[2].trim(), "feat");
      else {
        const d = line.match(/^(.+?)\s*[—\-]\s*(.+)$/);
        if (d) pushEntry(d[1].trim(), d[2].trim(), "feat");
      }
      continue;
    }

    // Полная строка «Имя: описание»
    const inline = line.match(/^(.{2,70}?)\s*:\s+(.+)$/);
    if (inline) {
      let name = inline[1].trim();
      let description = inline[2].trim();
      // «Боевой стиль — Дуэлянт: +2...»
      const style = name.match(/^(.+?)\s*[—\-]\s*(.+)$/);
      if (style) {
        name = `${style[1].trim()} (${style[2].trim()})`;
      }
      // «Клятва преданности — Священное оружие: описание»
      pushEntry(name, description, categorize(name));
      continue;
    }

    // «Имя — описание» (не URL)
    const dash = line.match(/^(.{2,70}?)\s+[—\-]\s+(.+)$/);
    if (dash && !/^https?:/i.test(line)) {
      const name = dash[1].trim();
      const description = dash[2].trim();
      // если описание само «Subtitle: rest»
      const nested = description.match(/^(.{2,40}?)\s*:\s+(.+)$/);
      if (nested) {
        pushEntry(`${name} (${nested[1].trim()})`, nested[2].trim(), categorize(name));
      } else {
        pushEntry(name, description, categorize(name));
      }
      continue;
    }

    // Маркер списка предыстории / черты
    if (/^•\s*/.test(line) || /^[-*]\s+/.test(line)) {
      const body = line.replace(/^•\s*/, "").replace(/^[-*]\s+/, "");
      const parts = body.match(/^(.{2,40}?)\s*:\s*(.+)$/);
      let cat = currentCategory;
      if (/^(навыки|инструмент)/i.test(body)) cat = "background";
      if (/^черта|magic initiate/i.test(body)) cat = "feat";
      if (cat === "other" || cat === "race") {
        if (/навык|инструмент|каллиграф|религ|прониц/i.test(body)) cat = "background";
      }
      if (parts) pushEntry(parts[1].trim(), parts[2].trim(), cat);
      else pushEntry(body, "", cat);
      continue;
    }
  }

  // Убрать дубли «Заговоры/Владение», если уже есть Magic Initiate / Skilled / Черта
  const hasInitiate = entries.some((e) => /magic initiate|одарённый|skilled|черта/i.test(e.name + e.description));
  const cleaned = entries.filter((e) => {
    if (hasInitiate && /^(заговоры|владение)$/i.test(e.name)) return false;
    e.name = e.name.replace(/^•\s*/, "");
    return true;
  });

  // Навыки/Инструмент из расы → предыстория
  for (const e of cleaned) {
    if (e.category === "race" && /^(навыки|инструмент)$/i.test(e.name)) e.category = "background";
    if (/^черта$/i.test(e.name) && /magic initiate/i.test(e.description)) {
      e.name = e.description.split(/[—\-]/)[0].trim() || "Magic Initiate";
      const rest = e.description.split(/[—\-]/).slice(1).join("—").trim();
      if (rest) e.description = rest;
      e.category = "feat";
    }
  }

  const order = ["class", "subclass", "race", "background", "feat", "other"];
  const byCat = new Map(order.map((k) => [k, []]));
  for (const e of cleaned) {
    const cat = byCat.has(e.category) ? e.category : "other";
    if (!e.description && e.name.length < 12 && e.category !== "race" && e.category !== "background") continue;
    byCat.get(cat).push(e);
  }

  return order
    .map((category) => ({
      category,
      ...FEATURE_CATEGORY_META[category],
      items: byCat.get(category) || []
    }))
    .filter((b) => b.items.length > 0);
}

export function renderFeatureBlocksHtml(c) {
  const blocks = parseFeatureBlocksFromCharacter(c);
  if (!blocks.length) {
    return `<div class="muted" data-feature-empty>Умения из заметок не найдены. Нажмите «Разобрать заметки» после импорта листа.</div>`;
  }
  return blocks
    .map((block) => {
      const list = block.items
        .map(
          (item) => `<article class="hs-spell hs-feature-card">
          <div class="hs-spell-head">
            <span class="hs-spell-ico">${block.icon}</span>
            <div class="hs-spell-titles">
              <div class="hs-spell-name">${escapeHtml(item.name)}</div>
            </div>
          </div>
          ${item.description ? `<div class="hs-spell-desc">${escapeHtml(item.description)}</div>` : ""}
        </article>`
        )
        .join("");
      return openSection(block.icon, block.title, `<div class="hs-spell-list">${list}</div>`);
    })
    .join("");
}

export function countParsedFeatures(c) {
  return parseFeatureBlocksFromCharacter(c).reduce((n, b) => n + b.items.length, 0);
}

/**
 * Секции листа — те же блоки, что на «Персонаж», для вкладок боя.
 * @returns {{ vitals, abilities, skills, weapons, equipment, spells, inventory, notes, feats }}
 */
export function buildCharacterSheetParts(c) {
  const abs = c.abilities || {};
  const ABIL_RU = {
    str: { label: "Сила", short: "Сил", icon: "💪" },
    dex: { label: "Ловкость", short: "Лов", icon: "🤸" },
    con: { label: "Телосложение", short: "Тел", icon: "🫀" },
    int: { label: "Интеллект", short: "Инт", icon: "🧠" },
    wis: { label: "Мудрость", short: "Мдр", icon: "👁️" },
    cha: { label: "Харизма", short: "Хар", icon: "✨" }
  };

  const allSkills = c.skills || [];
  const profSkills = allSkills.filter((s) => Number(s.proficiencyLevel) > 0);
  const otherSkills = allSkills.filter((s) => !Number(s.proficiencyLevel));

  const skillChip = (s, strong) => {
    const bonus = skillBonus(c, s);
    const label = skillLabelRu(s);
    const skillKey = normalizeSkillKey(s.key || s.label || "");
    const ability = String(s.baseAbility || "").toLowerCase();
    return `<button type="button" class="hs-chip hs-rollable ${strong ? "hs-chip-hot" : ""}" title="${escapeAttr(`${label} (${(s.baseAbility || "").toUpperCase()}) · клик — бросок`)}" data-roll="skill" data-skill-key="${escapeAttr(skillKey)}" data-ability="${escapeAttr(ability)}" data-roll-label="${escapeAttr(label)}">
      <span class="hs-chip-label">${escapeHtml(label)}</span>
      <span class="hs-chip-val">${fmtMod(bonus)}</span>
    </button>`;
  };

  const weaponsHtml = (c.weapons || [])
    .map(
      (w) => `
      <div class="hs-item">
        <div class="hs-item-ico">${weaponIcon(w.name)}</div>
        <div class="hs-item-body">
          <div class="hs-item-name">${escapeHtml(w.name)}</div>
          <div class="hs-item-meta">${escapeHtml(w.damage || "—")}${w.proficient ? " · владение" : ""}</div>
        </div>
      </div>`
    )
    .join("");

  const equipmentHtml = (c.equipment || [])
    .map(
      (e) => `
      <div class="hs-item hs-item-soft">
        <div class="hs-item-ico">${equipIcon(e)}</div>
        <div class="hs-item-body">
          <div class="hs-item-name">${escapeHtml(e)}</div>
        </div>
      </div>`
    )
    .join("");

  const inventoryHtml = (c.inventory || [])
    .map(
      (i) => `
      <div class="hs-item hs-item-soft">
        <div class="hs-item-ico">${equipIcon(i.name)}</div>
        <div class="hs-item-body">
          <div class="hs-item-name">${escapeHtml(i.name)}</div>
          <div class="hs-item-meta">${escapeHtml(i.rarityLabel || i.type || "предмет")}</div>
        </div>
      </div>`
    )
    .join("");

  const spellChips = (c.preparedSpellsDetailed?.length
    ? c.preparedSpellsDetailed
    : (c.preparedSpells || []).map((s) => ({ name: s, summary: "", description: "" }))
  )
    .map((sp) => {
      const unresolved = sp.unresolvedLssId || (/^[a-f0-9]{24}$/i.test(String(sp.nameEn || "")));
      const name = unresolved
        ? `Карточка LSS · …${String(sp.unresolvedLssId || sp.nameEn).slice(-6)}`
        : sp.name || sp.nameEn || "Заклинание";
      const meta = unresolved
        ? "нужен текстовый экспорт из LSS"
        : [sp.levelLabel, sp.schoolLabel, sp.castingTime, sp.range].filter(Boolean).join(" · ");
      const body = sp.description || sp.summary || "";
      const higher = sp.higherLevel
        ? `<div class="hs-spell-higher"><strong>На высоких кругах:</strong> ${escapeHtml(sp.higherLevel)}</div>`
        : "";
      return `<article class="hs-spell" title="${escapeAttr(sp.nameEn || name)}">
        <div class="hs-spell-head">
          <span class="hs-spell-ico">✨</span>
          <div class="hs-spell-titles">
            <div class="hs-spell-name">${escapeHtml(name)}</div>
            ${meta ? `<div class="hs-spell-meta">${escapeHtml(meta)}</div>` : ""}
          </div>
        </div>
        ${sp.summary && sp.summary !== body ? `<div class="hs-spell-summary">${escapeHtml(sp.summary)}</div>` : ""}
        ${body ? `<div class="hs-spell-desc">${escapeHtml(body)}</div>` : `<div class="hs-spell-desc muted">Описание не найдено</div>`}
        ${higher}
      </article>`;
    })
    .join("");

  const importWarnHtml = (c.importWarnings || []).length
    ? `<div class="error-text" style="margin-bottom:8px">${(c.importWarnings || [])
        .map((w) => escapeHtml(w))
        .join("<br/>")}</div>`
    : "";

  const coins = c.coins || {};
  const coinParts = [
    coins.pp ? `${coins.pp} пм` : null,
    coins.gp ? `${coins.gp} зм` : null,
    coins.ep ? `${coins.ep} эм` : null,
    coins.sp ? `${coins.sp} см` : null,
    coins.cp ? `${coins.cp} мм` : null
  ].filter(Boolean);

  const abilitiesBody = `<div class="hs-abil-grid">
        ${["str", "dex", "con", "int", "wis", "cha"]
          .map((k) => {
            const a = abs[k] || {};
            const meta = ABIL_RU[k];
            return `<button type="button" class="hs-abil hs-rollable" title="${escapeAttr(`${meta.label} · клик — бросок`)}" data-roll="ability" data-ability="${k}" data-roll-label="${escapeAttr(meta.label)}">
              <div class="hs-abil-ico">${meta.icon}</div>
              <div class="hs-abil-label">${meta.short}</div>
              <div class="hs-abil-score">${a.score ?? "—"}</div>
              <div class="hs-abil-mod">${fmtMod(a.modifier)}</div>
            </button>`;
          })
          .join("")}
      </div>`;

  const skillsBody = `
      <div class="hs-subtitle">Владения</div>
      <div class="hs-chip-grid">${profSkills.map((s) => skillChip(s, true)).join("") || '<span class="muted">нет</span>'}</div>
      ${
        otherSkills.length
          ? `<div class="hs-subtitle">Прочие</div><div class="hs-chip-grid hs-chip-grid-dim">${otherSkills
              .map((s) => skillChip(s, false))
              .join("")}</div>`
          : ""
      }`;

  const spellsBody =
    c.preparedSpells?.length || c.alwaysPreparedSpells?.length || c.preparedSpellsDetailed?.length
      ? `${importWarnHtml}
            <div class="hs-vitals hs-vitals-compact">
              <div class="hs-vital" title="Сложность спасброска от ваших заклинаний"><span class="hs-vital-ico">📜</span><div class="hs-vital-text"><div class="hs-vital-label">Спасбросок</div><div class="hs-vital-val">${c.spellcasting?.saveDC ?? "—"}</div></div></div>
              <div class="hs-vital" title="Бонус атаки заклинанием"><span class="hs-vital-ico">🎯</span><div class="hs-vital-text"><div class="hs-vital-label">Атака</div><div class="hs-vital-val">+${c.spellcasting?.attackBonus ?? "—"}</div></div></div>
              <div class="hs-vital" title="Ячейки заклинаний 1 круга"><span class="hs-vital-ico">🔷</span><div class="hs-vital-text"><div class="hs-vital-label">Ячейки 1</div><div class="hs-vital-val">${c.spellcasting?.slots1 ?? 0}</div></div></div>
            </div>
            <div class="hs-subtitle">Подготовленные и всегда готовые</div>
            <div class="hs-spell-list">${spellChips}</div>`
      : `${importWarnHtml}<div class="muted">Нет заклинаний</div>`;

  const spellItems = Array.isArray(c.spellcastingItems) ? c.spellcastingItems : [];
  const spellItemsHtml = spellItems.length
    ? `<div class="hs-spell-list">${spellItems
        .map((it) => {
          const meta = [it.rarityLabel || it.rarity, it.type, it.requiresAttunement ? "настройка" : null]
            .filter(Boolean)
            .join(" · ");
          return `<article class="hs-spell">
            <div class="hs-spell-head">
              <span class="hs-spell-ico">${escapeHtml(it.icon || "🌙")}</span>
              <div class="hs-spell-titles">
                <div class="hs-spell-name">${escapeHtml(it.name || "Магический предмет")}</div>
                ${meta ? `<div class="hs-spell-meta">${escapeHtml(meta)}</div>` : ""}
              </div>
            </div>
            ${it.summary ? `<div class="hs-spell-summary">${escapeHtml(it.summary)}</div>` : ""}
            ${it.description ? `<div class="hs-spell-desc">${escapeHtml(it.description)}</div>` : ""}
          </article>`;
        })
        .join("")}</div>`
    : "";

  const vitalsHtml = `
    <div class="hs-vitals">
      <div class="hs-vital" title="Класс брони"><span class="hs-vital-ico">🛡️</span><div class="hs-vital-text"><div class="hs-vital-label">Класс брони</div><div class="hs-vital-val">${c.vitals?.ac ?? "—"}</div></div></div>
      <div class="hs-vital hs-vital-hp" title="Хиты"><span class="hs-vital-ico">❤️</span><div class="hs-vital-text"><div class="hs-vital-label">ХП</div><div class="hs-vital-val">${c.vitals?.hpCurrent ?? "—"}<span class="hs-vital-sub">/${c.vitals?.hpMax ?? "—"}</span></div></div></div>
      <div class="hs-vital" title="Скорость"><span class="hs-vital-ico">💨</span><div class="hs-vital-text"><div class="hs-vital-label">Скор.</div><div class="hs-vital-val">${c.vitals?.speed ?? "—"}<span class="hs-vital-sub">фт</span></div></div></div>
      <div class="hs-vital" title="Бонус мастерства"><span class="hs-vital-ico">⭐</span><div class="hs-vital-text"><div class="hs-vital-label">БМ</div><div class="hs-vital-val">+${c.proficiencyBonus ?? 2}</div></div></div>
      <div class="hs-vital" title="Кость хитов"><span class="hs-vital-ico">🎲</span><div class="hs-vital-text"><div class="hs-vital-label">Кость</div><div class="hs-vital-val">${escapeHtml(c.vitals?.hitDie || "—")}</div></div></div>
      <div class="hs-vital" title="Монеты"><span class="hs-vital-ico">🪙</span><div class="hs-vital-text"><div class="hs-vital-label">Золото</div><div class="hs-vital-val hs-vital-coins">${escapeHtml(coinParts.join(" · ") || "0")}</div></div></div>
    </div>
    <div class="hs-chip-grid" style="margin-top:8px">
      <div class="hs-chip"><span class="hs-chip-label">Временные ХП</span><span class="hs-chip-val">${c.vitals?.hpTemp ?? 0}</span></div>
      <div class="hs-chip"><span class="hs-chip-label">Уровень</span><span class="hs-chip-val">${c.level ?? "—"}</span></div>
      <div class="hs-chip"><span class="hs-chip-label">Опыт</span><span class="hs-chip-val">${c.experience ?? 0}</span></div>
    </div>`;

  const notesLines = [
    ...(c.traits || []),
    ...(c.feats || []),
    ...(c.personality || []),
    ...(c.bonds || []),
    ...(c.backgroundStory || []),
    ...((c.notes || []).slice(0, 6))
  ];

  return {
    coinParts,
    vitalsHtml,
    abilitiesBody,
    skillsBody,
    weaponsHtml,
    equipmentHtml,
    spellsBody,
    spellItemsHtml,
    inventoryHtml,
    spellChips,
    notesHtml: notesLines.length
      ? `<div class="hs-prose">${notesLines.map((l) => `<p>${escapeHtml(l)}</p>`).join("")}</div>`
      : `<div class="muted">Нет заметок</div>`,
    featsHtml: (c.feats || []).length
      ? `<div class="hs-prose">${(c.feats || []).map((l) => `<p>${escapeHtml(l)}</p>`).join("")}</div>`
      : "",
    combatTab: () =>
      openSection("⚔️", "Бой", vitalsHtml) +
      openSection("📊", "Характеристики", abilitiesBody) +
      (weaponsHtml ? openSection("⚔️", "Оружие", `<div class="hs-item-grid">${weaponsHtml}</div>`) : ""),
    actionsTab: () =>
      openSection("📊", "Характеристики", abilitiesBody) +
      openSection("🎯", "Навыки", skillsBody) +
      (weaponsHtml ? openSection("⚔️", "Оружие", `<div class="hs-item-grid">${weaponsHtml}</div>`) : "") +
      (equipmentHtml ? openSection("🎒", "Снаряжение", `<div class="hs-item-grid">${equipmentHtml}</div>`) : ""),
    spellsTab: () =>
      openSection("🔮", "Заклинания", spellsBody) +
      (spellItemsHtml ? openSection("🌙", "Фокус и магические предметы", spellItemsHtml) : "") +
      `<div class="row parse-notes-row" style="margin:10px 0;gap:8px;align-items:center;flex-wrap:wrap">
        <button type="button" class="primary" data-parse-notes>Разобрать заметки</button>
        <span class="muted" data-parse-notes-status></span>
      </div>
      <div data-feature-blocks>${renderFeatureBlocksHtml(c)}</div>`,
    notesTab: () =>
      openSection("📝", "Заметки и характер", notesLines.length
        ? `<div class="hs-prose">${[
            ...(c.notes || []).slice(0, 6),
            ...(c.personality || []),
            ...(c.bonds || []),
            ...(c.feats || []),
            ...(c.traits || [])
          ]
            .map((l) => `<p>${escapeHtml(l)}</p>`)
            .join("")}</div>`
        : `<div class="muted">Нет заметок</div>`),
    inventoryTab: (lootItems = []) => {
      const lootHtml = (lootItems || [])
        .map(
          (i) => `
      <div class="hs-item hs-item-soft">
        <div class="hs-item-ico">${equipIcon(i.name)}</div>
        <div class="hs-item-body">
          <div class="hs-item-name">${escapeHtml(i.name)}</div>
          <div class="hs-item-meta">${escapeHtml(i.rarityLabel || i.type || "лут")}${
            i.description ? ` · ${escapeHtml(String(i.description).slice(0, 120))}` : ""
          }</div>
        </div>
      </div>`
        )
        .join("");
      const body =
        inventoryHtml || lootHtml
          ? `<div class="hs-item-grid">${inventoryHtml}${lootHtml}</div>`
          : `<div class="muted">Пока пусто — мастер выдаст лут</div>`;
      return openSection("💎", "Инвентарь и лут", body);
    }
  };
}

/**
 * HTML вкладки боевого листа (стиль hero-sheet).
 */
export function buildPlayerSheetTabHtml(c, tab, { lootItems = [] } = {}) {
  if (!c) return `<div class="muted">Сначала привяжите персонажа</div>`;
  const parts = buildCharacterSheetParts(c);
  if (tab === "combat") return `<div class="hero-sheet-tab">${parts.combatTab()}</div>`;
  if (tab === "actions") return `<div class="hero-sheet-tab">${parts.actionsTab()}</div>`;
  if (tab === "spells") return `<div class="hero-sheet-tab">${parts.spellsTab()}</div>`;
  if (tab === "inventory") return `<div class="hero-sheet-tab">${parts.inventoryTab(lootItems)}</div>`;
  if (tab === "notes") return `<div class="hero-sheet-tab">${parts.notesTab()}</div>`;
  return `<div class="muted">Неизвестная вкладка</div>`;
}

/**
 * @param {object} c — персонаж
 * @param {{ readonly?: boolean, showClose?: boolean, footerHtml?: string }} [opts]
 */
export function buildCharacterSheetHtml(c, opts = {}) {
  const readonly = Boolean(opts.readonly);
  const parts = buildCharacterSheetParts(c);

  const textBlock = (icon, title, lines) => {
    if (!lines?.length) return "";
    return accordionSection(
      icon,
      title,
      `<div class="hs-prose">${lines.map((l) => `<p>${escapeHtml(l)}</p>`).join("")}</div>`
    );
  };

  const subclassFeatBlock = () => {
    const items = c.subclassFeaturesTaken || [];
    if (!items.length) return "";
    return accordionSection(
      "⚔️",
      "Особенности подкласса",
      `<div class="hs-subfeat-list">
        ${items
          .map(
            (f) => `<article class="hs-subfeat">
              <div class="hs-subfeat-name">${escapeHtml(f.name)}
                <span class="hs-tag">${escapeHtml(f.subclass || "")}</span>
                <span class="hs-tag">кл. ${escapeHtml(String(f.classLevel ?? ""))}</span>
              </div>
              ${f.description ? `<div class="hs-subfeat-desc">${escapeHtml(f.description)}</div>` : ""}
            </article>`
          )
          .join("")}
      </div>`
    );
  };

  const closeBtn = opts.showClose
    ? `<button type="button" id="closeHeroCardBtn" class="hs-close">Закрыть</button>`
    : "";

  const downloadBtn = `<button type="button" class="hs-download-btn" data-download-character="${escapeAttr(c.id || "")}" title="Скачать JSON персонажа">⬇ Скачать</button>`;
  const topActions = `<div class="hs-top-actions">${downloadBtn}${closeBtn}</div>`;
  const readonlyBanner = readonly
    ? `<div class="hs-readonly-banner">Только просмотр — редактирует мастер</div>`
    : "";
  const footer = opts.footerHtml || "";

  const portrait = c.portraitUrl
    ? `<img class="hero-portrait" src="${escapeAttr(c.portraitUrl)}" alt="${escapeAttr(c.name)}" />`
    : `<div class="hero-portrait placeholder">${escapeHtml((c.name || "?").slice(0, 1))}</div>`;

  return `
    ${readonlyBanner}
    <div class="hs-top">
      <div class="hs-top-main">
        ${portrait}
        <div class="hs-identity">
          <div class="hs-name-row">
            <h2 class="hs-name">${escapeHtml(c.name)}</h2>
            ${c.isTest ? '<span class="hs-badge">тест</span>' : ""}
            ${c.inspiration ? '<span class="hs-badge hs-badge-ok">вдохновение</span>' : ""}
          </div>
          <div class="hs-tags">
            ${tagHtml("🧬", c.race || "—")}
            ${(() => {
              const full = c.classes
                ? c.classes
                    .map((x) => `${x.name} ${x.level}${x.subclass ? ` (${x.subclass})` : ""}`)
                    .join(" / ")
                : `${c.className || "—"}${c.subclass ? ` (${c.subclass})` : ""} ${c.level ?? ""}`.trim();
              const short =
                c.classes?.length > 1
                  ? c.classes.map((x) => `${String(x.name || "").slice(0, 3)}.${x.level}`).join("/")
                  : c.subclass
                    ? `${c.className || c.classes?.[0]?.name || "—"} ${c.level ?? c.classes?.[0]?.level ?? ""} · ${String(c.subclass).slice(0, 12)}`
                    : full;
              return tagHtml("⚔️", short, full);
            })()}
            ${c.subclass ? tagHtml("🕊️", c.subclass) : ""}
            ${(() => {
              const a = alignmentShort(c.alignment || "—");
              return tagHtml("⚖️", a.short, a.full);
            })()}
            ${tagHtml("📜", c.background || "—")}
          </div>
          <div class="hs-player" title="${escapeAttr(c.playerName || "—")}">👤 Игрок: <strong>${escapeHtml(c.playerName || "—")}</strong></div>
        </div>
      </div>
      ${topActions}
    </div>

    <section class="hs-section hs-xp-section" id="heroXpSection"></section>

    ${parts.vitalsHtml}

    ${accordionSection("📊", "Характеристики", parts.abilitiesBody)}
    ${accordionSection("🎯", "Навыки", parts.skillsBody)}
    ${parts.weaponsHtml ? accordionSection("⚔️", "Оружие", `<div class="hs-item-grid">${parts.weaponsHtml}</div>`) : ""}
    ${parts.equipmentHtml ? accordionSection("🎒", "Снаряжение", `<div class="hs-item-grid">${parts.equipmentHtml}</div>`) : ""}
    ${
      c.preparedSpells?.length || c.alwaysPreparedSpells?.length || c.preparedSpellsDetailed?.length || parts.spellItemsHtml
        ? accordionSection("🔮", "Заклинания", parts.spellsBody + (parts.spellItemsHtml ? `<div class="hs-subtitle" style="margin-top:12px">Фокус и магические предметы</div>${parts.spellItemsHtml}` : ""))
        : ""
    }
    ${parts.inventoryHtml ? accordionSection("💎", "Инвентарь и лут", `<div class="hs-item-grid">${parts.inventoryHtml}</div>`) : ""}
    ${subclassFeatBlock()}
    ${textBlock("⚜️", "Умения и черты", c.traits)}
    ${textBlock("🧩", "Особенности", c.feats)}
    ${textBlock("🎭", "Характер", c.personality)}
    ${textBlock("🔗", "Привязанности", c.bonds)}
    ${textBlock("📖", "Предыстория", c.backgroundStory)}
    ${textBlock("📝", "Заметки", (c.notes || []).slice(0, 6))}
    ${footer}
  `;
}

/**
 * Делегирование кликов по характеристикам/навыкам листа.
 * @param {ParentNode|null} root
 * @param {{ onRoll?: (payload: { kind: string, ability?: string, skillKey?: string, label?: string, el: Element }) => void }} [opts]
 */
export function bindSheetRolls(root, opts = {}) {
  if (!root || typeof opts.onRoll !== "function") return;
  root.querySelectorAll("[data-roll]").forEach((el) => {
    if (el.dataset.rollBound === "1") return;
    el.dataset.rollBound = "1";
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
        el
      });
    });
  });
}
