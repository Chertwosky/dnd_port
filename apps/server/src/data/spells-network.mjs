/** Каталог заклинаний Open5e v2 SRD 2024 + русские названия/описания + кэш */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  describeSpellRu,
  spellNameRu,
  translateSpellField
} from "./spells-ru.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = path.join(__dirname, "spells-network-cache.json");
const CACHE_VERSION = 4;
export const CONTENT_SOURCE = "open5e-srd-2024";
const OPEN5E_V2 = "https://api.open5e.com/v2";
const DOCUMENT = "srd-2024";

const SCHOOL_RU = {
  abjuration: "Ограждение",
  conjuration: "Вызов",
  divination: "Прорицание",
  enchantment: "Очарование",
  evocation: "Воплощение",
  illusion: "Иллюзия",
  necromancy: "Некромантия",
  transmutation: "Преобразование"
};

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "dnd-port/0.1" }
  });
  if (!res.ok) throw new Error(`Open5e ${res.status} ${url}`);
  return res.json();
}

function parseClasses(raw) {
  if (Array.isArray(raw?.classes)) {
    return raw.classes
      .map((c) => String(c?.name || c?.key || c)
        .toLowerCase()
        .replace(/^srd-\d+_/, "")
        .trim())
      .filter(Boolean);
  }
  return [];
}

function schoolKey(raw) {
  if (typeof raw?.school === "object") return String(raw.school.key || raw.school.name || "").toLowerCase();
  return String(raw?.school || "").toLowerCase();
}

function componentsOf(raw) {
  const parts = [];
  if (raw.verbal) parts.push("V");
  if (raw.somatic) parts.push("S");
  if (raw.material) parts.push(raw.material_specified ? `M (${raw.material_specified})` : "M");
  return parts.join(", ");
}

function castingTimeOf(raw) {
  const t = String(raw.casting_time || "").toLowerCase().replace(/-/g, "_");
  if (t === "action") return "1 action";
  if (t === "bonus_action" || t === "bonus action" || t === "1 bonus action") return "1 bonus action";
  if (t === "reaction" || t === "1 reaction") return "1 reaction";
  return raw.casting_time || "";
}

function mapSpell(raw) {
  const nameEn = String(raw.name || "Spell");
  const level = Number(raw.level ?? 0) || 0;
  const classes = parseClasses(raw);
  const desc = String(raw.desc || "").trim();
  const higherLevel = String(raw.higher_level || "").trim();
  const school = schoolKey(raw);
  const slug = String(raw.key || nameEn.toLowerCase().replace(/\s+/g, "-")).replace(/^srd-\d+_/, "");
  const base = {
    id: `open5e:${slug}`,
    slug,
    nameEn,
    level,
    levelLabel: level === 0 ? "Заговор" : `${level} круг`,
    school,
    schoolLabel: SCHOOL_RU[school] || school,
    classes,
    description: desc,
    higherLevel,
    ritual: Boolean(raw.ritual),
    concentration: Boolean(raw.concentration),
    castingTime: castingTimeOf(raw),
    range: raw.range_text || (raw.range != null ? `${raw.range} feet` : ""),
    components: componentsOf(raw),
    duration: raw.duration || "",
    document: raw.document?.key || DOCUMENT,
    source: CONTENT_SOURCE
  };
  const ru = describeSpellRu(base);
  const name = spellNameRu(nameEn);
  return {
    ...base,
    name: name === nameEn ? applyLightRuName(nameEn) : name,
    castingTimeRu: translateSpellField(base.castingTime),
    rangeRu: translateSpellField(base.range),
    durationRu: translateSpellField(base.duration),
    summaryRu: ru.summaryRu,
    descriptionRu: ru.descriptionRu,
    higherLevelRu: ru.higherLevelRu
  };
}

/** Если нет словарного имени — хотя бы не оставляем полностью EN без попытки */
function applyLightRuName(nameEn) {
  return String(nameEn || "");
}

