/** Базовые классы Open5e v2 SRD 2024 — особенности по уровням */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { localizeClassFeature, looksEnglish } from "./subclasses-ru.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = path.join(__dirname, "classes-network-cache.json");
const CACHE_VERSION = 2;
export const CONTENT_SOURCE = "open5e-srd-2024";
const OPEN5E_V2 = "https://api.open5e.com/v2";
const DOCUMENT = "srd-2024";

const CLASS_NAME_RU = {
  Barbarian: "Варвар",
  Bard: "Бард",
  Cleric: "Жрец",
  Druid: "Друид",
  Fighter: "Воин",
  Monk: "Монах",
  Paladin: "Паладин",
  Ranger: "Следопыт",
  Rogue: "Плут",
  Sorcerer: "Чародей",
  Warlock: "Колдун",
  Wizard: "Волшебник"
};

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "dnd-port/0.1" }
  });
  if (!res.ok) throw new Error(`Open5e ${res.status} ${url}`);
  return res.json();
}

function featureLevels(feature) {
  return (feature?.gained_at || [])
    .map((g) => Number(g?.level))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function mapClass(raw) {
  const nameEn = String(raw.name || "Class");
  const key = String(raw.key || nameEn.toLowerCase()).replace(/^srd-\d+_/, "");
  const features = (raw.features || []).map((f) => {
    const nameEnF = f.name || "Feature";
    return localizeClassFeature(
      {
        id: f.key || `${key}:${nameEnF}`,
        nameEn: nameEnF,
        name: nameEnF,
        description: f.desc || "",
        levels: featureLevels(f),
        featureType: f.feature_type || ""
      },
      nameEn
    );
  });
  return {
    id: `open5e:${raw.key || key}`,
    key,
    nameEn,
    name: CLASS_NAME_RU[nameEn] || nameEn,
    hitDie: raw.hit_dice || raw.hit_die || "",
    features,
    document: DOCUMENT,
    source: CONTENT_SOURCE
  };
}

function relocalizeCached(payload) {
  if (!payload?.items?.length) return payload;
  return {
    ...payload,
    version: CACHE_VERSION,
    items: payload.items.map((cls) => ({
      ...cls,
      features: (cls.features || []).map((f) =>
        localizeClassFeature(
          {
            ...f,
            description: f.descriptionEn || f.description || ""
          },
          cls.nameEn
        )
      )
    }))
  };
}

let memoryCache = null;

export async function loadClassesFromNetwork({ forceRefresh = false, onProgress } = {}) {
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
      if (Array.isArray(cached.items) && cached.items.length >= 10) {
        // Старый кэш мог сохранить английский текст — всегда прогоняем локализацию
        const fixed = relocalizeCached(cached);
        memoryCache = fixed;
        if (cached.version !== CACHE_VERSION) {
          await writeFile(CACHE_PATH, JSON.stringify(fixed), "utf8");
        }
        report(100, `Из кэша: ${fixed.items.length}`);
        return { ...fixed, fromCache: true };
      }
    } catch {
      /* no cache */
    }
  }

  report(10, "Загрузка классов SRD 2024…");
  const items = [];
  let url = `${OPEN5E_V2}/classes/?is_subclass=false&document__key__iexact=${DOCUMENT}&limit=50`;
  while (url) {
    const data = await fetchJson(url);
    const batch = Array.isArray(data.results) ? data.results : [];
    items.push(...batch.map(mapClass));
    url = data.next || null;
  }
  if (!items.length) throw new Error("Не удалось загрузить классы SRD 2024");

  const payload = {
    version: CACHE_VERSION,
    contentSource: CONTENT_SOURCE,
    fetchedAt: new Date().toISOString(),
    sources: [`api.open5e.com/v2/classes?document__key__iexact=${DOCUMENT}`],
    items
  };
  await mkdir(path.dirname(CACHE_PATH), { recursive: true });
  await writeFile(CACHE_PATH, JSON.stringify(payload), "utf8");
  memoryCache = payload;
  report(100, `Готово: ${items.length} классов`);
  return { ...payload, fromCache: false };
}

