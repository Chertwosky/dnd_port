/** Черты Open5e v2 SRD 2024: benefits[] + RU-описания эффектов */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cleanMarkdown } from "./subclasses-ru.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = path.join(__dirname, "feats-network-cache.json");
const CACHE_VERSION = 2;
export const CONTENT_SOURCE = "open5e-srd-2024";
const OPEN5E_V2 = "https://api.open5e.com/v2";
const DOCUMENT = "srd-2024";

const FEAT_NAME_RU = {
  "Ability Score Improvement": "Увеличение характеристик",
  Alert: "Бдительный",
  Archery: "Стрельба",
  "Boon of Combat Prowess": "Дар боевого мастерства",
  "Boon of Dimensional Travel": "Дар пространственного путешествия",
  "Boon of Fate": "Дар судьбы",
  "Boon of Irresistible Offense": "Дар неотразимой атаки",
  "Boon of Spell Recall": "Дар возврата заклинаний",
  "Boon of the Night Spirit": "Дар ночного духа",
  "Boon of Truesight": "Дар истинного зрения",
  Defense: "Оборона",
  Grappler: "Борец",
  "Great Weapon Fighting": "Сражение большим оружием",
  "Magic Initiate": "Посвящённый в магию",
  "Savage Attacker": "Свирепый атакующий",
  Skilled: "Умелый",
  "Two-Weapon Fighting": "Сражение двумя оружиями"
};

/**
 * Готовые RU-карточки: краткое «что даёт» + полный эффект.
 * Ключ — английское имя из Open5e.
 */
const FEAT_TEXT_RU = {
  "Ability Score Improvement": {
    summary: "+2 к одной характеристике или +1/+1 к двум (макс. 20).",
    description:
      "Увеличьте одну характеристику на 2 или две на 1 (не выше 20). Черту можно брать несколько раз."
  },
  Alert: {
    summary: "+БМ к инициативе; обмен инициативой с союзником.",
    description:
      "При броске инициативы добавляете бонус мастерства. Сразу после броска можете поменяться инициативой с одним согласным союзником в том же бою (если никто из вас не недееспособен)."
  },
  Archery: {
    summary: "+2 к атакам дальнобойным оружием.",
    description: "Получаете +2 к броскам атаки дальнобойным оружием."
  },
  "Boon of Combat Prowess": {
    summary: "+1 к характеристике (до 30); промах → попадание 1/ход.",
    description:
      "+1 к одной характеристике (макс. 30). Когда промахиваетесь атакой, можете вместо этого попасть; снова — с начала вашего следующего хода."
  },
  "Boon of Dimensional Travel": {
    summary: "+1 к характеристике; телепорт 30 фт после Атаки/Магии.",
    description:
      "+1 к одной характеристике (макс. 30). Сразу после действия Атака или Магия можете телепортироваться до 30 футов в свободное видимое пространство."
  },
  "Boon of Fate": {
    summary: "+1 к характеристике; ±2к4 к d20 тестам в радиусе 60 фт.",
    description:
      "+1 к одной характеристике (макс. 30). Когда вы или существо в пределах 60 футов преуспевает или проваливает проверку d20, можете бросить 2к4 и добавить или вычесть сумму из результата (1/короткий или длинный отдых — по правилам дара)."
  },
  "Boon of Irresistible Offense": {
    summary: "+1 к характеристике; игнор сопротивления дроби/колю/руб.",
    description:
      "+1 к одной характеристике (макс. 30). Дробящий, колющий и рубящий урон от вас игнорирует сопротивление. Натуральная 20 на атаке даёт доп. урон по правилам дара."
  },
  "Boon of Spell Recall": {
    summary: "+1 к характеристике; шанс вернуть ячейку 1–4 круга.",
    description:
      "+1 к одной характеристике (макс. 30). При сотворении заклинания ячейкой 1–4 круга бросаете 1к4: если выпало число круга ячейки — ячейка не тратится."
  },
  "Boon of the Night Spirit": {
    summary: "+1 к характеристике; невидимость в тусклом свете/тьме.",
    description:
      "+1 к одной характеристике (макс. 30). В тусклом свете или тьме бонусным действием можете стать невидимым; условие заканчивается, если атакуете, творите заклинание или оказываетесь на ярком свете."
  },
  "Boon of Truesight": {
    summary: "+1 к характеристике; истинное зрение 60 фт.",
    description: "+1 к одной характеристике (макс. 30). Получаете истинное зрение на 60 футов."
  },
  Defense: {
    summary: "+1 КД в доспехе.",
    description: "Пока носите лёгкий, средний или тяжёлый доспех, получаете +1 к КД."
  },
  Grappler: {
    summary: "+1 Сила/Ловкость; захват + урон одной атакой без оружия.",
    description:
      "+1 Сила или Ловкость (макс. 20). При попадании безоружным ударом в свой ход можете нанести урон и одновременно попытаться схватить цель."
  },
  "Great Weapon Fighting": {
    summary: "1–2 на кости урона двуручным → считаются как 3.",
    description:
      "При уроне рукопашным оружием в двух руках любая 1 или 2 на кости урона считается как 3 (оружие с Двуручным или Универсальным)."
  },
  "Magic Initiate": {
    summary: "2 заговора + 1 заклинание 1 круга из жреца/друида/волшебника.",
    description:
      "Выучите два заговора из списка жреца, друида или волшебника. Характеристика сотворения — Инт, Мдр или Хар (выберите при взятии). Также выучите одно заклинание 1 круга того же списка: 1/длинный отдых без ячейки и можете тратить ячейки."
  },
  "Savage Attacker": {
    summary: "1/ход: дважды бросить кости урона оружия, взять лучший.",
    description:
      "Раз за ход при попадании оружием можете бросить кости урона оружия дважды и использовать любой из результатов."
  },
  Skilled: {
    summary: "Владение тремя навыками или инструментами.",
    description: "Получаете владение любой комбинацией из трёх навыков или инструментов. Черту можно брать несколько раз."
  },
  "Two-Weapon Fighting": {
    summary: "Модификатор характеристики к урону бонусной атаки лёгким оружием.",
    description:
      "Когда делаете дополнительную атаку из‑за свойства Лёгкое, можете добавить модификатор характеристики к урону этой атаки, если ещё не добавляете."
  }
};

