/** Прогресс уровней 5e SRD + каталоги для мастера повышения */

import {
  featuresForSubclassLevel,
  findSubclass,
  peekSubclassesCache
} from "./subclasses-network.mjs";
import { peekFeatsCache, isEpicBoonFeat } from "./feats-network.mjs";
import { skillLabelRu } from "./skills-ru.mjs";

export const XP_TABLE = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000,
  195000, 225000, 265000, 305000, 355000
];

export const ASI_LEVELS = [4, 8, 12, 16];
/** SRD 2024: на 19 уровне класса — Epic Boon (не обычный ASI) */
export const EPIC_BOON_LEVEL = 19;

/** Единственная редакция прототипа: SRD 2024 */
export const RULESET = "dnd5e-2024";

export const CLASS_LIST = [
  { id: "варвар", name: "Варвар", en: "barbarian", hitDie: "d12", caster: "none", spellMode: "none", subclassLevel: 3 },
  { id: "бард", name: "Бард", en: "bard", hitDie: "d8", caster: "full", spellMode: "prepared", subclassLevel: 3 },
  { id: "жрец", name: "Жрец", en: "cleric", hitDie: "d8", caster: "full", spellMode: "prepared", subclassLevel: 3 },
  { id: "друид", name: "Друид", en: "druid", hitDie: "d8", caster: "full", spellMode: "prepared", subclassLevel: 3 },
  { id: "воин", name: "Воин", en: "fighter", hitDie: "d10", caster: "none", spellMode: "none", subclassLevel: 3 },
  { id: "монах", name: "Монах", en: "monk", hitDie: "d8", caster: "none", spellMode: "none", subclassLevel: 3 },
  { id: "паладин", name: "Паладин", en: "paladin", hitDie: "d10", caster: "half", spellMode: "prepared", subclassLevel: 3 },
  { id: "следопыт", name: "Следопыт", en: "ranger", hitDie: "d10", caster: "half", spellMode: "prepared", subclassLevel: 3 },
  { id: "плут", name: "Плут", en: "rogue", hitDie: "d8", caster: "none", spellMode: "none", subclassLevel: 3 },
  { id: "чародей", name: "Чародей", en: "sorcerer", hitDie: "d6", caster: "full", spellMode: "prepared", subclassLevel: 3 },
  { id: "колдун", name: "Колдун", en: "warlock", hitDie: "d8", caster: "warlock", spellMode: "prepared", subclassLevel: 3 },
  { id: "волшебник", name: "Волшебник", en: "wizard", hitDie: "d6", caster: "full", spellMode: "book", subclassLevel: 3 },
  {
    id: "изобретатель",
    name: "Изобретатель",
    en: "artificer",
    hitDie: "d8",
    caster: "artificer",
    spellMode: "prepared",
    subclassLevel: 3,
    available: false,
    legacy: true
  }
];

/** SRD 2024: требования ≥13 для мультикласса */
export const MULTICLASS_PREREQS = {
  варвар: [{ all: ["str"] }],
  бард: [{ all: ["cha"] }],
  жрец: [{ all: ["wis"] }],
  друид: [{ all: ["wis"] }],
  воин: [{ any: ["str", "dex"] }],
  монах: [{ all: ["dex", "wis"] }],
  паладин: [{ all: ["str", "cha"] }],
  следопыт: [{ all: ["dex", "wis"] }],
  плут: [{ all: ["dex"] }],
  чародей: [{ all: ["cha"] }],
  колдун: [{ all: ["cha"] }],
  волшебник: [{ all: ["int"] }],
  изобретатель: [{ all: ["int"] }]
};

/** ASI по уровню класса (SRD 2024). Воин: +6 и 14. Без 19 — там Epic Boon. Плут без 10. */
export const CLASS_ASI_LEVELS = {
  воин: [4, 6, 8, 12, 14, 16],
  плут: [4, 8, 12, 16]
};

export const CLASS_HIT_DIE = Object.fromEntries(
  CLASS_LIST.flatMap((c) => [
    [c.id, c.hitDie],
    [c.en, c.hitDie],
    [c.name.toLowerCase(), c.hitDie]
  ])
);

export const ABILITY_HINTS = {
  str: {
    label: "Сила",
    summary: "Атаки рукопашным оружием, атлетика, грузоподъёмность, силовые проверки."
  },
  dex: {
    label: "Ловкость",
    summary: "Атаки лёгким/дальнобойным оружием, КД без тяжёлого доспеха, инициатива, ловкость рук, скрытность."
  },
  con: {
    label: "Телосложение",
    summary: "Максимум хитов, концентрация, устойчивость к яду и болезням."
  },
  int: {
    label: "Интеллект",
    summary: "Знания, расследование, некоторые спасброски; заклинания волшебника."
  },
  wis: {
    label: "Мудрость",
    summary: "Внимательность, проницательность, выживание; заклинания жреца/друида/следопыта."
  },
  cha: {
    label: "Харизма",
    summary: "Убеждение, обман, выступление; заклинания барда/паладина/колдуна/чародея."
  }
};

export const FEAT_CATALOG = [
  {
    id: "skilled",
    name: "Одарённый",
    summary: "Три новых владения навыками или инструментами.",
    description: "Вы получаете владение тремя навыками или инструментами на выбор.",
    skillPicks: 3
  },
  {
    id: "alert",
    name: "Бдительный",
    summary: "+5 к инициативе, нельзя застать врасплох.",
    description: "+5 к инициативе, нельзя застать врасплох, скрытые существа не получают преимущество против вас.",
    skillPicks: 0
  },
  {
    id: "resilient",
    name: "Устойчивый",
    summary: "+1 к характеристике и владение её спасброском.",
    description: "+1 к одной характеристике и владение её спасброском.",
    skillPicks: 0
  },
  {
    id: "tough",
    name: "Крепкий",
    summary: "+2 хита за каждый уровень.",
    description: "+2 хита за каждый уровень (включая текущий).",
    skillPicks: 0,
    hpPerLevel: 2
  },
  {
    id: "war-caster",
    name: "Боевой заклинатель",
    summary: "Концентрация, соматика в занятых руках, заклинание как реакция.",
    description:
      "Преимущество на спасброски Телосложения для концентрации; заклинания как провоцированная атака; соматический компонент в занятых руках.",
    skillPicks: 0
  },
  {
    id: "lucky",
    name: "Везучий",
    summary: "Три очка удачи на перебросы d20.",
    description: "Три очка удачи: переброс d20 (атака, проверка, спасбросок) или переброс атаки по вам.",
    skillPicks: 0
  },
  {
    id: "sentinel",
    name: "Страж",
    summary: "Реакция на атаки по союзникам, стопор скорости.",
    description:
      "Реакция: атака по существу в досягаемости, которое атакует не вас; снижение скорости до 0 при попадании провоцированной атакой.",
    skillPicks: 0
  },
  {
    id: "sharpshooter",
    name: "Меткий стрелок",
    summary: "Дальнобойные атаки без помехи; опция −5/+10.",
    description: "Без помехи на дальней дистанции; игнор укрытия ½ и ¾; −5 к попаданию / +10 к урону дальнобойной атакой.",
    skillPicks: 0
  },
  {
    id: "great-weapon-master",
    name: "Мастер двуручного оружия",
    summary: "Бонусная атака после крита; −5/+10 тяжёлым оружием.",
    description: "Бонусная атака после крита/убийства; −5 к попаданию / +10 к урону тяжёлым оружием.",
    skillPicks: 0
  },
  {
    id: "polearm-master",
    name: "Мастер древкового оружия",
    summary: "Бонусная атака древком; провокация при входе.",
    description: "Бонусная атака древком; провоцированная атака при входе в досягаемость.",
    skillPicks: 0
  },
  {
    id: "mobile",
    name: "Подвижный",
    summary: "+10 футов скорости, меньше провокаций.",
    description:
      "+10 футов скорости; труднопроходимая местность не снижает скорость рывком; после рукопашной атаки существо не делает провоцированную по вам в этот ход.",
    skillPicks: 0
  },
  {
    id: "observant",
    name: "Наблюдательный",
    summary: "+1 Инт/Мдр и +5 к пассивным проверкам.",
    description: "+1 Инт или Мдр; можно читать по губам; +5 пассивным Внимательности и Анализу.",
    skillPicks: 0
  },
  {
    id: "actor",
    name: "Актёр",
    summary: "+1 Харизма, лучше выдавать себя за других.",
    description: "+1 Харизма; преимущество на Обман/Выступление при выдаче себя за кого-то; имитация речи.",
    skillPicks: 0
  },
  {
    id: "athlete",
    name: "Атлет",
    summary: "+1 Сила/Ловкость, лучше лазать и прыгать.",
    description: "+1 Сила или Ловкость; вставание стоит меньше движения; лазание без доп. стоимости; прыжки дальше.",
    skillPicks: 0
  },
  {
    id: "custom",
    name: "Своя черта",
    summary: "Опишите черту вручную.",
    description: "Опишите черту вручную (название и эффект).",
    skillPicks: 0,
    custom: true
  }
];

