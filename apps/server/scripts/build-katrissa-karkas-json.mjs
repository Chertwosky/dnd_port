/**
 * Собирает рабочие LSS-JSON Катриссы и Каркаса под импорт @dnd/server.
 * Магические предметы → spellcastingItems, но из снаряжения НЕ убираем.
 */
import fs from "node:fs";
import path from "node:path";

const OUT_DIR_DOWNLOADS = "C:/Users/user/Downloads";
const OUT_DIR_SAMPLE = path.resolve("apps/server/src/data/sample-characters");

function para(...parts) {
  const content = [];
  for (const p of parts) {
    if (typeof p === "string") content.push({ type: "text", text: p });
    else content.push(p);
  }
  return { type: "paragraph", content };
}
function bold(text) {
  return { type: "text", marks: [{ type: "bold" }], text };
}
function italic(text) {
  return { type: "text", marks: [{ type: "italic" }], text };
}
function doc(paragraphs) {
  return { type: "doc", content: paragraphs.filter(Boolean) };
}
function textBlock(paragraphs) {
  return { value: { data: doc(paragraphs) } };
}

function abilityMod(score) {
  return Math.floor((Number(score) - 10) / 2);
}

const SKILL_DEFS = [
  ["acrobatics", "dex", "Акробатика"],
  ["animal handling", "wis", "Уход за животными"],
  ["arcana", "int", "Аркана"],
  ["athletics", "str", "Атлетика"],
  ["deception", "cha", "Обман"],
  ["history", "int", "История"],
  ["insight", "wis", "Проницательность"],
  ["intimidation", "cha", "Запугивание"],
  ["investigation", "int", "Анализ"],
  ["medicine", "wis", "Медицина"],
  ["nature", "int", "Природа"],
  ["perception", "wis", "Внимательность"],
  ["performance", "cha", "Выступление"],
  ["persuasion", "cha", "Убеждение"],
  ["religion", "int", "Религия"],
  ["sleight of hand", "dex", "Ловкость рук"],
  ["stealth", "dex", "Скрытность"],
  ["survival", "wis", "Выживание"]
];

function buildSkills(profKeys = []) {
  const prof = new Set(profKeys);
  const skills = {};
  for (const [key, baseStat, label] of SKILL_DEFS) {
    skills[key] = { baseStat, name: key, label, isProf: prof.has(key) ? 1 : 0 };
  }
  return skills;
}

function findSrc(includes) {
  const dir = OUT_DIR_DOWNLOADS;
  const hit = fs.readdirSync(dir).find((f) => includes.every((p) => f.includes(p)) && f.endsWith(".json"));
  if (!hit) throw new Error(`Source not found for ${includes.join("+")}`);
  return path.join(dir, hit);
}

function writeCharacter(env, d, sampleName, downloadName, spellcastingItems) {
  env.spellcastingItems = spellcastingItems;
  env.edition = env.edition || "2014";
  env.sheetEdition = env.sheetEdition || "2014";
  env.data = JSON.stringify(d);
  env.jsonType = "character";
  env.version = env.version || "2";
  const out = JSON.stringify(env, null, 0);
  const samplePath = path.join(OUT_DIR_SAMPLE, sampleName);
  const dlPath = path.join(OUT_DIR_DOWNLOADS, downloadName);
  fs.mkdirSync(OUT_DIR_SAMPLE, { recursive: true });
  fs.writeFileSync(samplePath, out, "utf8");
  fs.writeFileSync(dlPath, out, "utf8");
  console.log("Wrote", samplePath);
  console.log("Wrote", dlPath, "bytes", out.length);
}