export function peekClassesCache() {
  return memoryCache?.items || null;
}

export function findClass(items, classNameOrEn) {
  const needle = String(classNameOrEn || "")
    .trim()
    .toLowerCase();
  if (!needle) return null;
  return (
    (items || []).find(
      (c) =>
        c.key === needle ||
        c.nameEn.toLowerCase() === needle ||
        c.name.toLowerCase() === needle ||
        needle.includes(c.key)
    ) || null
  );
}

/** Особенности класса на конкретном уровне (для шага «Умения»). */
export function featuresForClassLevelNetwork(items, classNameOrEn, classLevel) {
  const cls = findClass(items, classNameOrEn);
  if (!cls) return [];
  const level = Number(classLevel) || 0;
  return (cls.features || [])
    .filter((f) => !level || (f.levels || []).includes(level))
    .map((f) => {
      const localized = localizeClassFeature(f, cls.nameEn);
      const isSubclass =
        /subclass|archetype|domain|circle|college|patron|oath|origin|tradition/i.test(localized.nameEn) ||
        /подкласс|домен|круг|коллег|покровител|клятв|происхожден|традици|архетип/i.test(localized.name);
      return {
        id: localized.id,
        name: localized.name,
        nameEn: localized.nameEn,
        description: localized.description,
        pick: isSubclass,
        pickKind: isSubclass ? "subclass" : undefined
      };
    });
}

/** Слить локальные и сетевые особенности без дублей (RU/EN имена) */
export function mergeClassFeatures(localFeatures = [], networkFeatures = []) {
  const out = [];
  const seen = new Set();

  const ALIASES = {
    увеличениехарактеристик: "abilityscoreimprovement",
    эпическийдар: "epicboon",
    колдовство: "spellcasting",
    боевойстиль: "fightingstyle",
    дополнительнаяатака: "extraattack",
    мастерствооружия: "weaponmastery",
    подкласспаладина: "paladinsubclass",
    священнаяклятва: "paladinsubclass",
    подклассжреца: "clericsubclass",
    подклассдруида: "druidsubclass",
    подклассволшебника: "wizardsubclass"
  };

  const keyOf = (f) => {
    const en = String(f.nameEn || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
    const ru = String(f.name || "")
      .toLowerCase()
      .replace(/[^a-zа-яё0-9]+/gi, "");
    const raw = en || ru;
    return ALIASES[raw] || ALIASES[ru] || raw;
  };

  const prefer = (a, b) => {
    const desc =
      looksEnglish(b?.description) && !looksEnglish(a?.description)
        ? a.description
        : !looksEnglish(b?.description) && (b?.description || "").length >= (a?.description || "").length
          ? b.description
          : a?.description || b?.description || "";
    return {
      ...a,
      ...b,
      nameEn: a?.nameEn || b?.nameEn,
      name: !looksEnglish(b?.name) ? b.name : a?.name || b?.name,
      description: desc,
      pick: a?.pick || b?.pick,
      pickKind: a?.pickKind || b?.pickKind,
      pickLimit: a?.pickLimit ?? b?.pickLimit,
      pickFrom: a?.pickFrom || b?.pickFrom,
      options: a?.options || b?.options
    };
  };

  for (const f of localFeatures) {
    const k = keyOf(f);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push({ ...f, nameEn: f.nameEn || undefined });
  }
  for (const f of networkFeatures) {
    const k = keyOf(f);
    if (!k) continue;
    if (seen.has(k)) {
      const idx = out.findIndex((x) => keyOf(x) === k);
      if (idx >= 0) out[idx] = prefer(out[idx], f);
      continue;
    }
    seen.add(k);
    out.push(f);
  }
  return out;
}

/** ASI / Epic Boon выбираются на шаге «Улучшение», не дублируем на «Умения» */
export function isImprovementFeature(f = {}) {
  const blob = `${f.nameEn || ""} ${f.name || ""} ${f.id || ""}`.toLowerCase();
  return (
    /ability.?score|asi-?\d|увеличение характеристик|epic.?boon|эпическ(ий|ого)? дар/.test(blob)
  );
}