/** Умения по уровню класса (1–5), RU-описания SRD-смысла */
export const CLASS_FEATURES_BY_LEVEL = {
  паладин: {
    1: [
      {
        id: "lay-on-hands",
        name: "Возложение рук",
        description: "Запас лечения = 5 × уровень паладина. Касанием восстанавливаете хиты или снимаете яд/болезнь (5 ХП за состояние)."
      },
      {
        id: "spellcasting-paladin",
        name: "Колдовство",
        description: "Ячейки с 1 уровня; готовите заклинания паладина от Харизмы (SRD 2024)."
      },
      {
        id: "weapon-mastery-paladin",
        name: "Мастерство оружия",
        description: "Свойства мастерства для двух видов оружия на ваш выбор."
      }
    ],
    2: [
      {
        id: "fighting-style",
        name: "Боевой стиль",
        description: "Выберите боевой стиль.",
        pick: true
      },
      {
        id: "paladins-smite",
        name: "Кара паладина",
        description: "Всегда имеете подготовленным Divine Smite; можете творить его без ячейки 1/длинный отдых."
      }
    ],
    3: [
      {
        id: "channel-divinity-paladin",
        name: "Божественный канал",
        description: "Получаете Channel Divinity (2 использования)."
      },
      {
        id: "sacred-oath",
        name: "Подкласс паладина",
        description: "Выберите клятву (подкласс) и её особенности.",
        pick: true
      }
    ],
    4: [
      {
        id: "asi-4",
        name: "Увеличение характеристик",
        description: "ASI или черта (см. шаг «Улучшение»)."
      }
    ],
    5: [
      {
        id: "extra-attack-paladin",
        name: "Дополнительная атака",
        description: "При действии Атака можете атаковать дважды."
      },
      {
        id: "faithful-steed",
        name: "Верный скакун",
        description: "Всегда имеете подготовленным Find Steed; можете творить его ритуалом без ячейки."
      }
    ],
    6: [
      {
        id: "aura-of-protection",
        name: "Аура защиты",
        description: "Вы и союзники в ауре добавляете модификатор Харизмы к спасброскам."
      }
    ],
    9: [
      {
        id: "abjure-foes",
        name: "Изгнание врагов",
        description: "Channel Divinity: изгоняете врагов в радиусе."
      }
    ],
    10: [
      {
        id: "aura-of-courage",
        name: "Аура отваги",
        description: "Вы и союзники в ауре не можете быть испуганы."
      }
    ],
    11: [
      {
        id: "radiant-strikes",
        name: "Сияющие удары",
        description: "+1к8 лучистого урона оружием."
      }
    ],
    14: [
      {
        id: "restoring-touch",
        name: "Восстанавливающее касание",
        description: "Возложение рук снимает дополнительные состояния."
      }
    ],
    18: [
      {
        id: "aura-expansion",
        name: "Расширение ауры",
        description: "Радиус аур паладина увеличивается до 30 футов."
      }
    ],
    19: [
      {
        id: "epic-boon-paladin",
        name: "Эпический дар",
        description: "Получите Epic Boon (черта категории Epic Boon)."
      }
    ]
  },
  воин: {
    1: [
      {
        id: "fighting-style-f",
        name: "Боевой стиль",
        description: "Выберите боевой стиль.",
        pick: true
      },
      {
        id: "second-wind",
        name: "Второе дыхание",
        description: "Бонусным действием лечитесь на 1к10 + уровень воина (1/короткий отдых)."
      }
    ],
    2: [
      {
        id: "action-surge",
        name: "Всплеск действий",
        description: "Дополнительное действие в ход (1/короткий отдых)."
      }
    ],
    3: [
      {
        id: "martial-archetype",
        name: "Боевой архетип",
        description: "Выберите подкласс воина.",
        pick: true
      }
    ],
    4: [{ id: "asi-4-f", name: "Увеличение характеристик", description: "ASI или черта." }],
    5: [
      {
        id: "extra-attack-f",
        name: "Дополнительная атака",
        description: "При действии Атака атакуете дважды."
      }
    ]
  },
  плут: {
    1: [
      {
        id: "expertise",
        name: "Компетентность",
        description: "Удвойте бонус мастерства для двух навыков (или воровских инструментов).",
        pick: true
      },
      {
        id: "sneak-attack",
        name: "Скрытая атака",
        description: "1к6 доп. урона раз за ход при преимуществе или союзнике рядом с целью."
      },
      {
        id: "thieves-cant",
        name: "Воровской жаргон",
        description: "Знаете тайный язык и знаки воров."
      }
    ],
    2: [
      {
        id: "cunning-action",
        name: "Хитрые действия",
        description: "Бонусным действием: Рывок, Отход или Засада."
      }
    ],
    3: [
      {
        id: "roguish-archetype",
        name: "Архетип плута",
        description: "Выберите подкласс плута.",
        pick: true
      }
    ],
    4: [{ id: "asi-4-r", name: "Увеличение характеристик", description: "ASI или черта." }],
    5: [
      {
        id: "uncanny-dodge",
        name: "Невероятное уклонение",
        description: "Реакция: половините урон от атаки, которую видите."
      }
    ]
  },
  волшебник: {
    1: [
      {
        id: "spellcasting-wiz",
        name: "Колдовство",
        description: "Книга заклинаний, ритуалы, подготовка от Интеллекта."
      },
      {
        id: "arcane-recovery",
        name: "Магическое восстановление",
        description: "1/день после короткого отдыха вернуть ячейки суммарным кругом ≤ половины уровня волшебника."
      }
    ],
    2: [{ id: "spells-wiz-2", name: "Новые заклинания", description: "Добавьте два заклинания волшебника в книгу." }],
    3: [
      {
        id: "arcane-tradition",
        name: "Подкласс волшебника",
        description: "Выберите магическую традицию (SRD 2024 — с 3 уровня).",
        pick: true
      }
    ],
    4: [{ id: "asi-4-w", name: "Увеличение характеристик", description: "ASI или черта." }],
    5: [{ id: "spells-wiz-5", name: "Заклинания 3 круга", description: "Доступны заклинания 3 круга; добавьте два в книгу." }]
  },
  жрец: {
    1: [
      {
        id: "spellcasting-clr",
        name: "Колдовство",
        description: "Готовите заклинания жреца от Мудрости."
      },
      {
        id: "divine-order",
        name: "Божественный орден",
        description: "Выберите фокус жреца (оружие/магия) по правилам 2024."
      }
    ],
    2: [
      {
        id: "channel-divinity",
        name: "Божественный канал",
        description: "Божественный канал (в т.ч. изгнание нежити)."
      }
    ],
    3: [
      {
        id: "divine-domain",
        name: "Подкласс жреца",
        description: "Выберите домен (SRD 2024 — с 3 уровня).",
        pick: true
      }
    ],
    4: [{ id: "asi-4-c", name: "Увеличение характеристик", description: "ASI или черта." }],
    5: [
      {
        id: "destroy-undead",
        name: "Уничтожение нежити",
        description: "При изгнании нежити существа низкого CR уничтожаются."
      }
    ]
  },
  бард: {
    1: [
      {
        id: "spellcasting-bard",
        name: "Колдовство",
        description: "Готовите заклинания барда от Харизмы (SRD 2024)."
      },
      {
        id: "bardic-inspiration",
        name: "Вдохновение барда",
        description: "Бонусным действием даёте союзнику кость вдохновения (к6)."
      }
    ],
    2: [
      {
        id: "jack-of-all",
        name: "Мастер на все руки",
        description: "Можете добавлять половину БМ к проверкам без владения."
      },
      {
        id: "song-of-rest",
        name: "Песнь отдыха",
        description: "Во время короткого отдыха союзники получают доп. хиты."
      }
    ],
    3: [
      {
        id: "bard-college",
        name: "Коллегия бардов",
        description: "Выберите коллегию.",
        pick: true
      },
      {
        id: "expertise-bard",
        name: "Компетентность",
        description: "Удвойте БМ для двух навыков.",
        pick: true
      }
    ],
    4: [{ id: "asi-4-b", name: "Увеличение характеристик", description: "ASI или черта." }],
    5: [
      {
        id: "font-of-inspiration",
        name: "Источник вдохновения",
        description: "Восстанавливаете использования Вдохновения на коротком отдыхе."
      }
    ]
  },
  следопыт: {
    1: [
      {
        id: "spellcasting-rng",
        name: "Колдовство",
        description: "Заклинания следопыта с 1 уровня; подготовка от Мудрости (SRD 2024)."
      },
      {
        id: "favored-enemy",
        name: "Избранный враг",
        description: "Бонусы против избранного типа врагов."
      },
      {
        id: "weapon-mastery-rng",
        name: "Мастерство оружия",
        description: "Свойства мастерства для выбранного оружия."
      }
    ],
    2: [
      {
        id: "fighting-style-rng",
        name: "Боевой стиль",
        description: "Выберите боевой стиль.",
        pick: true
      }
    ],
    3: [
      {
        id: "ranger-archetype",
        name: "Подкласс следопыта",
        description: "Выберите подкласс.",
        pick: true
      }
    ],
    4: [{ id: "asi-4-rng", name: "Увеличение характеристик", description: "ASI или черта." }],
    5: [
      {
        id: "extra-attack-rng",
        name: "Дополнительная атака",
        description: "При действии Атака атакуете дважды."
      }
    ]
  },
  чародей: {
    1: [
      {
        id: "spellcasting-sorc",
        name: "Колдовство",
        description: "Известные заклинания от Харизмы."
      },
      {
        id: "innate-sorcery",
        name: "Врождённая магия",
        description: "Особенности чародея 1 уровня (SRD 2024)."
      }
    ],
    2: [
      {
        id: "font-of-magic",
        name: "Источник магии",
        description: "Очки чародейства = уровень; обмен на ячейки."
      }
    ],
    3: [
      {
        id: "sorcerous-origin",
        name: "Подкласс чародея",
        description: "Выберите происхождение (SRD 2024 — с 3 уровня).",
        pick: true
      },
      {
        id: "metamagic",
        name: "Метамагия",
        description: "Выберите варианты метамагии.",
        pick: true
      }
    ],
    4: [{ id: "asi-4-s", name: "Увеличение характеристик", description: "ASI или черта." }],
    5: [{ id: "spells-sorc-5", name: "Заклинания 3 круга", description: "Доступны заклинания 3 круга." }]
  },
  колдун: {
    1: [
      {
        id: "pact-magic",
        name: "Магия договора",
        description: "Ячейки договора колдуна (восстанавливаются на коротком отдыхе)."
      },
      {
        id: "eldritch-invocations",
        name: "Мистические воззвания",
        description: "Воззвания колдуна.",
        pick: true
      }
    ],
    2: [
      {
        id: "magical-cunning",
        name: "Магическая хитрость",
        description: "Особенности колдуна 2 уровня (SRD 2024)."
      }
    ],
    3: [
      {
        id: "otherworldly-patron",
        name: "Подкласс колдуна",
        description: "Выберите покровителя (SRD 2024 — с 3 уровня).",
        pick: true
      },
      {
        id: "pact-boon",
        name: "Дар договора",
        description: "Клинок / цепь / гримуар — выберите дар.",
        pick: true
      }
    ],
    4: [{ id: "asi-4-wl", name: "Увеличение характеристик", description: "ASI или черта." }],
    5: [{ id: "spells-wl-5", name: "Ячейки 3 круга", description: "Ячейки договора становятся 3 круга." }]
  },
  монах: {
    1: [
      {
        id: "unarmored-defense",
        name: "Бездоспешная защита",
        description: "КД = 10 + Лов + Мдр без доспеха и щита."
      },
      {
        id: "martial-arts",
        name: "Боевые искусства",
        description: "Безоружные/монашеское оружие: ловкость, бонусная атака, особая кость урона."
      }
    ],
    2: [
      {
        id: "ki",
        name: "Ци",
        description: "Очки ци = уровень; Flurry, Patient Defense, Step of the Wind."
      },
      {
        id: "unarmored-movement",
        name: "Бездоспешное движение",
        description: "+10 футов скорости без доспеха и щита."
      }
    ],
    3: [
      {
        id: "monastic-tradition",
        name: "Монашеская традиция",
        description: "Выберите традицию.",
        pick: true
      },
      {
        id: "deflect-missiles",
        name: "Отклонение снарядов",
        description: "Реакция снизить урон дальнобойной атаки; при нуле — можно метнуть."
      }
    ],
    4: [
      { id: "asi-4-m", name: "Увеличение характеристик", description: "ASI или черта." },
      {
        id: "slow-fall",
        name: "Замедленное падение",
        description: "Реакция: уменьшить урон от падения на 5 × уровень монаха."
      }
    ],
    5: [
      {
        id: "extra-attack-m",
        name: "Дополнительная атака",
        description: "При действии Атака атакуете дважды."
      },
      {
        id: "stunning-strike",
        name: "Оглушающий удар",
        description: "Потратьте 1 ци: цель делает спасбросок Тел или оглушена до конца вашего следующего хода."
      }
    ]
  },
  друид: {
    1: [
      {
        id: "druidic",
        name: "Друидический язык",
        description: "Знаете тайный язык друидов."
      },
      {
        id: "spellcasting-druid",
        name: "Колдовство",
        description: "Готовите заклинания друида от Мудрости."
      }
    ],
    2: [
      {
        id: "wild-shape",
        name: "Дикий облик",
        description: "Превращаетесь в зверя (ограничения по CR)."
      }
    ],
    3: [
      {
        id: "druid-circle",
        name: "Подкласс друида",
        description: "Выберите круг (SRD 2024 — с 3 уровня).",
        pick: true
      }
    ],
    4: [
      { id: "asi-4-d", name: "Увеличение характеристик", description: "ASI или черта." },
      {
        id: "wild-shape-improve",
        name: "Улучшенный облик",
        description: "Расширяются допустимые формы Дикого облика."
      }
    ],
    5: [{ id: "spells-druid-5", name: "Заклинания 3 круга", description: "Доступны заклинания 3 круга." }]
  },
  варвар: {
    1: [
      {
        id: "rage",
        name: "Ярость",
        description: "Бонусным действием входите в ярость: сопротивление дробящему/колющему/рубящему, бонус к урону Силой."
      },
      {
        id: "unarmored-defense-b",
        name: "Бездоспешная защита",
        description: "КД = 10 + Лов + Тел без доспеха."
      }
    ],
    2: [
      {
        id: "reckless",
        name: "Безрассудная атака",
        description: "Преимущество на атаки Силой; атаки по вам тоже с преимуществом до вашего следующего хода."
      },
      {
        id: "danger-sense",
        name: "Опасное чувство",
        description: "Преимущество на спасброски Ловкости против видимых эффектов (если не недееспособны)."
      }
    ],
    3: [
      {
        id: "primal-path",
        name: "Путь дикости",
        description: "Выберите путь варвара.",
        pick: true
      }
    ],
    4: [{ id: "asi-4-bar", name: "Увеличение характеристик", description: "ASI или черта." }],
    5: [
      {
        id: "extra-attack-bar",
        name: "Дополнительная атака",
        description: "При действии Атака атакуете дважды."
      },
      {
        id: "fast-movement",
        name: "Быстрое движение",
        description: "+10 футов скорости без тяжёлого доспеха."
      }
    ]
  },
  изобретатель: {
    1: [
      {
        id: "magical-tinkering",
        name: "Магическая возня",
        description: "Наделяете крошечные предметы простыми магическими эффектами."
      },
      {
        id: "spellcasting-art",
        name: "Колдовство",
        description: "Заклинания изобретателя от Интеллекта (half-caster)."
      }
    ],
    2: [
      {
        id: "infusions",
        name: "Вливания",
        description: "Выберите известные вливания и наделяйте предметы.",
        pick: true
      }
    ],
    3: [
      {
        id: "art-subclass",
        name: "Специалист",
        description: "Выберите подкласс изобретателя.",
        pick: true
      }
    ],
    4: [{ id: "asi-4-art", name: "Увеличение характеристик", description: "ASI или черта." }],
    5: [{ id: "spells-art-5", name: "Заклинания 2 круга", description: "Доступны заклинания 2 круга." }]
  }
};