function buildKatrissa() {
  const SRC = findSrc(["Катрисса"]);
  const env = JSON.parse(fs.readFileSync(SRC, "utf8"));
  const d = JSON.parse(env.data);

  d.info.charClass.value = "Жрец";
  d.info.charSubclass = { name: "charSubclass", label: "подкласс", value: "Еретик Лолс (homebrew)" };
  d.info.race.value = "Дроу";
  d.info.background.value = "Еретик-изгой";
  d.info.alignment = { name: "alignment", value: "Хаотично-нейтральный", label: "мировоззрение" };
  d.info.experience.value = 14000;
  d.info.level.value = 6;
  d.proficiency = 3;
  d.proficiencyCustom = 3;

  for (const [k, score] of Object.entries({ str: 8, dex: 15, con: 14, int: 13, wis: 18, cha: 11 })) {
    d.stats[k].score = score;
    d.stats[k].modifier = abilityMod(score);
  }

  d.saves.wis.isProf = true;
  d.saves.cha.isProf = true;
  d.skills = buildSkills(["perception", "insight", "religion", "stealth"]);

  d.vitality["hp-max"].value = 35;
  d.vitality["hp-current"].value = 35;
  d.vitality["hp-temp"] = { value: 0 };
  d.vitality.ac.value = 15;
  d.vitality.speed = { value: 30 };
  d.vitality["hit-die"] = { value: "d8" };
  d.vitality.darkvision = { value: 120 };
  d.vitality["hp-dice-current"] = { value: 6 };
  d.vitality.initiative = { value: 2 };

  d.spellsInfo = {
    base: { name: "base", value: "Мудрость", code: "wis", label: "Базовая характеристика заклинаний" },
    save: { name: "save", value: "", label: "Сложность спасброска", customModifier: "16" },
    mod: { name: "mod", value: "", label: "Бонус атаки заклинанием", customModifier: "8" },
    available: { classes: ["cleric"] }
  };
  d.spells = {
    "slots-1": { value: 4, filled: 4 },
    "slots-2": { value: 3, filled: 3 },
    "slots-3": { value: 3, filled: 3 }
  };

  d.weaponsList = [
    {
      id: "w-staff",
      name: { value: "Посох" },
      dmg: { value: "1к6+2 дробящий" },
      isProf: true,
      ability: "dex",
      modBonus: { value: 2 }
    },
    {
      id: "w-whip",
      name: { value: "Плеть" },
      dmg: { value: "1к6+2 рубящий" },
      isProf: true,
      ability: "dex",
      modBonus: { value: 2 }
    }
  ];

  d.coins = { gp: { value: 3 }, sp: { value: 0 }, cp: { value: 0 }, pp: { value: 0 }, ep: { value: 0 }, total: { value: 3 } };

  d.text.attacks = textBlock([
    para(bold("Тёмное зрение"), ". 120 футов (36 м). В темноте — оттенки серого."),
    para(
      bold("Чувствительность к солнцу"),
      ". На прямом солнечном свете помеха к броскам атаки и проверкам Восприятия, полагающимся на зрение."
    ),
    para(bold("Наследие фей"), ". Преимущество на спасброски от очарования; магия не может вас усыпить."),
    para(bold("Госпожа дроу"), ". Любые броски против мужчин совершаются с преимуществом.")
  ]);

  d.text.traits = textBlock([
    para(bold("ВЛАДЕНИЕ")),
    para("Доспехи: лёгкие, средние."),
    para("Оружие: простое; рапира, короткий меч, ручной арбалет, плеть."),
    para("Инструменты: набор травника, набор ядов."),
    para("Спасброски: Мудрость, Харизма."),
    para("Навыки: Восприятие, Проницательность, Религия, Скрытность."),
    para("Языки: общий, эльфийский, подземный."),
    para(bold("Колдовство жреца"), ". Сл спасброска 16 · атака заклинанием +8 · Мудрость. Ячейки: 4×1, 3×2, 3×3.")
  ]);

  d.text.features = textBlock([
    para(italic("Заговоры (homebrew)")),
    para(bold("Малый ядовитый плевок")),
    para(
      "Заговор. Действие, дальность 3 м. Цель — спасбросок Телосложения Сл 16. Провал: 1к8 урона ядом. Успех: без урона. Урон не растёт с уровнем."
    ),
    para(bold("Умение подземки")),
    para(
      "Заговор поддержки. Действие, касание, до 1 минуты, концентрация. Предмет получает усиление (яд / некро-урон). Можно добавить к магии посоха +1к4 некротического урона."
    ),
    para(bold("Плевок паутины")),
    para(
      "Заговор. Опутывает паутиной одну цель, замедляет; на один ход броски с помехой; 1к4 урона ядом."
    ),
    para(italic("Способности (homebrew)")),
    para(bold("Проклятие прикосновения")),
    para(
      "Действие, касание (1,5 м), до 1 минуты, концентрация. Спасбросок Мудрости Сл 16. Провал: цель проклята — помеха на атаки против вас; в начале каждого её хода 1к4 некротического урона."
    ),
    para(bold("Оглушающий взгляд")),
    para(
      "Действие, дальность 9 м, до 1 раунда. Спасбросок Телосложения Сл 16. Провал: оглушена до начала вашего следующего хода (без реакций и движения, провал проверок Силы/Ловкости, атаки по ней в ближнем бою с преимуществом); 2к6 психического урона. Успех: ничего."
    ),
    para(bold("Призрачное оружие")),
    para(
      "Действие при первом применении, дальность 18 м, 1 минута. Призрачная паучья лапа/плеть рядом с врагом. Попадание: 2к8+4 некротического урона. Далее бонусным действием: перемещение на 6 м и повторная атака. Без концентрации."
    ),
    para(italic("Ультимативные (2 раза за игру)")),
    para(bold("Рой духов пауков")),
    para(
      "Действие; вы — центр. Радиус 4,5 м; до 10 минут, концентрация. Призрачные пауки. Когда враг впервые за ход входит в зону или начинает в ней ход — спасбросок Мудрости Сл 16: провал 3к8 некротического + помеха до конца хода; успех — половина урона. Скорость врагов в зоне ×½."
    ),
    para(bold("Тьма Подземья")),
    para(
      "Расовая магия дроу. Действие, дальность 18 м, сфера 4,5 м; до 10 минут, концентрация. Магическая тьма. Пока вы внутри: атаки по вам с помехой (если нет особого зрения); ваши атаки с преимуществом; ваши заклинания со спасброском +1 к Сл; каждый раунд 1к4 некротического урона (минимум два раунда)."
    )
  ]);

  d.text.feats = textBlock([
    para(
      "Формально всё ещё жрица Лолс, но сердце отходит от паутины. Ищет нового покровителя и «ручного пса» — сильного, упрямого, опасного союзника."
    )
  ]);

  d.text.equipment = textBlock([
    para("Паучья кольчуга (чёрная сетка; средние доспехи)."),
    para("Чёрный плащ с капюшоном; одежда госпожи."),
    para("Посох."),
    para("Плеть."),
    para("Набор травника."),
    para("Набор ядов."),
    para("Паёк эльфа."),
    para("Амулет дома Т’Ссинриэль."),
    para("3 зм.")
  ]);

  d.text.items = textBlock([para("Амулет дома Т’Ссинриэль.")]);

  d.text.personality = textBlock([
    para(bold("Черты характера")),
    para("Не любит толпы и пустые разговоры — смотрит, слушает, делает выводы. Если нечего сказать — молчит."),
    para("Боль и смерть — инструменты; больше не хочет, чтобы ими пользовались чужие руки."),
    para("Большинство мужчин воспринимает как потенциальных слуг или телохранителей — пока не докажут обратное.")
  ]);

  d.text.ideals = textBlock([
    para(bold("Идеалы")),
    para("Свобода важнее богов и традиций. Готова брать силу, но не отдавать себя целиком."),
    para("Верю в собственное развитие — учусь у богов, демонов и путников, принадлежу только себе.")
  ]);

  d.text.bonds = textBlock([
    para(bold("Привязанности")),
    para(
      "Когда‑то дала клятву Лолс и дому — хочет переформулировать её так, чтобы выжила она, а не пауки сверху."
    ),
    para("Ищет «ручного пса» — сильного и опасного; пусть мир зовёт это рабством, она — договором.")
  ]);

  d.text.flaws = textBlock([
    para(bold("Слабости")),
    para("Смотрит на людей как на инструменты и легко ломает полезные связи."),
    para("Гордыня: лезет в запретные знания, не думая о цене."),
    para("Плохо переносит приказы, особенно от женщин, привыкших командовать.")
  ]);

  d.text.background = textBlock([
    para(
      "Родилась в благородном доме дроу, готовилась стать жрицей Паучьей Королевы. На ритуале увидела, как жрицы наслаждаются смертью невинных под маской Лолс — сомнения стали громче молитв."
    ),
    para(
      "Формально жрица Лолс, но путешествует по Подземью и поверхности, собирая силу и ища нового покровителя вместо старой богини. Нужен свой «пёс» — кто будет драться за неё."
    )
  ]);

  d.text.appearance = textBlock([
    para(
      "Стройная тёмная эльфийка в чёрном плаще с капюшоном. Под плащом — одежда госпожи и паучья кольчуга-сетка. Волосы длинные, в косе."
    )
  ]);

  d.text.allies = textBlock([
    para("Родной дом и храм Лолс скорее убьют её, чем отпустят, если узнают правду."),
    para("Иногда пересекается с изгоями дроу — без клятв, только обмен услугами."),
    para("Воин, которого она спасла от жертвоприношения: может прийти, если позвать не слишком громко.")
  ]);

  d.text.quests = textBlock([
    para("Ищет того, кому можно посвятить себя, отрекшись от Лолс."),
    para("В поисках ручного пса.")
  ]);

  d.text.prof = textBlock([
    para("Языки: общий, эльфийский, подземный."),
    para("Инструменты: набор травника, набор ядов.")
  ]);

  d.text["notes-2"] = textBlock([
    para(bold("Еретик-изгой")),
    para("Свобода важнее богов. Ищет нового покровителя и верного «пса».")
  ]);

  d.text["notes-3"] = textBlock([
    para(bold("Раса: Дроу")),
    para("Тёмное зрение 120 фт · чувствительность к солнцу · наследие фей · Госпожа дроу.")
  ]);

  d.text["notes-4"] = textBlock([
    para(bold("Колдовство жреца 6 ур. (homebrew)")),
    para("Спасбросок 16 · атака +8 · Мдр."),
    para("Ячейки: 4×1, 3×2, 3×3."),
    para("Заговоры и способности — в блоке умений / фокусов на вкладке заклинаний.")
  ]);

  env.spells = {
    mode: "text",
    edition: "2014",
    prepared: [],
    book: [],
    alwaysPrepared: [],
    initiateCantrips: [],
    initiateSpell: null
  };

  const spellcastingItems = [
    {
      id: "katrissa-amulet",
      icon: "🕷️",
      name: "Амулет дома Т’Ссинриэль",
      type: "Чудесный предмет",
      rarity: "uncommon",
      rarityLabel: "Символ дома",
      requiresAttunement: false,
      summary: "Амулет благородного дома дроу — напоминание о клятве и крови.",
      description:
        "Амулет дома Т’Ссинриэль. Символ происхождения и былой клятвы Лолс. Может служить фокусом для её homebrew-магии жрицы."
    },
    {
      id: "katrissa-staff",
      icon: "🪄",
      name: "Посох (фокус)",
      type: "Оружие / фокус",
      rarity: "common",
      rarityLabel: "Обычный",
      requiresAttunement: false,
      summary: "Боевой посох; с «Умением подземки» может нести доп. некро-урон 1к4.",
      description:
        "Посох Катриссы. Удар: 1к6+2 дробящий. Может использоваться как фокус; заговор «Умение подземки» добавляет к магии посоха 1к4 некротического урона."
    },
    {
      id: "katrissa-cantrips",
      icon: "☠️",
      name: "Заговоры (homebrew)",
      type: "Колдовство",
      rarityLabel: "Сл 16",
      requiresAttunement: false,
      summary: "Малый ядовитый плевок · Умение подземки · Плевок паутины",
      description:
        "Малый ядовитый плевок — действие, 3 м, Тел Сл 16, 1к8 яд. Умение подземки — касание, концентрация до 1 мин, усиление предмета / +1к4 некро к посоху. Плевок паутины — опутывание, помеха на ход, 1к4 яд."
    },
    {
      id: "katrissa-powers",
      icon: "👁️",
      name: "Способности (homebrew)",
      type: "Колдовство",
      rarityLabel: "Сл 16",
      requiresAttunement: false,
      summary: "Проклятие прикосновения · Оглушающий взгляд · Призрачное оружие",
      description:
        "Проклятие прикосновения — Мдр Сл 16, помеха на атаки по вам + 1к4 некро/ход. Оглушающий взгляд — 9 м, Тел Сл 16, оглушение + 2к6 психического. Призрачное оружие — 18 м, 2к8+4 некро, далее бонусным действием."
    },
    {
      id: "katrissa-ults",
      icon: "🌑",
      name: "Ультимативные (2/игру)",
      type: "Мощные эффекты",
      rarityLabel: "Лимит 2 за игру",
      requiresAttunement: false,
      summary: "Рой духов пауков · Тьма Подземья",
      description:
        "Рой духов пауков — зона 4,5 м, концентрация до 10 мин, Мдр Сл 16 → 3к8 некро + помеха / половина; скорость ×½. Тьма Подземья — сфера 4,5 м, магическая тьма; внутри: помеха атакам по вам, преимущество вашим атакам, +1 Сл заклинаний, 1к4 некро/раунд."
    }
  ];

  writeCharacter(env, d, "katrissa.json", "Катрисса-dnd-port.json", spellcastingItems);
}