async function fetchAllOpen5eSpells(onProgress) {
  const items = [];
  let url = `${OPEN5E_V2}/spells/?document__key__iexact=${DOCUMENT}&limit=100`;
  let page = 0;
  while (url) {
    page += 1;
    const data = await fetchJson(url);
    const batch = Array.isArray(data.results) ? data.results : [];
    items.push(...batch.map(mapSpell));
    if (onProgress) {
      onProgress({ current: items.length, message: `SRD 2024 spells… стр. ${page}` });
    }
    url = data.next || null;
  }
  return items;
}

function localizeCachedItem(sp) {
  const ru = describeSpellRu(sp || {});
  const nameEn = sp.nameEn || sp.name;
  const name = spellNameRu(nameEn);
  return {
    ...sp,
    name: name === nameEn ? sp.name || nameEn : name,
    castingTimeRu: translateSpellField(sp.castingTime),
    rangeRu: translateSpellField(sp.range),
    durationRu: translateSpellField(sp.duration),
    summaryRu: ru.summaryRu,
    descriptionRu: ru.descriptionRu || sp.descriptionRu || "",
    higherLevelRu: ru.higherLevelRu || sp.higherLevelRu || ""
  };
}

let memoryCache = null;

export async function loadSpellsFromNetwork({ forceRefresh = false, onProgress } = {}) {
  const report = (percent, message) => {
    if (onProgress) onProgress({ percent, message });
  };

  if (!forceRefresh) {
    if (memoryCache?.items?.length && memoryCache.version === CACHE_VERSION) {
      memoryCache.items = memoryCache.items.map(localizeCachedItem);
      report(100, `Из памяти: ${memoryCache.items.length}`);
      return { ...memoryCache, fromCache: true };
    }
    try {
      const cached = JSON.parse(await readFile(CACHE_PATH, "utf8"));
      if (Array.isArray(cached.items) && cached.items.length > 50 && cached.version === CACHE_VERSION) {
        cached.items = cached.items.map(localizeCachedItem);
        memoryCache = cached;
        report(100, `Из кэша: ${cached.items.length}`);
        return { ...cached, fromCache: true };
      }
    } catch {
      /* no cache */
    }
  }

  report(5, "Загрузка SRD 2024 заклинаний Open5e…");
  const items = await fetchAllOpen5eSpells(({ message }) => report(40, message));
  if (!items.length) throw new Error("Не удалось загрузить заклинания SRD 2024");

  const payload = {
    version: CACHE_VERSION,
    contentSource: CONTENT_SOURCE,
    fetchedAt: new Date().toISOString(),
    sources: [`api.open5e.com/v2/spells?document__key__iexact=${DOCUMENT}`],
    items
  };
  await mkdir(path.dirname(CACHE_PATH), { recursive: true });
  await writeFile(CACHE_PATH, JSON.stringify(payload), "utf8");
  memoryCache = payload;
  report(100, `Готово: ${items.length} заклинаний SRD 2024`);
  return { ...payload, fromCache: false };
}

export function filterSpells(items, filter = {}) {
  const classes = (filter.classes || []).map((c) => String(c).toLowerCase());
  const maxLevel = filter.maxLevel == null ? 9 : Number(filter.maxLevel);
  const q = String(filter.q || "")
    .trim()
    .toLowerCase();
  const exclude = new Set((filter.excludeNames || []).map((n) => String(n).toLowerCase()));

  return (items || []).filter((sp) => {
    if (sp.level > maxLevel) return false;
    if (exclude.has(String(sp.name).toLowerCase()) || exclude.has(String(sp.nameEn).toLowerCase())) {
      return false;
    }
    if (classes.length) {
      const hit = sp.classes.some((c) => classes.some((want) => c.includes(want) || want.includes(c)));
      if (!hit) return false;
    }
    if (q) {
      const blob = `${sp.name} ${sp.nameEn} ${sp.summaryRu || ""} ${sp.descriptionRu || ""} ${sp.description || ""}`.toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  });
}

export function spellCardBrief(sp) {
  const localized = localizeCachedItem(sp);
  return {
    id: localized.id,
    name: localized.name,
    nameEn: localized.nameEn,
    level: localized.level,
    levelLabel: localized.levelLabel,
    schoolLabel: localized.schoolLabel,
    classes: localized.classes,
    summary: localized.summaryRu || "",
    description: (localized.descriptionRu || localized.description || "").slice(0, 900),
    higherLevel: (localized.higherLevelRu || localized.higherLevel || "").slice(0, 300),
    ritual: localized.ritual,
    concentration: localized.concentration,
    castingTime: localized.castingTimeRu || localized.castingTime,
    range: localized.rangeRu || localized.range,
    duration: localized.durationRu || localized.duration,
    components: localized.components
  };
}

function titleCaseSpellName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\b([a-zа-яё])/g, (ch) => ch.toUpperCase());
}