// Aliases EN keys
for (const c of CLASS_LIST) {
  if (CLASS_FEATURES_BY_LEVEL[c.id] && !CLASS_FEATURES_BY_LEVEL[c.en]) {
    CLASS_FEATURES_BY_LEVEL[c.en] = CLASS_FEATURES_BY_LEVEL[c.id];
  }
}

/** Full caster: max spell level by class level */
const FULL_CASTER_MAX = [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 9, 9];
/** Paladin/Ranger SRD 2024: 1st-level spells from class level 1 */
const HALF_CASTER_MAX = [0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5];
/** Artificer: spells from level 1 */
const ARTIFICER_MAX = [0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5];
const WARLOCK_SLOT_LEVEL = [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5];
const WARLOCK_SLOT_COUNT = [0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4];
const WARLOCK_MAX = [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5];

/** Full caster / multiclass spellcaster table (PHB) */
const FULL_SLOT_TABLE = [
  null,
  [2],
  [3],
  [4, 2],
  [4, 3],
  [4, 3, 2],
  [4, 3, 3],
  [4, 3, 3, 1],
  [4, 3, 3, 2],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1]
];

/** Paladin / Ranger slot table by class level (SRD 2024: slots from level 1) */
const HALF_SLOT_TABLE = [
  null,
  [2],
  [2],
  [3],
  [3],
  [4, 2],
  [4, 2],
  [4, 3],
  [4, 3],
  [4, 3, 2],
  [4, 3, 2],
  [4, 3, 3],
  [4, 3, 3],
  [4, 3, 3, 1],
  [4, 3, 3, 1],
  [4, 3, 3, 2],
  [4, 3, 3, 2],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2]
];