/** Локальные механики для applyLevelUp */
const FEAT_MECHANICS = {
  Tough: { hpPerLevel: 2 },
  Skilled: { skillPicks: 3 },
  "Ability Score Improvement": { asi: true }
};

const PHRASES = [
  ["You gain the following benefits.", ""],
  ["You gain the following benefits", ""],
  ["the following benefits.", ""],
  ["the following benefits", ""],
  ["Ability Score", "характеристику"],
  ["ability score", "характеристику"],
  ["saving throw", "спасбросок"],
  ["Armor Class", "Класс Доспеха"],
  ["hit points", "хиты"],
  ["Proficiency Bonus", "бонус мастерства"],
  ["proficiency bonus", "бонус мастерства"],
  ["Bonus Action", "бонусное действие"],
  ["Attack action", "действие Атака"],
  ["Magic action", "действие Магия"],
  ["Unarmed Strike", "безоружный удар"],
  ["Ranged weapons", "дальнобойным оружием"],
  ["Melee weapon", "рукопашным оружием"],
  ["spell slot", "ячейку заклинаний"],
  ["cantrips", "заговоры"],
  ["cantrip", "заговор"],
  ["Truesight", "истинное зрение"],
  ["Invisible condition", "состояние невидимости"],
  ["Incapacitated condition", "состояние недееспособности"],
  ["Dim Light or Darkness", "тусклый свет или тьма"],
  ["advantage on", "преимущество на"],
  ["You gain", "Вы получаете"],
  ["You learn", "Вы изучаете"],
  ["You have", "У вас есть"],
  ["Increase one", "Увеличьте одну"],
  ["Increase your", "Увеличьте"],
  ["by 1", "на 1"],
  ["by 2", "на 2"],
  ["to a maximum of", "не выше"],
  ["feet", "фт."],
  ["Once per turn", "Раз за ход"],
  ["Once you use this benefit", "После использования"],
  ["you can't use it again until", "нельзя снова до"],
  ["the start of your next turn", "начала вашего следующего хода"]
];

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "dnd-port/0.1" }
  });
  if (!res.ok) throw new Error(`Open5e ${res.status} ${url}`);
  return res.json();
}

function translateDesc(text) {
  let t = cleanMarkdown(String(text || ""));
  for (const [en, ru] of PHRASES) t = t.split(en).join(ru);
  return t.replace(/\s+/g, " ").trim();
}

function benefitsText(raw) {
  const parts = (raw.benefits || [])
    .map((b) => cleanMarkdown(String(b?.desc || "").trim()))
    .filter(Boolean);
  if (parts.length) return parts.join(" ");
  return cleanMarkdown(String(raw.desc || raw.description || "").trim());
}

function isStubDescription(text) {
  const t = String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return true;
  if (/^вы получаете\.?$/.test(t)) return true;
  if (/following benefits/.test(t)) return true;
  if (/вы получаете the /.test(t)) return true;
  return false;
}

function mapFeat(raw) {
  const nameEn = String(raw.name || "Feat");
  const mech = FEAT_MECHANICS[nameEn] || {};
  const ru = FEAT_TEXT_RU[nameEn] || null;
  const rawBenefits = benefitsText(raw);
  const translated = translateDesc(rawBenefits);
  const nameRu = FEAT_NAME_RU[nameEn] || nameEn;

  let description = ru?.description || "";
  if (!description || isStubDescription(description)) {
    description = !isStubDescription(translated) ? translated : "";
  }
  if (!description || description === nameRu || description === nameEn) {
    description = ru?.summary || translated || nameRu;
  }

  const summary =
    ru?.summary ||
    (!isStubDescription(translated) ? translated.slice(0, 140) + (translated.length > 140 ? "…" : "") : "") ||
    description.slice(0, 140);

  return {
    id: `open5e:${raw.key || nameEn.toLowerCase().replace(/\s+/g, "-")}`,
    key: raw.key || "",
    nameEn,
    name: nameRu,
    summary,
    description,
    category: raw.type || raw.category || "",
    prerequisite: String(raw.prerequisite || "").trim(),
    ...mech,
    source: CONTENT_SOURCE
  };
}