function buildKarkas() {
  const SRC = findSrc(["Каркас Малокас"]);
  const env = JSON.parse(fs.readFileSync(SRC, "utf8"));
  const d = JSON.parse(env.data);

  d.info.charClass.value = "Паладин";
  d.info.charSubclass = { name: "charSubclass", label: "подкласс", value: "Клятва шутника (homebrew)" };
  d.info.race.value = "Сатир";
  d.info.background.value = "Жертва травли";
  d.info.alignment = { name: "alignment", value: "Хаотично-нейтральный", label: "мировоззрение" };
  d.info.experience.value = 14000;
  d.info.level.value = 6;
  d.proficiency = 3;
  d.proficiencyCustom = 3;

  for (const [k, score] of Object.entries({ str: 12, dex: 17, con: 14, int: 9, wis: 11, cha: 18 })) {
    d.stats[k].score = score;
    d.stats[k].modifier = abilityMod(score);
  }

  d.saves.wis.isProf = true;
  d.saves.cha.isProf = true;
  d.skills = buildSkills(["athletics", "persuasion", "performance", "insight"]);

  d.vitality["hp-max"].value = 52;
  d.vitality["hp-current"].value = 52;
  d.vitality["hp-temp"] = { value: 0 };
  d.vitality.ac.value = 16;
  d.vitality.speed = { value: 35 };
  d.vitality["hit-die"] = { value: "d10" };
  d.vitality.darkvision = { value: 0 };
  d.vitality["hp-dice-current"] = { value: 6 };
  d.vitality.initiative = { value: 3 };
  d.vitality.shield = { value: true };

  d.spellsInfo = {
    base: { name: "base", value: "Харизма", code: "cha", label: "Базовая характеристика заклинаний" },
    save: { name: "save", value: "", label: "Сложность спасброска", customModifier: "14" },
    mod: { name: "mod", value: "", label: "Бонус атаки заклинанием", customModifier: "6" },
    available: { classes: ["paladin"] }
  };
  d.spells = {
    "slots-1": { value: 4, filled: 4 },
    "slots-2": { value: 2, filled: 2 },
    "slots-3": { value: 0 }
  };

  d.weaponsList = [
    {
      id: "w-morgenstern",
      name: { value: "Моргенштерн радости" },
      dmg: { value: "1к8+5 дробящий (дуэлянт + аура)" },
      isProf: true,
      ability: "dex",
      modBonus: { value: 3 },
      notes: { value: "Можно накладывать ауру радости" }
    },
    {
      id: "w-horns",
      name: { value: "Рога" },
      dmg: { value: "1к6+1 дробящий" },
      isProf: true,
      ability: "str",
      modBonus: { value: 1 }
    },
    {
      id: "w-shield-bash",
      name: { value: "Удар щитом" },
      dmg: { value: "1к6+2 дробящий" },
      isProf: true,
      ability: "str",
      modBonus: { value: 1 },
      notes: { value: "Может оглушать (см. Зеркало Усмешки)" }
    }
  ];

  d.coins = { gp: { value: 7 }, sp: { value: 0 }, cp: { value: 0 }, pp: { value: 0 }, ep: { value: 0 }, total: { value: 7 } };

  d.text.attacks = textBlock([
    para(bold("Фейское происхождение"), ". Преимущество против очарования; магия не усыпит."),
    para(bold("Магическая устойчивость"), ". Преимущество на спасброски против заклинаний и магических эффектов."),
    para(bold("Ловкость ног"), ". Скорость 35 футов."),
    para(bold("Рога"), ". Природная атака 1к6 + модификатор Силы (дробящий).")
  ]);

  d.text.traits = textBlock([
    para(bold("ВЛАДЕНИЕ")),
    para("Доспехи: все доспехи, щиты."),
    para("Оружие: простое и воинское."),
    para("Инструменты: музыкальный инструмент (флейта/лютня)."),
    para("Спасброски: Мудрость, Харизма."),
    para("Навыки: Атлетика, Убеждение, Выступление, Проницательность."),
    para("Языки: общий, сильван, гномий."),
    para(bold("Божественное чувство"), ". Чуешь нежить, фей и исчадий в 60 футах (4 раза/день)."),
    para(bold("Божественное здоровье"), ". Иммунитет к болезням."),
    para(bold("Боевой стиль: Дуэлирование"), ". +2 к урону одноручным оружием ближнего боя при щите."),
    para(bold("Дополнительная атака"), ". Две атаки за действие Атака."),
    para(bold("Аура защиты"), ". Вы и союзники в 10 футах получают +4 ко всем спасброскам (Харизма)."),
    para(bold("Колдовство паладина"), ". Сл 14 · атака +6 · Харизма. Ячейки: 4×1, 2×2.")
  ]);

  d.text.feats = textBlock([
    para(bold("Остроумный боец")),
    para(
      "Homebrew / рефлейвор «Вдохновляющий вождь». Раз в короткий отдых: шутка или песня — союзники в 30 футах получают временные хиты = 1к6 + Харизма (+4)."
    )
  ]);

  d.text.features = textBlock([
    para(italic("«Заговоры» клятвы шутника (homebrew)")),
    para(bold("Шутка перед ударом")),
    para(
      "Бонусное действие: проверка Выступления Сл 12. Успех — преимущество на следующую атаку и +1к4 морального (психического) урона."
    ),
    para(bold("Аура радости на оружии")),
    para(
      "Бонусное действие: на 1 минуту моргенштерн светится. При попадании враг — спасбросок Мудрости Сл 14 или без реакций до конца вашего следующего хода."
    ),
    para(bold("И ты теперь трикстер")),
    para("Действие, касание: союзник не боится; +4 временных хита каждый ход (пока действует эффект)."),
    para(bold("Зачилься, другалек")),
    para("Лечение касанием: 1к8+4 хитов. Визуал: обнимашки."),
    para(italic("Обычные способности")),
    para(bold("Зеркальное отражение щита")),
    para(
      "Действие (можно вместо атаки). Щит «Зеркало Усмешки» светится до конца вашего следующего хода. Если враг атакует вас или союзника в 10 футах — реакцией (не тратя обычную реакцию) заставить спасбросок Харизмы Сл 14: провал — автопромах, помеха на следующие две атаки, 1к6 психического урона."
    ),
    para(bold("Принуждение к веселью")),
    para(
      "Действие, 30 футов. Спасбросок Мудрости Сл 14. Провал: в свой ход цель должна сделать нелепое действие по вашему выбору; отказ/невозможность — 2к8 психического и испуг до конца вашего следующего хода."
    ),
    para(bold("Удар радости")),
    para(
      "Действие: одна атака моргенштерном с автоматическим Divine Smite. Цель — спасбросок Телосложения Сл 14 или ошеломление до конца вашего следующего хода."
    ),
    para(italic("Ультимативные (макс. 2)")),
    para(bold("Взрыв неудержимого смеха")),
    para(
      "Действие (весь ход). Конус 30 фт или сфера 20 фт. Враги — Мдр Сл 15: провал — падают ничком, без действий/бонусов/реакций 1 раунд + 3к6 психического; успех — помеха на следующую атаку + половина урона."
    ),
    para(bold("Паладинская услада")),
    para(
      "1/день. Действие: вы + один союзник в 30 фт. Лечение 3к8+4; снятие эффектов как у «Меньшего восстановления» + уныния. Визуал: конфетти и ваниль."
    )
  ]);

  // KEEP magic items in equipment (user request)
  d.text.equipment = textBlock([
    para("Щит «Зеркало Усмешки» (магический, +2 КД)."),
    para("Моргенштерн Радости (1к8 дробящий)."),
    para("Кожаный доспех +2."),
    para("Флейта отца (перевязана цветными лентами)."),
    para("Бубенчик смеха (паладинский символ / фокус)."),
    para("Походный набор."),
    para("7 зм.")
  ]);

  d.text.items = textBlock([
    para("Бубенчик смеха."),
    para("Щит деда («Зеркало Усмешки»)."),
    para("Флейта отца.")
  ]);

  d.text.personality = textBlock([
    para(bold("Черты характера")),
    para("Всегда найдёт повод пошутить — даже в драке с драконом."),
    para("Боится тишины и пустоты — они напоминают Уныние."),
    para("Не умеет долго грустить — начинает бесить окружающих попытками их развеселить.")
  ]);

  d.text.ideals = textBlock([
    para(bold("Идеалы")),
    para("Свобода. Никто не укажет, когда смеяться, а когда плакать."),
    para("Радость. Жизнь — карнавал. Кто не танцует — проиграл."),
    para("Верность себе. Даже упав в Уныние — встану и устрою праздник.")
  ]);

  d.text.bonds = textBlock([
    para(bold("Привязанности")),
    para("Флейта отца — единственное, что осталось из дома."),
    para("Щит деда — стал магическим, когда дал клятву."),
    para("Будущая «та самая» — ещё не встретил, но ищет.")
  ]);

  d.text.flaws = textBlock([
    para(bold("Слабости")),
    para("Проклятие Уныния — если три раза впадёт в отчаяние, потеряет клятву."),
    para("Не может пройти мимо страдающего — должен помочь, даже если не просят."),
    para("Иногда перегибает с шутками и обижает, сам не заметив.")
  ]);

  d.text.background = textBlock([
    para(
      "Деревня сатиров Словобладис звенела музыкой, пока сущности Уныния не высосали радость. В 14 лет украл флейту отца, щит деда и ушёл."
    ),
    para(
      "Пять лет странствий. Встретил жреца Оллидхаммары: «Счастье — не место. Счастье — клятва.» Дал клятву смеяться даже когда больно. Ищет ту самую; втайне мечтает вернуть родителей туда, где есть радость."
    )
  ]);

  d.text.appearance = textBlock([
    para("Вечно улыбающийся сатир с чуть грустными глазами, если никто не видит."),
    para("Рост ~178 см, вес ~68 кг, возраст 25. Глаза золотисто-карие. Кожа светло-медовая. Волосы тёмно-каштановые, часто с лентами.")
  ]);

  d.text.allies = textBlock([
    para("Оллидхаммара (бог) — покровитель; иногда присылает смешные знаки."),
    para("Бродячий жрец «Бубенчик» — научил клятве, странствует."),
    para("Постоянной группы в начале кампании нет — открыт новым знакомствам.")
  ]);

  d.text.prof = textBlock([
    para("Языки: общий, сильван, гномий."),
    para("Инструменты: флейта / лютня.")
  ]);

  d.text["notes-2"] = textBlock([
    para(bold("Клятва шутника")),
    para("Счастье — клятва. Смеяться даже когда больно.")
  ]);

  d.text["notes-3"] = textBlock([
    para(bold("Раса: Сатир")),
    para("Скорость 35 · фейское происхождение · магическая устойчивость · рога.")
  ]);

  d.text["notes-4"] = textBlock([
    para(bold("Паладин 6 ур. — клятва шутника")),
    para("Спасбросок 14 · атака +6 · Хар."),
    para("Ячейки: 4×1, 2×2 · Аура защиты +4."),
    para("Магические предметы и «заговоры» — на вкладке заклинаний.")
  ]);

  env.spells = {
    mode: "text",
    edition: "2014",
    prepared: [],
    book: [],
    alwaysPrepared: [],
    initiateCantrips: [],
    initiateSpell: null
  };

  const spellcastingItems = [
    {
      id: "karkas-shield",
      icon: "🪞",
      name: "Щит «Зеркало Усмешки» +2",
      type: "Щит (магический)",
      rarity: "rare",
      rarityLabel: "Редкий (+2)",
      requiresAttunement: true,
      summary: "Щит деда; +2 КД. Способность «Зеркальное отражение щита».",
      description:
        "Магический щит +2. Действием (можно вместо атаки) заставляет щит светиться: до конца следующего хода при атаке по вам или союзнику в 10 фт реакцией — спасбросок Харизмы Сл 14; провал: автопромах, помеха на две атаки, 1к6 психического."
    },
    {
      id: "karkas-leather",
      icon: "🥋",
      name: "Кожаный доспех +2",
      type: "Лёгкий доспех",
      rarity: "rare",
      rarityLabel: "Редкий (+2)",
      requiresAttunement: false,
      summary: "Магический кожаный доспех (+2 к КД).",
      description: "Кожаный доспех +2. Вместе со щитом «Зеркало Усмешки» даёт КД 16 на листе."
    },
    {
      id: "karkas-morgenstern",
      icon: "🔨",
      name: "Моргенштерн Радости",
      type: "Оружие (моргенштерн)",
      rarity: "uncommon",
      rarityLabel: "Необычный",
      requiresAttunement: false,
      summary: "1к8 дробящий; носитель ауры радости и Удара радости.",
      description:
        "Моргенштерн Радости. Базовый урон 1к8 дробящий (+ дуэлянт). Бонусным действием можно окружить оружие аурой радости (1 мин): при попадании враг — Мдр Сл 14 или без реакций."
    },
    {
      id: "karkas-bell",
      icon: "🔔",
      name: "Бубенчик смеха",
      type: "Священный символ / фокус",
      rarity: "common",
      rarityLabel: "Фокус паладина",
      requiresAttunement: false,
      summary: "Паладинский символ Оллидхаммары; фокус заклинаний.",
      description: "Бубенчик смеха — священный символ и фокус колдовства паладина клятвы шутника."
    },
    {
      id: "karkas-flute",
      icon: "🎶",
      name: "Флейта отца",
      type: "Инструмент",
      rarity: "common",
      rarityLabel: "Память / инструмент",
      requiresAttunement: false,
      summary: "Единственное, что осталось из Словобладиса; для Выступления и остроумного бойца.",
      description:
        "Флейта отца, перевязанная цветными лентами. Используется для проверок Выступления и черты «Остроумный боец»."
    },
    {
      id: "karkas-cantrips",
      icon: "🎭",
      name: "«Заговоры» клятвы шутника",
      type: "Колдовство (homebrew)",
      rarityLabel: "Сл 12–14",
      requiresAttunement: false,
      summary: "Шутка перед ударом · Аура радости · Трикстер · Зачилься",
      description:
        "Шутка перед ударом — бонус, Выступление Сл 12 → преимущество +1к4. Аура радости — бонус, 1 мин, Мдр Сл 14 без реакций. И ты теперь трикстер — касание, без страха, +4 врем. хита/ход. Зачилься — 1к8+4 лечения касанием."
    },
    {
      id: "karkas-ults",
      icon: "🎉",
      name: "Ультимативные (макс. 2)",
      type: "Мощные эффекты",
      rarityLabel: "Лимит",
      requiresAttunement: false,
      summary: "Взрыв неудержимого смеха · Паладинская услада (1/день)",
      description:
        "Взрыв смеха — конус 30 / сфера 20, Мдр Сл 15, 3к6 психического, ничком на раунд. Паладинская услада — 1/день, 3к8+4 хитов вам и союзнику, снятие уныния и эффектов lesser restoration."
    }
  ];

  writeCharacter(env, d, "karkas.json", "Каркас-dnd-port.json", spellcastingItems);
}

buildKatrissa();
buildKarkas();