/** Artificer slot table (Tasha's) */
const ARTIFICER_SLOT_TABLE = [
  null,
  [2],
  [2],
  [3],
  [3],
  [4, 2],
  [4, 2],
  [4, 3],
  [4, 3],
  [4, 3, 2],
  [4, 3, 2],
  [4, 3, 3],
  [4, 3, 3],
  [4, 3, 3, 1],
  [4, 3, 3, 1],
  [4, 3, 3, 2],
  [4, 3, 3, 2],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2]
];

/** Число подготовленных заклинаний 1+ круга по таблице класса (SRD 2024); index = class level */
const PREPARED_SPELLS_TABLE = {
  // совпадает с колонкой Prepared Spells в таблицах классов 2024
  бард: [0, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 15, 16, 18, 19, 19, 20, 22, 22, 22],
  жрец: [0, 4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 19, 20, 21, 22, 23, 24, 25],
  друид: [0, 4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 19, 20, 21, 22, 23, 24, 25],
  паладин: [0, 2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15],
  следопыт: [0, 2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15],
  чародей: [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15, 15],
  колдун: [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15],
  // волшебник: минимум из таблицы (база); фактический лимит = max(table, Int+level) в preparationLimit
  волшебник: [0, 4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 19, 20, 21, 22, 23, 24, 25],
  изобретатель: [0, 2, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 7, 8, 8, 8, 9, 9]
};

/** Known spells — только для legacy; в 2024 кастеры готовят по таблице */
const KNOWN_SPELLS = {};

