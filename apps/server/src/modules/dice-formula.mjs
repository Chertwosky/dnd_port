/** Parse and roll dice formulas like "1d8+3", "2d6 + 1 колющий", "1d4/1d6". */

export const STANDARD_DICE = [4, 6, 8, 10, 12, 20];

/**
 * @param {string} raw
 * @returns {{ dice: Array<{ count: number, sides: number }>, bonus: number, source: string }}
 */
export function parseDiceFormula(raw) {
  const source = String(raw ?? "").trim();
  if (!source) {
    throw new Error("Нет формулы урона");
  }
  // Версатиль / альтернативы: берём первый вариант
  const text = source.split("/")[0].trim();
  const dice = [];
  const re = /(\d+)\s*[dд]\s*(\d+)/gi;
  let m;
  while ((m = re.exec(text))) {
    const count = Math.max(1, Math.min(40, Number(m[1]) || 1));
    const sides = Math.max(2, Math.min(100, Number(m[2]) || 2));
    dice.push({ count, sides });
  }
  if (!dice.length) {
    throw new Error(`Не разобрать урон: ${source}`);
  }
  const withoutDice = text.replace(/\d+\s*[dд]\s*\d+/gi, " ");
  let bonus = 0;
  for (const bm of withoutDice.matchAll(/([+-])\s*(\d+)/g)) {
    const n = Number(bm[2]) || 0;
    bonus += bm[1] === "-" ? -n : n;
  }
  return { dice, bonus, source };
}

/**
 * @param {{ dice: Array<{ count: number, sides: number }>, bonus: number }} formula
 */
export function rollParsedFormula(formula) {
  const parts = [];
  let total = Number(formula.bonus) || 0;
  for (const d of formula.dice || []) {
    const rolls = [];
    for (let i = 0; i < d.count; i += 1) {
      const r = 1 + Math.floor(Math.random() * d.sides);
      rolls.push(r);
      total += r;
    }
    parts.push(`${d.count}d${d.sides}(${rolls.join("+")})`);
  }
  const bonus = Number(formula.bonus) || 0;
  if (bonus !== 0) {
    parts.push(bonus > 0 ? `+${bonus}` : `${bonus}`);
  }
  return {
    parts,
    bonus,
    total,
    detail: `${parts.join(" ")} = ${total}`
  };
}

export function rollDiceFormula(raw) {
  const parsed = parseDiceFormula(raw);
  const rolled = rollParsedFormula(parsed);
  return { ...rolled, source: parsed.source, formula: parsed };
}

export function rollNdM(count, sides) {
  const n = Math.max(1, Math.min(40, Number(count) || 1));
  const s = Math.max(2, Math.min(100, Number(sides) || 20));
  return rollParsedFormula({ dice: [{ count: n, sides: s }], bonus: 0 });
}

export function fmtSigned(n) {
  const v = Number(n) || 0;
  return v >= 0 ? `+${v}` : `${v}`;
}
