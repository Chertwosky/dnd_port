/**
 * Стартовый пул героев для приключения «Тринадцать минут до конца».
 * Сырые JSON из Long Story Short (папка sample-characters).
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {Array<{ id: string, file: string, label: string }>} */
export const PARTY_ROSTER = [
  { id: "hero-katrissa", file: "katrissa.json", label: "Катрисса" },
  { id: "hero-duulan", file: "duulan.json", label: "Дуулан" },
  { id: "hero-gerrit", file: "gerrit.json", label: "Геррит" },
  { id: "hero-ignorina", file: "ignorina.json", label: "Игнорина" },
  { id: "hero-karkas", file: "karkas.json", label: "Каркас" }
];

export const PARTY_CHARACTER_IDS = new Set(PARTY_ROSTER.map((h) => h.id));

/**
 * @returns {Promise<Array<{ id: string, file: string, label: string, raw: string }>>}
 */
export async function loadPartyRawFiles() {
  const out = [];
  for (const hero of PARTY_ROSTER) {
    const raw = await readFile(path.join(__dirname, hero.file), "utf8");
    out.push({ ...hero, raw });
  }
  return out;
}