const CANTRIPS_KNOWN = {
  бард: [0, 2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  чародей: [0, 4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
  колдун: [0, 2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  жрец: [0, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  друид: [0, 2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  волшебник: [0, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  изобретатель: [0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4]
};

export function proficiencyForLevel(level) {
  const lv = clampLevel(level);
  return Math.ceil(lv / 4) + 1;
}

export function clampLevel(level) {
  const n = Number(level) || 1;
  return Math.max(1, Math.min(20, Math.floor(n)));
}

export function xpForLevel(level) {
  const lv = clampLevel(level);
  return XP_TABLE[lv - 1] ?? 0;
}

export function normalizeClassKey(className) {
  const key = String(className || "")
    .toLowerCase()
    .trim();
  const found = CLASS_LIST.find(
    (c) => c.id === key || c.en === key || c.name.toLowerCase() === key || key.includes(c.id) || key.includes(c.en)
  );
  return found?.id || key || "воин";
}

export function classMeta(className) {
  const id = normalizeClassKey(className);
  return (
    CLASS_LIST.find((c) => c.id === id) || {
      id,
      name: className || "Класс",
      en: id,
      hitDie: "d8",
      caster: "none",
      spellMode: "none",
      subclassLevel: 3
    }
  );
}

export function hitDieForClass(className) {
  return classMeta(className).hitDie || "d8";
}

export function hitDieSides(hitDie) {
  return Number(String(hitDie).replace(/\D/g, "")) || 8;
}

export function averageHpGain(hitDie, conMod) {
  const die = hitDieSides(hitDie);
  const avg = Math.floor(die / 2) + 1;
  return Math.max(1, avg + Number(conMod || 0));
}

/** PHB: бросок кости хитов + ТЕЛ, минимум 1 */
export function rollHpGain(hitDie, conMod, rng = Math.random) {
  const die = hitDieSides(hitDie);
  const roll = Math.floor(rng() * die) + 1;
  return { roll, hpGain: Math.max(1, roll + Number(conMod || 0)), die };
}

export function clampHpGain(hpGain, hitDie, conMod) {
  const die = hitDieSides(hitDie);
  const min = Math.max(1, 1 + Number(conMod || 0));
  const max = Math.max(min, die + Number(conMod || 0));
  const n = Number(hpGain);
  if (!Number.isFinite(n)) return averageHpGain(hitDie, conMod);
  return Math.max(min, Math.min(max, Math.floor(n)));
}

export function ensureCharacterClasses(character) {
  if (Array.isArray(character.classes) && character.classes.length > 0) {
    return character.classes.map((c, i) => ({
      id: c.id || `cls-${i}`,
      name: c.name || character.className || "Класс",
      level: Math.max(1, Number(c.level) || 1),
      subclass: c.subclass || ""
    }));
  }
  return [
    {
      id: "cls-primary",
      name: character.className || "Класс",
      level: Math.max(1, Number(character.level) || 1),
      subclass: character.subclass || ""
    }
  ];
}

export function totalClassLevels(classes) {
  return (classes || []).reduce((sum, c) => sum + Math.max(0, Number(c.level) || 0), 0);
}

export function formatClassesLabel(classes) {
  const list = classes || [];
  if (!list.length) return "—";
  return list.map((c) => `${c.name} ${c.level}${c.subclass ? ` (${c.subclass})` : ""}`).join(" / ");
}

export function primaryClassName(classes) {
  if (!classes?.length) return "";
  return [...classes].sort((a, b) => b.level - a.level)[0].name;
}

export function hitDicePool(classes) {
  const pool = {};
  for (const c of classes || []) {
    const die = hitDieForClass(c.name);
    pool[die] = (pool[die] || 0) + Math.max(0, Number(c.level) || 0);
  }
  return pool;
}

export function featuresForClassLevel(className, classLevel) {
  const key = normalizeClassKey(className);
  const byLevel = CLASS_FEATURES_BY_LEVEL[key] || {};
  return (byLevel[Number(classLevel)] || []).map((f) => enrichFeaturePick({ ...f }));
}

const FIGHTING_STYLE_OPTIONS = [
  { id: "archery", name: "Стрельба", description: "+2 к броскам атаки дальнобойным оружием." },
  { id: "defense", name: "Оборона", description: "+1 КД в доспехе." },
  { id: "dueling", name: "Дуэлянт", description: "+2 к урону одноручным оружием, если вторая рука свободна." },
  {
    id: "great-weapon",
    name: "Бой большим оружием",
    description: "При 1–2 на кости урона двуручным оружием — переброс."
  },
  { id: "protection", name: "Защита", description: "Реакция: помеха атаке по союзнику рядом (со щитом)." },
  {
    id: "two-weapon",
    name: "Бой двумя оружиями",
    description: "Бонусная атака вторым оружием добавляет модификатор характеристики к урону."
  }
];

function enrichFeaturePick(f) {
  if (!f.pick) return f;
  const id = String(f.id || "");
  if (id.includes("expertise")) {
    return {
      ...f,
      pickLimit: f.pickLimit ?? 2,
      pickFrom: f.pickFrom || "proficientSkills",
      pickKind: "skills"
    };
  }
  if (id.includes("fighting-style")) {
    return {
      ...f,
      pickLimit: f.pickLimit ?? 1,
      pickKind: "options",
      options: f.options || FIGHTING_STYLE_OPTIONS
    };
  }
  if (
    id.includes("archetype") ||
    id.includes("oath") ||
    id.includes("domain") ||
    id.includes("college") ||
    id.includes("circle") ||
    id.includes("patron") ||
    id.includes("origin") ||
    id.includes("tradition") ||
    id.includes("path") ||
    id.includes("subclass") ||
    id.includes("sacred-oath") ||
    id.includes("roguish") ||
    id.includes("martial-archetype") ||
    id.includes("monastic") ||
    id.includes("sorcerous") ||
    id.includes("otherworldly") ||
    id.includes("arcane-tradition") ||
    id.includes("druid-circle") ||
    id.includes("bard-college")
  ) {
    return { ...f, pickKind: "subclass", pickLimit: 0 };
  }
  return { ...f, pickLimit: f.pickLimit ?? 1, pickKind: f.pickKind || "ack" };
}

export function xpProgress(experience, level) {
  const lv = clampLevel(level);
  const xp = Math.max(0, Number(experience) || 0);
  const currentFloor = xpForLevel(lv);
  const nextLevel = Math.min(20, lv + 1);
  const nextFloor = lv >= 20 ? xpForLevel(20) : xpForLevel(nextLevel);
  const span = Math.max(1, nextFloor - currentFloor);
  const into = Math.max(0, Math.min(span, xp - currentFloor));
  const needed = lv >= 20 ? 0 : Math.max(0, nextFloor - xp);
  const percent = lv >= 20 ? 100 : Math.round((into / span) * 100);
  return {
    experience: xp,
    level: lv,
    nextLevel: lv >= 20 ? 20 : nextLevel,
    currentFloor,
    nextFloor,
    into,
    span,
    needed,
    percent,
    canLevelUp: lv < 20 && xp >= nextFloor,
    proficiencyBonus: proficiencyForLevel(lv),
    nextProficiencyBonus: proficiencyForLevel(Math.min(20, lv + 1))
  };
}

export function canLevelUp(character) {
  const classes = ensureCharacterClasses(character);
  const total = totalClassLevels(classes) || Number(character?.level) || 1;
  return xpProgress(character?.experience, total).canLevelUp;
}

export function asiLevelsForClass(className) {
  const key = normalizeClassKey(className);
  return CLASS_ASI_LEVELS[key] || ASI_LEVELS;
}

export function isAsiLevel(level) {
  return ASI_LEVELS.includes(clampLevel(level));
}

/** PHB/SRD: ASI/черта при достижении уровня в классе, который повышаете */
export function isAsiClassLevel(className, classLevel) {
  return asiLevelsForClass(className).includes(clampLevel(classLevel));
}

export function isEpicBoonClassLevel(className, classLevel) {
  return clampLevel(classLevel) === EPIC_BOON_LEVEL;
}

export function subclassLevelForClass(className) {
  return Number(classMeta(className).subclassLevel) || 3;
}

/** Подкласс можно выбирать только с уровня subclassLevel этого класса */
export function subclassAllowed(className, toClassLevel) {
  return clampLevel(toClassLevel) >= subclassLevelForClass(className);
}

export function subclassRequired(className, toClassLevel, currentSubclass = "") {
  const needAt = subclassLevelForClass(className);
  if (clampLevel(toClassLevel) !== needAt) return false;
  return !String(currentSubclass || "").trim();
}

export function abilityScore(character, key) {
  return Number(character?.abilities?.[key]?.score ?? 10);
}

function prereqGroupMet(character, group) {
  if (group.any) return group.any.some((k) => abilityScore(character, k) >= 13);
  if (group.all) return group.all.every((k) => abilityScore(character, k) >= 13);
  return true;
}

export function multiclassPrereqsFor(className) {
  const key = normalizeClassKey(className);
  return MULTICLASS_PREREQS[key] || [];
}

/**
 * PHB: чтобы взять новый класс, нужны требования всех текущих классов и нового.
 * Для повышения существующего при уже мультиклассе — тоже проверяем все классы.
 */
export function checkMulticlassPrerequisites(character, { mode, className } = {}) {
  const classes = ensureCharacterClasses(character);
  const targets = new Set(classes.map((c) => normalizeClassKey(c.name)));
  if (mode === "new") targets.add(normalizeClassKey(className));
  const missing = [];
  for (const key of targets) {
    const groups = MULTICLASS_PREREQS[key] || [];
    for (const group of groups) {
      if (!prereqGroupMet(character, group)) {
        const meta = classMeta(key);
        const need = group.any
          ? `одна из: ${group.any.map((a) => ABILITY_HINTS[a]?.label || a).join(", ")} ≥ 13`
          : `${(group.all || []).map((a) => ABILITY_HINTS[a]?.label || a).join(" и ")} ≥ 13`;
        missing.push(`${meta.name}: ${need}`);
      }
    }
  }
  return { ok: missing.length === 0, missing };
}

/** @deprecated use featuresForClassLevel */
export function classFeatureHints(className) {
  const feats = [];
  const key = normalizeClassKey(className);
  const byLevel = CLASS_FEATURES_BY_LEVEL[key] || {};
  for (const lv of Object.keys(byLevel)) {
    for (const f of byLevel[lv]) feats.push(f.name);
  }
  return feats.length ? feats : ["Особенность класса", "Улучшение подкласса"];
}

export function abilityModifier(score) {
  return Math.floor((Number(score || 10) - 10) / 2);
}

export function multiclassCasterLevel(classes) {
  let full = 0;
  let half = 0;
  let artificer = 0;
  let warlock = 0;
  for (const c of classes || []) {
    const meta = classMeta(c.name);
    const lv = Number(c.level) || 0;
    if (meta.caster === "full") full += lv;
    else if (meta.caster === "half") half += Math.ceil(lv / 2); // SRD 2024: round up per class
    else if (meta.caster === "artificer") artificer += lv;
    else if (meta.caster === "warlock") warlock += lv;
  }
  // SRD 2024: full + ceil(half/2 per class summed) + ceil(artificer/2); warlock pact отдельно
  const multiclassLevel = full + half + Math.ceil(artificer / 2);
  return { full, half, artificer, warlock, multiclassLevel };
}

function rowToSlots(row) {
  const slots = {};
  (row || []).forEach((n, i) => {
    slots[`slots${i + 1}`] = n;
  });
  return slots;
}

export function spellSlotsFromCasterLevel(casterLevel) {
  return rowToSlots(FULL_SLOT_TABLE[Math.min(20, Math.max(0, casterLevel))] || []);
}

export function warlockPactMagic(warlockLevel) {
  const lv = clampLevel(warlockLevel);
  if (lv <= 0 || !warlockLevel) return null;
  const count = WARLOCK_SLOT_COUNT[lv] || 0;
  const slotLevel = WARLOCK_SLOT_LEVEL[lv] || 1;
  if (!count) return null;
  return {
    pactSlots: count,
    pactSlotLevel: slotLevel,
    rest: "short"
  };
}

/**
 * Официальные ячейки:
 * - один класс-заклинатель (не колдун): таблица этого класса
 * - несколько non-warlock заклинателей: таблица мультикласса
 * - колдун: pact magic отдельно
 */
export function computeSpellcastingSlots(classes) {
  const list = classes || [];
  const { full, half, artificer, warlock, multiclassLevel } = multiclassCasterLevel(list);
  const nonWarlockCasters = list.filter((c) => {
    const t = classMeta(c.name).caster;
    return t === "full" || t === "half" || t === "artificer";
  });
  let shared = {};
  if (nonWarlockCasters.length === 1) {
    const only = nonWarlockCasters[0];
    const meta = classMeta(only.name);
    const lv = clampLevel(only.level);
    if (meta.caster === "full") shared = rowToSlots(FULL_SLOT_TABLE[lv] || []);
    else if (meta.caster === "half") shared = rowToSlots(HALF_SLOT_TABLE[lv] || []);
    else if (meta.caster === "artificer") shared = rowToSlots(ARTIFICER_SLOT_TABLE[lv] || []);
  } else if (nonWarlockCasters.length > 1 && multiclassLevel > 0) {
    shared = spellSlotsFromCasterLevel(multiclassLevel);
  }
  const pact = warlockPactMagic(warlock);
  return {
    shared,
    pact,
    multiclassLevel,
    full,
    half,
    artificer,
    warlock,
    slots: { ...shared, ...(pact ? { pactSlots: pact.pactSlots, pactSlotLevel: pact.pactSlotLevel } : {}) }
  };
}

/** Макс. круг заклинаний для подготовки/изучения КОНКРЕТНОГО класса (не слотов мультикласса) */
export function maxSpellLevelForClass(className, classLevel) {
  const meta = classMeta(className);
  const lv = clampLevel(classLevel);
  if (meta.caster === "full") return FULL_CASTER_MAX[lv] || 0;
  if (meta.caster === "half") return HALF_CASTER_MAX[lv] || 0;
  if (meta.caster === "artificer") return ARTIFICER_MAX[lv] || 0;
  if (meta.caster === "warlock") return WARLOCK_MAX[lv] || WARLOCK_SLOT_LEVEL[lv] || 0;
  return 0;
}

/** Макс. круг среди слотов (мультикласс) — для отображения ячеек, не для каталога подготовки */
export function maxSpellLevelForClasses(classes) {
  let max = 0;
  const { multiclassLevel, warlock } = multiclassCasterLevel(classes);
  const nonWarlock = (classes || []).filter((c) => {
    const t = classMeta(c.name).caster;
    return t === "full" || t === "half" || t === "artificer";
  });
  if (nonWarlock.length > 1 && multiclassLevel > 0) {
    max = Math.max(max, FULL_CASTER_MAX[Math.min(20, multiclassLevel)] || 0);
  }
  for (const c of classes || []) {
    max = Math.max(max, maxSpellLevelForClass(c.name, c.level));
  }
  if (warlock > 0) max = Math.max(max, WARLOCK_SLOT_LEVEL[Math.min(20, warlock)] || 0);
  return max;
}

export function preparedSpellsTotal(className, classLevel) {
  const key = normalizeClassKey(className);
  const table = PREPARED_SPELLS_TABLE[key];
  if (!table) return null;
  return table[clampLevel(classLevel)] ?? 0;
}

export function knownSpellsTotal(className, classLevel) {
  const key = normalizeClassKey(className);
  const table = KNOWN_SPELLS[key];
  if (!table) return null;
  return table[clampLevel(classLevel)] ?? 0;
}

export function cantripsKnownTotal(className, classLevel) {
  const key = normalizeClassKey(className);
  const table = CANTRIPS_KNOWN[key];
  if (!table) return null;
  return table[clampLevel(classLevel)] ?? 0;
}

/**
 * Сколько новых заклинаний выбрать при повышении этого класса.
 * prepared: 0 (готовят из списка класса); book: +2 в книгу; known: дельта (legacy).
 */
export function newSpellPicksForAdvance(className, toClassLevel, fromClassLevel = toClassLevel - 1) {
  const meta = classMeta(className);
  const to = clampLevel(toClassLevel);
  const from = Math.max(0, Number(fromClassLevel) || to - 1);
  if (meta.spellMode === "none" || meta.caster === "none") return 0;
  if (meta.spellMode === "prepared") return 0;
  if (meta.spellMode === "book") return to === 1 ? 6 : 2;
  if (meta.spellMode === "known") {
    const a = knownSpellsTotal(className, to) ?? 0;
    const b = from <= 0 ? 0 : knownSpellsTotal(className, from) ?? 0;
    return Math.max(0, a - b);
  }
  return 0;
}

/**
 * Сколько новых заговоров при повышении класса (дельта таблицы Cantrips).
 */
export function newCantripPicksForAdvance(className, toClassLevel, fromClassLevel = toClassLevel - 1) {
  const to = clampLevel(toClassLevel);
  const from = Math.max(0, Number(fromClassLevel) || to - 1);
  const a = cantripsKnownTotal(className, to);
  if (a == null) return 0;
  const b = from <= 0 ? 0 : cantripsKnownTotal(className, from) ?? 0;
  return Math.max(0, a - b);
}

/** Лимит подготовки: колонка Prepared Spells таблицы класса (SRD 2024) */
export function preparationLimit(character, className, classLevel) {
  const meta = classMeta(className);
  if (meta.spellMode !== "prepared" && meta.spellMode !== "book") return null;
  const lv = clampLevel(classLevel);
  const fromTable = preparedSpellsTotal(className, lv);
  if (fromTable != null) return Math.max(1, fromTable);
  // fallback, если таблицы нет
  const abilityKey = meta.en === "wizard" || meta.en === "artificer" ? "int" : meta.en === "paladin" ? "cha" : "wis";
  const mod = character?.abilities?.[abilityKey]?.modifier ?? abilityModifier(character?.abilities?.[abilityKey]?.score);
  if (meta.caster === "half" || meta.caster === "artificer") return Math.max(1, mod + Math.floor(lv / 2));
  return Math.max(1, mod + lv);
}

/** @deprecated use isEpicBoonFeat from feats-network — re-export for совместимости */
export { isEpicBoonFeat };

export function projectClassesAfterAdvance(character, advanceClass = {}) {
  const classes = ensureCharacterClasses(character).map((c) => ({ ...c }));
  const mode = advanceClass.mode || "existing";
  const className = advanceClass.className || classes[0]?.name || character.className;
  if (mode === "new") {
    classes.push({
      id: `cls-${Date.now()}`,
      name: className,
      level: 1,
      subclass: advanceClass.subclass || ""
    });
  } else {
    const idx = classes.findIndex((c) => normalizeClassKey(c.name) === normalizeClassKey(className));
    if (idx >= 0) {
      classes[idx] = {
        ...classes[idx],
        level: classes[idx].level + 1,
        subclass: advanceClass.subclass || classes[idx].subclass || ""
      };
    } else {
      classes.push({
        id: `cls-${Date.now()}`,
        name: className,
        level: 1,
        subclass: advanceClass.subclass || ""
      });
    }
  }
  return classes;
}

export function resolveAdvanceTarget(character, advanceClass = {}) {
  const current = ensureCharacterClasses(character);
  const mode = advanceClass.mode || "existing";
  const className = advanceClass.className || current[0]?.name || character.className || "Воин";
  if (mode === "new") {
    return { mode: "new", className, fromClassLevel: 0, toClassLevel: 1, subclass: advanceClass.subclass || "" };
  }
  const existing = current.find((c) => normalizeClassKey(c.name) === normalizeClassKey(className)) || current[0];
  const fromClassLevel = existing?.level || 1;
  return {
    mode: "existing",
    className: existing?.name || className,
    fromClassLevel,
    toClassLevel: fromClassLevel + 1,
    subclass: advanceClass.subclass || existing?.subclass || ""
  };
}

export function buildLevelUpOptions(character, advanceClass = {}) {
  const classes = ensureCharacterClasses(character);
  const total = totalClassLevels(classes) || Number(character.level) || 1;
  const progress = xpProgress(character.experience, total);
  const toLevel = progress.nextLevel;
  const advance = resolveAdvanceTarget(character, advanceClass);
  const projected = projectClassesAfterAdvance(character, {
    mode: advance.mode,
    className: advance.className,
    subclass: advance.subclass
  });
  const hitDie = hitDieForClass(advance.className);
  const conMod = character.abilities?.con?.modifier ?? abilityModifier(character.abilities?.con?.score);
  const avgHp = averageHpGain(hitDie, conMod);
  const dieSides = hitDieSides(hitDie);
  const rawSkills = Array.isArray(character.skills)
    ? character.skills
    : Object.entries(character.skills || {}).map(([key, skill]) => ({
        key: skill?.key || key,
        label: skill?.label || key,
        proficiencyLevel: skill?.proficiencyLevel ?? skill?.isProf ?? 0,
        baseAbility: skill?.baseAbility || skill?.baseStat || "str"
      }));
  const skills = rawSkills.map((s) => ({
    key: s.key,
    label: skillLabelRu(s),
    proficiencyLevel: Number(s.proficiencyLevel || 0),
    baseAbility: s.baseAbility || "str"
  }));

  const classFeaturesForLevel = featuresForClassLevel(advance.className, advance.toClassLevel);
  const skillsForPick = {
    untrained: skills.filter((s) => !Number(s.proficiencyLevel)),
    proficient: skills.filter((s) => Number(s.proficiencyLevel) > 0)
  };
  const featureChoiceBudget = classFeaturesForLevel
    .filter((f) => f.pick && f.pickKind !== "subclass" && f.pickKind !== "ack")
    .map((f) => ({
      featureId: f.id,
      name: f.name,
      pickKind: f.pickKind,
      pickLimit: Number(f.pickLimit) || 1,
      pickFrom: f.pickFrom || null,
      options: f.options || null
    }));
  const casterMeta = classMeta(advance.className);
  const slotInfo = computeSpellcastingSlots(projected);
  const prepareMaxSpellLevel = maxSpellLevelForClass(advance.className, advance.toClassLevel);
  const slotMaxSpellLevel = maxSpellLevelForClasses(projected);
  const picksAllowed = newSpellPicksForAdvance(advance.className, advance.toClassLevel, advance.fromClassLevel);
  const cantripPicksAllowed = newCantripPicksForAdvance(
    advance.className,
    advance.toClassLevel,
    advance.fromClassLevel
  );
  const prepLimit = preparationLimit(character, advance.className, advance.toClassLevel);
  const knownTotal = knownSpellsTotal(advance.className, advance.toClassLevel);
  const cantripsTotal = cantripsKnownTotal(advance.className, advance.toClassLevel);
  const preparedTotal = preparedSpellsTotal(advance.className, advance.toClassLevel);
  const epicBoonAvailable = isEpicBoonClassLevel(advance.className, advance.toClassLevel);
  const asiAvailable = isAsiClassLevel(advance.className, advance.toClassLevel) && !epicBoonAvailable;
  const subclassLvl = subclassLevelForClass(advance.className);
  const allowSubclass = subclassAllowed(advance.className, advance.toClassLevel);
  const needSubclass = subclassRequired(
    advance.className,
    advance.toClassLevel,
    advance.subclass ||
      classes.find((c) => normalizeClassKey(c.name) === normalizeClassKey(advance.className))?.subclass ||
      ""
  );
  const multiCheck =
    classes.length > 1 || advance.mode === "new"
      ? checkMulticlassPrerequisites(character, { mode: advance.mode, className: advance.className })
      : { ok: true, missing: [] };

  const isCaster =
    casterMeta.caster !== "none" ||
    prepareMaxSpellLevel > 0 ||
    slotMaxSpellLevel > 0 ||
    Boolean(slotInfo.pact) ||
    Object.keys(slotInfo.shared).length > 0;

  return {
    progress,
    fromLevel: progress.level,
    toLevel,
    ruleset: RULESET,
    asiAvailable,
    epicBoonAvailable,
    asiLevels: asiLevelsForClass(advance.className),
    hitDie,
    hitDieSides: dieSides,
    averageHpGain: avgHp,
    hpMin: Math.max(1, 1 + conMod),
    hpMax: dieSides + conMod,
    conModifier: conMod,
    hitDicePool: hitDicePool(projected),
    feats: FEAT_CATALOG,
    abilityHints: ABILITY_HINTS,
    featsTaken: character.featsTaken || [],
    skills,
    classes,
    classesLabel: formatClassesLabel(classes),
    availableClasses: CLASS_LIST.filter((c) => c.available !== false).map((c) => ({
      id: c.id,
      name: c.name,
      hitDie: c.hitDie,
      caster: c.caster,
      spellMode: c.spellMode,
      subclassLevel: c.subclassLevel,
      asiLevels: asiLevelsForClass(c.id),
      multiclassPrereqs: multiclassPrereqsFor(c.id),
      legacy: Boolean(c.legacy)
    })),
    advance: {
      ...advance,
      subclassLevel: subclassLvl,
      subclassAllowed: allowSubclass,
      subclassRequired: needSubclass,
      asiAtClassLevel: asiAvailable,
      epicBoonAtClassLevel: epicBoonAvailable
    },
    multiclass: multiCheck,
    classFeaturesForLevel,
    classFeatures: classFeaturesForLevel.map((f) => f.name),
    skillsForPick,
    featureChoiceBudget,
    spellcasting: character.spellcasting || null,
    preparedSpells: character.preparedSpells || [],
    spellBook: character.spellBook || [],
    abilities: character.abilities || {},
    spellOptions: {
      isCaster,
      casterType: casterMeta.caster,
      spellMode: casterMeta.spellMode,
      className: advance.className,
      classEn: casterMeta.en,
      // каталог подготовки/изучения — только по кругу ЭТОГО класса
      maxSpellLevel: prepareMaxSpellLevel,
      prepareMaxSpellLevel,
      slotMaxSpellLevel,
      picksAllowed,
      cantripPicksAllowed,
      knownTotal,
      cantripsTotal,
      preparedTotal,
      preparationLimit: prepLimit,
      multiclassCasterLevel: slotInfo.multiclassLevel,
      warlockLevel: slotInfo.warlock,
      suggestedSlots: slotInfo.shared,
      pactMagic: slotInfo.pact,
      known: [...new Set([...(character.spellBook || []), ...(character.preparedSpells || [])])],
      filterClasses: [casterMeta.en].filter(Boolean)
    }
  };
}

/**
 * choices: {
 *   advanceClass?: { mode, className, subclass? },
 *   hpGain, improveType, asi?, feat?, skillKeys?,
 *   preparedSpells?, newSpells?, newSpellIds?,
 *   selectedFeatureIds?: string[], classFeatureNote?,
 *   spellSlots?
 * }
 */
export function applyLevelUp(character, choices = {}, opts = {}) {
  const classesBefore = ensureCharacterClasses(character);
  const totalBefore = totalClassLevels(classesBefore) || Number(character.level) || 1;
  const progress = xpProgress(character.experience, totalBefore);
  if (!progress.canLevelUp) {
    throw new Error(`Недостаточно опыта: нужно ещё ${progress.needed}`);
  }

  const fromLevel = totalBefore;
  const toLevel = progress.nextLevel;
  const advance = resolveAdvanceTarget(character, choices.advanceClass || {});

  if (classesBefore.length > 1 || advance.mode === "new") {
    const check = checkMulticlassPrerequisites(character, {
      mode: advance.mode,
      className: advance.className
    });
    if (!check.ok) {
      throw new Error(`Мультикласс (SRD 2024): не выполнены требования — ${check.missing.join("; ")}`);
    }
  }

  const existingSub =
    classesBefore.find((c) => normalizeClassKey(c.name) === normalizeClassKey(advance.className))?.subclass || "";
  const requestedSub = String(advance.subclass || "").trim();
  if (requestedSub && requestedSub !== String(existingSub).trim() && !subclassAllowed(advance.className, advance.toClassLevel)) {
    throw new Error(
      `Подкласс «${advance.className}» доступен с уровня ${subclassLevelForClass(advance.className)} (SRD 2024)`
    );
  }
  const subclass =
    subclassAllowed(advance.className, advance.toClassLevel)
      ? requestedSub || existingSub || ""
      : existingSub || "";
  if (subclassRequired(advance.className, advance.toClassLevel, subclass) && !String(subclass).trim()) {
    throw new Error(
      `На ${advance.toClassLevel} уровне класса «${advance.className}» нужно выбрать подкласс (SRD 2024)`
    );
  }

  const classes = projectClassesAfterAdvance(character, {
    mode: advance.mode,
    className: advance.className,
    subclass
  });

  const next = {
    ...character,
    abilities: { ...character.abilities },
    vitals: { ...character.vitals },
    skills: (character.skills || []).map((s) => ({ ...s })),
    spellcasting: { ...(character.spellcasting || {}) },
    preparedSpells: [...(character.preparedSpells || [])],
    spellBook: [...(character.spellBook || [])],
    traits: [...(character.traits || [])],
    featsTaken: [...(character.featsTaken || [])],
    subclassFeaturesTaken: [...(character.subclassFeaturesTaken || [])],
    levelHistory: [...(character.levelHistory || [])],
    classes
  };

  for (const k of Object.keys(next.abilities || {})) {
    next.abilities[k] = { ...next.abilities[k] };
  }

  next.level = toLevel;
  next.className = primaryClassName(classes);
  next.subclass =
    classes.find((c) => normalizeClassKey(c.name) === normalizeClassKey(advance.className))?.subclass ||
    next.subclass ||
    "";
  next.proficiencyBonus = proficiencyForLevel(toLevel);
  next.vitals.hitDicePool = hitDicePool(classes);
  next.vitals.hitDie = hitDieForClass(advance.className);

  const conMod = next.abilities?.con?.modifier ?? abilityModifier(next.abilities?.con?.score);
  const hpGain = clampHpGain(
    choices.hpGain ?? averageHpGain(next.vitals.hitDie, conMod),
    next.vitals.hitDie,
    conMod
  );
  next.vitals.hpMax = Number(next.vitals.hpMax || 0) + hpGain;
  next.vitals.hpCurrent = Number(next.vitals.hpCurrent || 0) + hpGain;

  const asiOk = isAsiClassLevel(advance.className, advance.toClassLevel);
  const epicOk = isEpicBoonClassLevel(advance.className, advance.toClassLevel);
  const improveType = choices.improveType || (epicOk ? "feat" : asiOk ? "asi" : "none");
  if (improveType === "asi" && !asiOk) {
    throw new Error(
      epicOk
        ? `На 19 уровне класса «${advance.className}» берётся Epic Boon (черта), не обычный ASI (SRD 2024)`
        : `ASI/черта на уровне класса ${advance.toClassLevel} у «${advance.className}» недоступны (SRD 2024: ${asiLevelsForClass(advance.className).join(", ")})`
    );
  }
  if (improveType === "feat" && !asiOk && !epicOk) {
    throw new Error(
      `ASI/черта на уровне класса ${advance.toClassLevel} у «${advance.className}» недоступны (SRD 2024: ${asiLevelsForClass(advance.className).join(", ")})`
    );
  }
  if (epicOk && improveType !== "feat") {
    throw new Error(`На 19 уровне класса «${advance.className}» нужно выбрать Epic Boon (SRD 2024)`);
  }

  if (improveType === "asi" && choices.asi) {
    const mode = choices.asi.mode || "plus2";
    const applyOne = (key, delta) => {
      if (!key || !next.abilities[key]) return;
      const score = Math.min(20, Number(next.abilities[key].score || 10) + delta);
      next.abilities[key].score = score;
      next.abilities[key].modifier = abilityModifier(score);
    };
    if (mode === "plus2") applyOne(choices.asi.a, 2);
    else {
      applyOne(choices.asi.a, 1);
      applyOne(choices.asi.b, 1);
    }
    if (choices.asi.a === "con" || choices.asi.b === "con") {
      const oldCon = character.abilities?.con?.modifier ?? 0;
      const newCon = next.abilities.con.modifier;
      if (newCon > oldCon) {
        const delta = (newCon - oldCon) * toLevel;
        next.vitals.hpMax += delta;
        next.vitals.hpCurrent += delta;
      }
    }
  }

  if (improveType === "feat" && choices.feat) {
    const netFeats = peekFeatsCache() || [];
    const featMeta =
      netFeats.find((f) => f.id === choices.feat.id || f.name === choices.feat.name || f.nameEn === choices.feat.name) ||
      FEAT_CATALOG.find((f) => f.id === choices.feat.id) ||
      null;
    if (epicOk && featMeta && !isEpicBoonFeat(featMeta) && !choices.feat.custom) {
      throw new Error(`На 19 уровне выберите черту Epic Boon (SRD 2024)`);
    }
    const featName = choices.feat.name || featMeta?.name || "Черта";
    const featDesc = choices.feat.description || featMeta?.description || "";
    next.featsTaken.push(featName);
    next.traits.push(`${featName}: ${featDesc}`.trim());
    if (featMeta?.hpPerLevel) {
      const bonus = featMeta.hpPerLevel * toLevel;
      next.vitals.hpMax += bonus;
      next.vitals.hpCurrent += bonus;
    }
    for (const key of choices.feat.skillKeys || []) {
      const skill = next.skills.find((s) => s.key === key);
      if (skill) skill.proficiencyLevel = Math.max(1, Number(skill.proficiencyLevel || 0));
    }
  }

  for (const key of choices.skillKeys || []) {
    const skill = next.skills.find((s) => s.key === key);
    if (skill) skill.proficiencyLevel = Math.max(1, Number(skill.proficiencyLevel || 0));
  }

  const levelFeatures = featuresForClassLevel(advance.className, advance.toClassLevel);
  const selectedIds = new Set(choices.selectedFeatureIds || []);
  const featurePicks = choices.featurePicks || {};
  for (const feat of levelFeatures) {
    if (feat.pickKind === "subclass") continue;
    if (feat.pick && feat.pickKind === "ack" && !selectedIds.has(feat.id)) {
      selectedIds.add(feat.id);
    }
    if (feat.pick && (feat.pickKind === "skills" || feat.pickKind === "options")) {
      const picked = Array.isArray(featurePicks[feat.id]) ? featurePicks[feat.id] : [];
      const limit = Number(feat.pickLimit) || 1;
      if (picked.length > limit) {
        throw new Error(`«${feat.name}»: можно выбрать не больше ${limit}`);
      }
      if (picked.length < limit && (feat.pickKind === "options" || feat.pickKind === "skills")) {
        throw new Error(`«${feat.name}»: выберите ${limit}`);
      }
      if (picked.length) {
        const labels =
          feat.pickKind === "options"
            ? picked
                .map((id) => feat.options?.find((o) => o.id === id || o.name === id)?.name || id)
                .join(", ")
            : picked.join(", ");
        const line = `Ур. ${toLevel} (${advance.className} ${advance.toClassLevel}): ${feat.name} — ${labels}`;
        if (!next.traits.includes(line)) next.traits.push(line);
        continue;
      }
    }
    if (feat.pick && feat.pickKind !== "ack" && feat.pickKind !== "skills" && feat.pickKind !== "options" && !selectedIds.has(feat.id)) {
      continue;
    }
    const line = `Ур. ${toLevel} (${advance.className} ${advance.toClassLevel}): ${feat.name} — ${feat.description}`;
    if (!next.traits.includes(line)) next.traits.push(line);
  }

  const subclassName =
    next.subclass ||
    subclass ||
    classes.find((c) => normalizeClassKey(c.name) === normalizeClassKey(advance.className))?.subclass ||
    "";
  if (subclassName) {
    const subItems = opts.subclassItems || peekSubclassesCache() || [];
    const scMeta = findSubclass(subItems, subclassName);
    const subFeats = featuresForSubclassLevel(subItems, subclassName, advance.toClassLevel);
    for (const f of subFeats) {
      const dup = next.subclassFeaturesTaken.some(
        (x) => x.id === f.id && Number(x.classLevel) === Number(advance.toClassLevel)
      );
      if (dup) continue;
      const entry = {
        id: f.id,
        name: f.name,
        description: String(f.description || "").trim(),
        levels: f.levels || [],
        subclass: f.fromSubclass || scMeta?.name || subclassName,
        subclassId: f.subclassId || scMeta?.id || "",
        className: advance.className,
        classLevel: advance.toClassLevel,
        characterLevel: toLevel
      };
      next.subclassFeaturesTaken.push(entry);
      const line = `Ур. ${toLevel} (${advance.className} ${advance.toClassLevel}, ${entry.subclass}): ${f.name} — ${entry.description}`;
      if (!next.traits.includes(line)) next.traits.push(line);
    }
  }

  if (choices.classFeatureNote && String(choices.classFeatureNote).trim()) {
    next.traits.push(`Ур. ${toLevel}: ${String(choices.classFeatureNote).trim()}`);
  }
  if (choices.classFeature && String(choices.classFeature).trim()) {
    next.traits.push(`Ур. ${toLevel}: ${String(choices.classFeature).trim()}`);
  }

  const meta = classMeta(advance.className);
  const picksAllowed = newSpellPicksForAdvance(advance.className, advance.toClassLevel, advance.fromClassLevel);
  const newSpells = (choices.newSpells || []).map((s) => String(s).trim()).filter(Boolean);
  if (picksAllowed > 0 && newSpells.length > picksAllowed) {
    throw new Error(`Можно взять не больше ${picksAllowed} новых заклинаний (SRD 2024)`);
  }

  if (meta.spellMode === "book") {
    for (const name of newSpells) {
      if (!next.spellBook.includes(name)) next.spellBook.push(name);
    }
  } else if (meta.spellMode === "known") {
    for (const name of newSpells) {
      if (!next.spellBook.includes(name)) next.spellBook.push(name);
    }
  }

  if (Array.isArray(choices.preparedSpells)) {
    const prep = choices.preparedSpells.map(String);
    const limit = preparationLimit(next, advance.className, advance.toClassLevel);
    if (limit != null && prep.length > limit) {
      throw new Error(`Лимит подготовки: ${limit} (таблица класса, SRD 2024)`);
    }
    next.preparedSpells = prep;
  } else if (meta.spellMode === "known") {
    for (const name of newSpells) {
      if (!next.preparedSpells.includes(name)) next.preparedSpells.push(name);
    }
  }

  const slotInfo = computeSpellcastingSlots(classes);
  next.spellcasting = {
    ...next.spellcasting,
    ...slotInfo.slots,
    ...(choices.spellSlots || {})
  };
  if (slotInfo.pact) {
    next.spellcasting.pactSlots = slotInfo.pact.pactSlots;
    next.spellcasting.pactSlotLevel = slotInfo.pact.pactSlotLevel;
  }
  const castKey = next.spellcasting.ability || (meta.en === "wizard" || meta.en === "artificer" ? "int" : meta.en === "cleric" || meta.en === "druid" || meta.en === "ranger" ? "wis" : "cha");
  next.spellcasting.ability = castKey;
  const castMod = next.abilities?.[castKey]?.modifier ?? 0;
  next.spellcasting.saveDC = 8 + next.proficiencyBonus + castMod;
  next.spellcasting.attackBonus = next.proficiencyBonus + castMod;

  next.levelHistory.push({
    at: new Date().toISOString(),
    fromLevel,
    toLevel,
    advance: { ...advance, subclass },
    ruleset: RULESET,
    choices: {
      hpGain,
      improveType,
      asi: choices.asi || null,
      feat: choices.feat || null,
      skillKeys: choices.skillKeys || [],
      selectedFeatureIds: [...selectedIds],
      classFeatureNote: choices.classFeatureNote || null,
      newSpells
    }
  });

  next.pendingLevelUp = null;
  return next;
}