/** Поиск по EN/RU имени или slug (без учёта регистра) */
export function findSpellByName(items, rawName) {
  const needle = String(rawName || "")
    .trim()
    .toLowerCase();
  if (!needle) return null;
  const slug = needle.replace(/\s+/g, "-");
  return (
    (items || []).find((s) => {
      return (
        String(s.nameEn || "").toLowerCase() === needle ||
        String(s.name || "").toLowerCase() === needle ||
        String(s.slug || "")
          .toLowerCase()
          .replace(/^srd-\d+_/, "") === slug
      );
    }) || null
  );
}

/**
 * Обогащает список подготовленных заклинаний (строки EN/RU) карточками с RU-описанием.
 * Не меняет хранимый preparedSpells — только для ответа API.
 */
export async function enrichPreparedSpells(names) {
  const list = Array.isArray(names) ? names.map(String).filter(Boolean) : [];
  if (!list.length) return [];

  let items = [];
  try {
    const data = await loadSpellsFromNetwork({});
    items = data.items || [];
  } catch {
    /* каталог недоступен — fallback на словарь */
  }

  return list.map((raw) => {
    if (/^[a-f0-9]{24}$/i.test(String(raw).trim())) {
      const id = String(raw).trim();
      return {
        id: `lss:${id}`,
        name: `Карточка LSS`,
        nameEn: id,
        level: null,
        levelLabel: "",
        schoolLabel: "",
        classes: [],
        summary: "В JSON только id карточки, без имени заклинания.",
        description:
          "Long Story Short экспортировал заклинание в режиме «cards». Имя лежит на сервере LSS (нужна авторизация). В LSS переключите заклинания в текстовый режим и скачайте JSON снова — тогда появятся названия вроде guidance / cure wounds.",
        higherLevel: "",
        ritual: false,
        concentration: false,
        castingTime: "",
        range: "",
        duration: "",
        components: "",
        unresolvedLssId: id
      };
    }

    const found = findSpellByName(items, raw);
    if (found) return spellCardBrief(found);

    const title = titleCaseSpellName(raw);
    const nameRu = spellNameRu(title);
    const stub = {
      nameEn: title,
      name: nameRu,
      description: "",
      higherLevel: "",
      level: 0,
      levelLabel: "",
      schoolLabel: "",
      classes: [],
      ritual: false,
      concentration: false,
      castingTime: "",
      range: "",
      duration: "",
      components: "",
      id: `local:${title.toLowerCase().replace(/\s+/g, "-")}`,
      slug: title.toLowerCase().replace(/\s+/g, "-")
    };
    const ru = describeSpellRu(stub);
    const displayName = nameRu && nameRu !== title ? nameRu : String(raw);
    return {
      id: stub.id,
      name: displayName,
      nameEn: title,
      level: null,
      levelLabel: "",
      schoolLabel: "",
      classes: [],
      summary: ru.summaryRu || "",
      description: ru.descriptionRu || ru.summaryRu || "Описание не найдено в SRD.",
      higherLevel: "",
      ritual: false,
      concentration: false,
      castingTime: "",
      range: "",
      duration: "",
      components: ""
    };
  });
}
