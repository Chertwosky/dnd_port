/** Чек-лист прокачки SRD 2024 */

import {
  RULESET,
  isAsiClassLevel,
  isEpicBoonClassLevel,
  subclassAllowed,
  subclassRequired,
  computeSpellcastingSlots,
  multiclassCasterLevel,
  maxSpellLevelForClass,
  newSpellPicksForAdvance,
  newCantripPicksForAdvance,
  preparationLimit,
  applyLevelUp,
  buildLevelUpOptions,
  checkMulticlassPrerequisites,
  subclassLevelForClass,
  CLASS_LIST
} from "../apps/server/src/data/level-progress.mjs";

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

assert(RULESET === "dnd5e-2024", "ruleset 2024");
assert(subclassLevelForClass("жрец") === 3, "cleric subclass @3");
assert(subclassLevelForClass("чародей") === 3, "sorcerer subclass @3");
assert(subclassLevelForClass("волшебник") === 3, "wizard subclass @3");
assert(CLASS_LIST.find((c) => c.en === "artificer")?.available === false, "artificer hidden");

assert(isAsiClassLevel("воин", 6), "fighter 6 ASI");
assert(!isAsiClassLevel("волшебник", 6), "wizard 6 no ASI");
assert(!isAsiClassLevel("плут", 10), "rogue 10 no ASI in 2024");
assert(isAsiClassLevel("плут", 8), "rogue 8 ASI");
assert(!isAsiClassLevel("паладин", 19), "paladin 19 is not ASI");
assert(isEpicBoonClassLevel("паладин", 19), "paladin 19 epic boon");

assert(!subclassAllowed("паладин", 2), "no subclass before 3");
assert(subclassAllowed("паладин", 3), "subclass at 3");
assert(subclassRequired("паладин", 3, ""), "subclass required at 3 if empty");
assert(!subclassRequired("паладин", 3, "Клятва"), "not required if already set");
assert(!subclassRequired("паладин", 4, ""), "not required at 4");

const pal1 = computeSpellcastingSlots([{ name: "Паладин", level: 1 }]).slots;
assert(pal1.slots1 === 2, `paladin 1 slots got ${JSON.stringify(pal1)}`);

const pal5 = computeSpellcastingSlots([{ name: "Паладин", level: 5 }]).slots;
assert(pal5.slots1 === 4 && pal5.slots2 === 2, `paladin 5 slots got ${JSON.stringify(pal5)}`);

const war3 = computeSpellcastingSlots([{ name: "Колдун", level: 3 }]);
assert(war3.pact?.pactSlots === 2 && war3.pact?.pactSlotLevel === 2, `warlock pact ${JSON.stringify(war3.pact)}`);
assert(!war3.shared.slots1, "warlock has no shared slots alone");

// SRD 2024 multiclass: wizard 3 + paladin 4 = 3 + ceil(4/2) = 5
const mcLv = multiclassCasterLevel([
  { name: "Волшебник", level: 3 },
  { name: "Паладин", level: 4 }
]);
assert(mcLv.multiclassLevel === 5, `multiclass level ${mcLv.multiclassLevel}`);

const multi = computeSpellcastingSlots([
  { name: "Волшебник", level: 3 },
  { name: "Паладин", level: 4 }
]);
assert(multi.multiclassLevel === 5, `multiclass level ${multi.multiclassLevel}`);
assert(multi.slots.slots1 === 4 && multi.slots.slots2 === 3 && multi.slots.slots3 === 2, JSON.stringify(multi.slots));

// half+half: pal 3 + ranger 3 = ceil(3/2)+ceil(3/2) = 2+2 = 4
const halfHalf = multiclassCasterLevel([
  { name: "Паладин", level: 3 },
  { name: "Следопыт", level: 3 }
]);
assert(halfHalf.multiclassLevel === 4, `half+half ${halfHalf.multiclassLevel}`);

assert(maxSpellLevelForClass("Паладин", 1) === 1, "paladin L1 prepare circle 1");
assert(maxSpellLevelForClass("Паладин", 5) === 2, "paladin L5 prepare circle 2");
assert(maxSpellLevelForClass("Волшебник", 5) === 3, "wizard L5 prepare circle 3");

assert(newSpellPicksForAdvance("бард", 5, 4) === 0, "bard prepared no known picks");
assert(newSpellPicksForAdvance("жрец", 5, 4) === 0, "cleric prepared");
assert(newSpellPicksForAdvance("волшебник", 5, 4) === 2, "wizard +2 book");
assert(newSpellPicksForAdvance("следопыт", 5, 4) === 0, "ranger prepared no known picks");
assert(newCantripPicksForAdvance("бард", 4, 3) === 1, "bard cantrip at 4");