let memoryCache = null;

export async function loadFeatsFromNetwork({ forceRefresh = false, onProgress } = {}) {
  const report = (percent, message) => {
    if (onProgress) onProgress({ percent, message });
  };

  if (!forceRefresh) {
    if (memoryCache?.items?.length && memoryCache.version === CACHE_VERSION) {
      report(100, `Из памяти: ${memoryCache.items.length}`);
      return { ...memoryCache, fromCache: true };
    }
    try {
      const cached = JSON.parse(await readFile(CACHE_PATH, "utf8"));
      if (Array.isArray(cached.items) && cached.items.length >= 5 && cached.version === CACHE_VERSION) {
        memoryCache = cached;
        report(100, `Из кэша: ${cached.items.length}`);
        return { ...cached, fromCache: true };
      }
    } catch {
      /* no cache */
    }
  }

  report(10, "Загрузка черт SRD 2024…");
  const items = [];
  let url = `${OPEN5E_V2}/feats/?document__key__iexact=${DOCUMENT}&limit=100`;
  while (url) {
    const data = await fetchJson(url);
    const batch = Array.isArray(data.results) ? data.results : [];
    items.push(...batch.map(mapFeat));
    url = data.next || null;
  }
  if (!items.length) throw new Error("Не удалось загрузить черты SRD 2024");

  items.push({
    id: "custom",
    name: "Своя черта",
    nameEn: "Custom",
    summary: "Название и эффект вручную.",
    description: "Введите название и описание вручную.",
    category: "Custom",
    custom: true,
    source: "local"
  });

  const payload = {
    version: CACHE_VERSION,
    contentSource: CONTENT_SOURCE,
    fetchedAt: new Date().toISOString(),
    sources: [`api.open5e.com/v2/feats?document__key__iexact=${DOCUMENT}`],
    items
  };
  await mkdir(path.dirname(CACHE_PATH), { recursive: true });
  await writeFile(CACHE_PATH, JSON.stringify(payload), "utf8");
  memoryCache = payload;
  report(100, `Готово: ${items.length} черт`);
  return { ...payload, fromCache: false };
}

export function peekFeatsCache() {
  return memoryCache?.items || null;
}

export function isEpicBoonFeat(feat = {}) {
  const cat = String(feat.category || "");
  const name = `${feat.nameEn || ""} ${feat.name || ""} ${feat.id || ""} ${feat.key || ""}`;
  return /epic\s*boon/i.test(cat) || /\bboon of\b/i.test(name) || /дар (боевого|простран|судьб|неотраз|возврат|ночн|истинн)/i.test(name);
}

/** Черты для шага ASI / Epic Boon (не стили боя, не дубль ASI) */
export function filterFeatsForLevelUp(items, { epicBoon = false } = {}) {
  const list = items || [];
  if (epicBoon) {
    const boons = list.filter((f) => isEpicBoonFeat(f) || f.custom);
    return boons.length ? boons : list.filter((f) => f.custom);
  }
  return list.filter((f) => {
    if (f.custom) return true;
    if (isEpicBoonFeat(f)) return false;
    const cat = String(f.category || "").toLowerCase();
    if (cat.includes("fighting style")) return false;
    if (f.asi || f.nameEn === "Ability Score Improvement") return false;
    return cat.includes("general") || cat.includes("origin") || !cat;
  });
}

export function featCardBrief(f) {
  const name = f.name || f.nameEn || "Черта";
  let description = String(f.description || "").trim();
  let summary = String(f.summary || "").trim();
  if (isStubDescription(description) || description === name || description === f.nameEn) {
    description = summary || description;
  }
  if (isStubDescription(summary) || summary === name || summary === description) {
    summary = description && description !== name ? description.slice(0, 160) : summary;
  }
  if (summary === description) {
    // в карточке summary короткий, description полный — не дублировать имя трижды
    summary = description.length > 120 ? `${description.slice(0, 120)}…` : description;
  }
  return {
    id: f.id,
    name,
    nameEn: f.nameEn,
    summary: summary.slice(0, 220),
    description: description.slice(0, 900),
    category: f.category || "",
    prerequisite: f.prerequisite || "",
    skillPicks: f.skillPicks || 0,
    hpPerLevel: f.hpPerLevel || 0,
    asi: Boolean(f.asi),
    custom: Boolean(f.custom)
  };
}
