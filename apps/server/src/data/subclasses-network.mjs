/** Каталог подклассов Open5e SRD 2024 + кэш */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { localizeSubclassFeature, subclassDescRu } from "./subclasses-ru.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = path.join(__dirname, "subclasses-network-cache.json");
export const CONTENT_SOURCE = "open5e-srd-2024";
export const DEFAULT_SUBCLASS_EDITION = "2024";
const OPEN5E_V2 = "https://api.open5e.com/v2";
const DOCUMENTS = ["srd-2024"];
const CACHE_VERSION = 3;

const NAME_RU = {
  Champion: "Чемпион",
  "Circle of the Land": "Круг земли",
  "College of Lore": "Коллегия знаний",
  "Draconic Bloodline": "Драконья кровь",
  "Draconic Sorcery": "Драконья магия",
  Evoker: "Воплотитель",
  "Fiend Patron": "Покровитель — Исчадие",
  Hunter: "Охотник",
  "Life Domain": "Домен жизни",
  "Oath of Devotion": "Клятва преданности",
  "Path of the Berserker": "Путь берсерка",
  "School of Evocation": "Школа воплощения",
  "The Fiend": "Исчадие",
  Thief: "Вор",
  "Warrior of the Open Hand": "Воин открытой ладони",
  "Way of the Open Hand": "Путь открытой ладони"
};

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "dnd-port/0.1" }
  });
  if (!res.ok) throw new Error(`Open5e ${res.status} ${url}`);
  return res.json();
}

function parentClassEn(subclassOf) {
  const key = String(subclassOf?.key || subclassOf || "");
  const m = key.match(/(?:^|_)([a-z]+)$/i);
  return (m?.[1] || "").toLowerCase();
}