const prepChar = {
  abilities: { cha: { score: 16, modifier: 3 }, int: { score: 16, modifier: 3 }, wis: { score: 14, modifier: 2 } }
};
assert(preparationLimit(prepChar, "Паладин", 5) === 6, "paladin prep table L5");
assert(preparationLimit(prepChar, "Бард", 1) === 4, "bard prep table L1");
assert(preparationLimit(prepChar, "Волшебник", 1) === 4, "wizard prep table L1");

const weak = {
  abilities: {
    str: { score: 10, modifier: 0 },
    cha: { score: 10, modifier: 0 },
    dex: { score: 10, modifier: 0 },
    wis: { score: 10, modifier: 0 },
    int: { score: 10, modifier: 0 },
    con: { score: 10, modifier: 0 }
  },
  classes: [{ name: "Воин", level: 2 }]
};
const bad = checkMulticlassPrerequisites(weak, { mode: "new", className: "Паладин" });
assert(!bad.ok, "should fail multiclass prereqs");

const char = {
  experience: 6500,
  level: 3,
  className: "Паладин",
  classes: [{ name: "Паладин", level: 3, subclass: "Клятва преданности" }],
  abilities: {
    str: { score: 16, modifier: 3 },
    dex: { score: 10, modifier: 0 },
    con: { score: 14, modifier: 2 },
    int: { score: 8, modifier: -1 },
    wis: { score: 10, modifier: 0 },
    cha: { score: 15, modifier: 2 }
  },
  vitals: { hpMax: 28, hpCurrent: 28, hitDie: "d10" },
  skills: [],
  traits: [],
  featsTaken: [],
  spellBook: [],
  preparedSpells: [],
  spellcasting: {}
};
const opt = buildLevelUpOptions(char, {});
assert(opt.ruleset === "dnd5e-2024", "options ruleset");
assert(opt.asiAvailable === true, "paladin 4 has ASI");
assert(opt.epicBoonAvailable === false, "not epic at 4");
assert(opt.advance.subclassAllowed === true, "subclass allowed at 4");
assert(opt.spellOptions.suggestedSlots.slots1 === 3, `pal4 slots ${JSON.stringify(opt.spellOptions.suggestedSlots)}`);
assert(opt.spellOptions.spellMode === "prepared", "paladin prepared");
assert(opt.spellOptions.picksAllowed === 0, "paladin no known picks");
assert(opt.spellOptions.maxSpellLevel === 1, `pal4 prepare max ${opt.spellOptions.maxSpellLevel}`);
assert(opt.spellOptions.preparationLimit === 5, `pal4 prep limit ${opt.spellOptions.preparationLimit}`);
assert(!opt.availableClasses.some((c) => c.en === "artificer" || c.id === "изобретатель"), "no artificer in pick list");

const early = {
  ...char,
  experience: 300,
  level: 1,
  classes: [{ name: "Паладин", level: 1, subclass: "" }]
};
const earlyOpt = buildLevelUpOptions(early, {});
assert(earlyOpt.advance.toClassLevel === 2, "to class level 2");
assert(earlyOpt.advance.subclassAllowed === false, "no subclass pick at 2");
assert(earlyOpt.asiAvailable === false, "no ASI at 2");

let rejectedEarlySub = false;
try {
  applyLevelUp(early, {
    advanceClass: { mode: "existing", className: "Паладин", subclass: "Клятва преданности" },
    hpGain: 7,
    improveType: "none"
  });
} catch {
  rejectedEarlySub = true;
}
assert(rejectedEarlySub, "reject subclass before level 3");

const next = applyLevelUp(char, {
  advanceClass: { mode: "existing", className: "Паладин", subclass: "Клятва преданности" },
  hpGain: 8,
  improveType: "asi",
  asi: { mode: "plus2", a: "str" }
});
assert(next.level === 4, "level 4");
assert(next.abilities.str.score === 18, "str 18");
assert(next.spellcasting.slots1 === 3, "slots after level");
assert(next.vitals.hpMax === 36, `hp ${next.vitals.hpMax}`);
assert(next.levelHistory.at(-1).ruleset === "dnd5e-2024", "history ruleset");

console.log("OK all 5e-2024 progression checks passed");