function featureLevels(feature) {
  return (feature?.gained_at || [])
    .map((g) => Number(g?.level))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function mapSubclass(raw) {
  const nameEn = String(raw.name || "Subclass");
  const parentEn = parentClassEn(raw.subclass_of);
  const document = String(raw.document?.key || raw.document || "");
  const features = (raw.features || []).map((f) => {
    const featEn = f.name || "Особенность";
    const localized = localizeSubclassFeature(
      {
        id: f.key || `${raw.key}:${featEn}`,
        name: featEn,
        nameEn: featEn,
        description: String(f.desc || "").trim(),
        levels: featureLevels(f)
      },
      nameEn
    );
    return localized;
  });
  return {
    id: `open5e:${raw.key || nameEn.toLowerCase().replace(/\s+/g, "-")}`,
    key: raw.key || "",
    name: NAME_RU[nameEn] || nameEn,
    nameEn,
    parentClassEn: parentEn,
    parentClassName: String(raw.subclass_of?.name || ""),
    document,
    edition: document.includes("2024") ? "2024" : "2014",
    description: subclassDescRu(nameEn, raw.desc || ""),
    features,
    source: CONTENT_SOURCE
  };
}

function localizeCachedSubclass(sc) {
  if (!sc) return sc;
  const nameEn = sc.nameEn || sc.name;
  return {
    ...sc,
    name: NAME_RU[nameEn] || sc.name || nameEn,
    description: subclassDescRu(nameEn, sc.description || sc.descriptionEn || ""),
    features: (sc.features || []).map((f) =>
      localizeSubclassFeature(
        {
          ...f,
          nameEn: f.nameEn || f.name,
          name: f.nameEn || f.name
        },
        nameEn
      )
    )
  };
}

async function fetchSrdSubclasses(onProgress) {
  const items = [];
  for (const doc of DOCUMENTS) {
    let url = `${OPEN5E_V2}/classes/?is_subclass=true&document__key__iexact=${doc}&limit=50`;
    let page = 0;
    while (url) {
      page += 1;
      const data = await fetchJson(url);
      const batch = Array.isArray(data.results) ? data.results : [];
      items.push(...batch.map(mapSubclass));
      if (onProgress) {
        onProgress({ current: items.length, message: `Open5e subclasses ${doc}… стр. ${page}` });
      }
      url = data.next || null;
    }
  }
  const byId = new Map();
  for (const item of items) {
    if (!item.parentClassEn) continue;
    byId.set(item.id, item);
  }
  return [...byId.values()].sort((a, b) => a.nameEn.localeCompare(b.nameEn));
}

let memoryCache = null;

export async function loadSubclassesFromNetwork({ forceRefresh = false, onProgress } = {}) {
  const report = (percent, message) => {
    if (onProgress) onProgress({ percent, message });
  };

  if (!forceRefresh) {
    if (memoryCache?.items?.length && memoryCache.version === CACHE_VERSION) {
      memoryCache = {
        ...memoryCache,
        items: memoryCache.items.map(localizeCachedSubclass)
      };
      report(100, `Из памяти: ${memoryCache.items.length}`);
      return { ...memoryCache, fromCache: true };
    }
    try {
      const cached = JSON.parse(await readFile(CACHE_PATH, "utf8"));
      if (Array.isArray(cached.items) && cached.items.length >= 10 && cached.version === CACHE_VERSION) {
        cached.items = cached.items.map(localizeCachedSubclass);
        memoryCache = cached;
        report(100, `Из кэша: ${cached.items.length}`);
        return { ...cached, fromCache: true };
      }
    } catch {
      /* no cache */
    }
  }

  report(5, "Загрузка Open5e SRD subclasses…");
  const items = await fetchSrdSubclasses(({ message }) => report(40, message));
  if (!items.length) throw new Error("Не удалось загрузить подклассы");

  const payload = {
    version: CACHE_VERSION,
    contentSource: CONTENT_SOURCE,
    fetchedAt: new Date().toISOString(),
    sources: ["api.open5e.com/v2", ...DOCUMENTS],
    items
  };
  await mkdir(path.dirname(CACHE_PATH), { recursive: true });
  await writeFile(CACHE_PATH, JSON.stringify(payload), "utf8");
  memoryCache = payload;
  report(100, `Готово: ${items.length} подклассов`);
  return { ...payload, fromCache: false };
}

export function peekSubclassesCache() {
  return memoryCache?.items || null;
}

/**
 * @param {object[]} items
 * @param {{ classEn?: string, edition?: string, q?: string }} filter
 * edition по умолчанию DEFAULT_SUBCLASS_EDITION; передайте "all" чтобы без фильтра.
 */
export function filterSubclasses(items, filter = {}) {
  const classEn = String(filter.classEn || "")
    .trim()
    .toLowerCase();
  const rawEdition = filter.edition == null || filter.edition === "" ? DEFAULT_SUBCLASS_EDITION : filter.edition;
  const edition =
    String(rawEdition).toLowerCase() === "all" ? "" : String(rawEdition).trim().toLowerCase();
  const q = String(filter.q || "")
    .trim()
    .toLowerCase();

  return (items || []).filter((sc) => {
    if (classEn && sc.parentClassEn !== classEn) return false;
    if (edition && String(sc.edition) !== edition) return false;
    if (q) {
      const blob = `${sc.name} ${sc.nameEn} ${sc.description}`.toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  });
}

function briefFeature(f, descLimit = 700) {
  return {
    id: f.id,
    name: f.name,
    description: String(f.description || "").slice(0, descLimit),
    levels: f.levels || []
  };
}

export function subclassCardBrief(sc, { classLevel } = {}) {
  const level = Number(classLevel) || 0;
  const all = sc.features || [];
  const featuresAtLevel =
    level > 0 ? all.filter((f) => (f.levels || []).includes(level)) : all;
  // «Дальше» — только особенности, которые впервые открываются позже текущего уровня
  const featuresLater =
    level > 0
      ? all
          .filter((f) => {
            const levels = f.levels || [];
            if (!levels.length) return false;
            return Math.min(...levels) > level;
          })
          .sort((a, b) => Math.min(...a.levels) - Math.min(...b.levels))
      : [];
  return {
    id: sc.id,
    key: sc.key,
    name: sc.name,
    nameEn: sc.nameEn,
    parentClassEn: sc.parentClassEn,
    parentClassName: sc.parentClassName,
    edition: sc.edition,
    document: sc.document,
    description: (sc.description || "").slice(0, 800),
    featuresAtLevel: featuresAtLevel.map((f) => briefFeature(f, 900)),
    featuresAll: all.map((f) => briefFeature(f, 500)),
    featuresLater: featuresLater.map((f) => briefFeature(f, 400)),
    featureCount: all.length
  };
}

export function findSubclass(items, subclassNameOrId) {
  const needle = String(subclassNameOrId || "")
    .trim()
    .toLowerCase();
  if (!needle) return null;
  return (
    (items || []).find(
      (s) =>
        s.id.toLowerCase() === needle ||
        s.key.toLowerCase() === needle ||
        s.name.toLowerCase() === needle ||
        s.nameEn.toLowerCase() === needle
    ) || null
  );
}

export function featuresForSubclassLevel(items, subclassNameOrId, classLevel) {
  const sc = findSubclass(items, subclassNameOrId);
  if (!sc) return [];
  const level = Number(classLevel) || 0;
  return (sc.features || [])
    .filter((f) => !level || (f.levels || []).includes(level))
    .map((f) => ({
      id: f.id,
      name: f.name,
      description: f.description,
      levels: f.levels,
      fromSubclass: sc.name,
      subclassId: sc.id
    }));
}
