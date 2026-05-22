import type {
  AbilityId, BossType, EnemyType, KolyaSkinId, OwnedAbilities,
  SabSkinId, ShopItem,
} from "./types";

export const BIOME_NAMES: Record<string, string> = {
  plains: "Луга", forest: "Лес", desert: "Пустыня",
  snow: "Зима", swamp: "Болото", mountain: "Горы",
};

export const DEFAULT_ABILITIES: OwnedAbilities = {
  double_tap: false, stink_mega: false, water_splash: false, sab_fury: false,
  pullup_heal: false, rain_dance: false, traffic_steal: false, vyaly_bait: false,
};

export const ABILITY_SHOP: { id: AbilityId; name: string; desc: string; cost: number }[] = [
  { id: "double_tap", name: "Двойной плевок", desc: "2 снаряда воды (не беск.)", cost: 350 },
  { id: "stink_mega", name: "Мега-вонь", desc: "+25% радиус Q", cost: 280 },
  { id: "water_splash", name: "Брызги 75Л", desc: "-1 расход воды за выстрел", cost: 220 },
  { id: "sab_fury", name: "Ярость Семечкина", desc: "Укус сильнее (+лимит)", cost: 300 },
  { id: "pullup_heal", name: "Подтяг-Медик", desc: "+5 HP за подтяг", cost: 200 },
  { id: "rain_dance", name: "Танец дождя", desc: "+скорость под дождём", cost: 180 },
  { id: "traffic_steal", name: "Кража трафика", desc: "E дольше (+лимит)", cost: 450 },
  { id: "vyaly_bait", name: "Приманка Степа", desc: "Враги чаще на Степе", cost: 150 },
];

export const KOLYA_SKINS: { id: KolyaSkinId; name: string; desc: string; cost: number; premium?: boolean }[] = [
  { id: "default", name: "Обычный Коля", desc: "Классика", cost: 0 },
  { id: "raincoat", name: "Дождевик", desc: "Любит дождь", cost: 120 },
  { id: "kalyan", name: "Закалённый", desc: "Кальян-стиль", cost: 200 },
  { id: "alien", name: "Чужой", desc: "Зелёный режим", cost: 280 },
  { id: "kolya1", name: "Коля Premium", desc: "Самый дорогой — kolya1", cost: 999, premium: true },
];

export const SAB_SKINS: { id: SabSkinId; name: string; desc: string; cost: number }[] = [
  { id: "default", name: "Семечкин", desc: "Базовый пёс", cost: 0 },
  { id: "pug", name: "Мопс", desc: "Комичный", cost: 80 },
  { id: "husky", name: "Хаски", desc: "Снежный", cost: 150 },
  { id: "cyber", name: "Кибер-пёс", desc: "Неон", cost: 220 },
  { id: "golden", name: "Золотой", desc: "Легенда", cost: 400 },
];

export const WORLD_EVENTS = [
  "Мимо пролетел дрон с пиццей — +очки",
  "Случайный лут в кустах!",
  "Волна лагов — враги замедлились",
  "Семечкин нашёл кость!",
  "Коля чихнул — вонь x2 на 3 сек",
  "Провайдер подкинул бонус-волну",
  "Степ Вялый спит на дереве",
  "Интернет моргнул — дождь!",
  "Золотой Wi‑Fi в эфире",
  "Болото пузырится — лут",
];

export const KOLAY_NICKNAMES = [
  "Колина Кол", "Клян", "Клянцы", "Закалённый Кальян", "КолЯН 3000", "Кол-Клян", "КАЛЬЯНЩИК",
];

export const STINK_MESSAGES = [
  "ЗАПАХ ДОСТИГ СТРАТОСФЕРЫ",
  "ВЯЛЫЙ СТЕП УПАЛ С ДЕРЕВА ОТ ВОНИ",
  "ИНТЕРНЕТ ОТКЛЮЧИЛСЯ — НЕ ВЫДЕРЖАЛ",
  "ДАЖЕ СОБАК СЕМЕЧКИН ЧИХАЕТ",
  "СТЁКЛА ЛОПНУЛИ В РАДИУСЕ 3КМ",
  "БИОЛОГИЧЕСКАЯ УГРОЗА УРОВНЯ Б",
  "ЗАПАХ РАСПЛАВИЛ ТЕРМОМЕТР",
  "РЫБЫ В ОЗЕРЕ УМЕРЛИ",
  "ИНОПЛАНЕТЯНЕ ПРИНЯЛИ ЗА СИГНАЛ",
  "ЛУК ПЛАКАЛ И УШЁЛ",
];

export const INTERNET_MESSAGES = [
  "ИНТЕРНЕТ ВЫЛЕТЕЛ. ОПЯТЬ.",
  "ПРОВОД РАСПЛАВИЛСЯ №3",
  "ПИНГ: 99999ms — НОРМ",
  "РОУТЕР ЗАКИПЕЛ",
  "СКОРОСТЬ: 0.0001 МБ/С",
  "CONNECTION TIMEOUT БЕСКОНЕЧНОСТЬ",
  "ПРОВАЙДЕР КИНУЛ КАК ОБЫЧНО",
  "ПЕРЕЗАГРУЗКА #847",
  "КОЛЯ СТУЧИТ ПО ПК — НЕ ПОМОГЛО",
  "ПЛАВЛЕНЫЙ ПРОВОД ОТВАЛИЛСЯ",
];

export const SABCHAK_PHRASES = [
  "Собак Семечкин: ГАВ! (поддерживает Колю)",
  "Собак Семечкин принёс семечки и кость",
  "Собак Семечкин: Я ТЕБЯ ПРИКРОЮ КОЛЯН",
  "Собак Семечкин нашёл роутер в кустах",
  "Собак Семечкин: *чихает от вони* но остаётся",
  "Собак Семечкин сгрыз провод — интернет лучше не стал",
  "Собак Семечкин подтягивается вместе с Колей",
  "Собак Семечкин: ГАВ ГАВ ГАВ (убью вялого степа)",
];

export const POCKET_STUFF = [
  "Ржавый болт 1998г", "Кусок туалетной бумаги", "Что-то живое и мокрое",
  "Скрепка в форме Коли", "Липкая конфета без обёртки", "Таблетка неизвестного происхождения",
  "Гусеница с именем Петя", "Просто камень. Хороший.", "Носок (один)", "Рыболовный крючок с рыбой",
];

export const BOSS_NAMES: Record<BossType, string> = {
  mega_router: "МЕГА-РОУТЕР 9000",
  super_vyaly: "ВЯЛЫЙ СТЕП СУПЕР РЕЖИМ",
  alien_king: "КОРОЛЬ ИНОПЛАНЕТЯН",
  kalyan_titan: "ТИТАН ЗАКАЛЁННОГО КАЛЬЯНА",
  internet_demon: "ДЕМОН ГОВНО-ИНТЕРНЕТА",
  water_tank: "75Л ВОДЯНИСТОЙ ВОДЫ",
  child_king: "КОРОЛЬ КРУТЯЩИХСЯ ДЕТЕЙ",
  semen_god: "БОГ СЕМЕЧКИН",
  step_mega: "МЕГА-ВЯЛЫЙ СТЕП",
  router_omega: "ОМЕГА-РОУТЕР",
  alien_emperor: "ИМПЕРАТОР ТРАФИКА",
  lag_beast: "ЗВЕРЬ ЛАГОВ",
};

export const ALL_BOSS_TYPES: BossType[] = [
  "mega_router", "super_vyaly", "alien_king", "kalyan_titan", "internet_demon",
  "water_tank", "child_king", "semen_god", "step_mega", "router_omega", "alien_emperor", "lag_beast",
];

export const ENEMY_NAMES: Record<EnemyType, string> = {
  vyaly_step: "Вялый Степ",
  router: "Роутер",
  lag_ball: "ЛАГ",
  tree_ghost: "Призрак Дерева",
  wifi_drone: "Wi-Fi Дрон",
  cable_snake: "Кабель-Змея",
  lag_ghost: "Призрак Лага",
  provider_golem: "Голем Провайдера",
  child_swarm: "Рой Детей",
  rain_drop: "Капля Дождя",
  kalyan_spirit: "Дух Кальяна",
};

export const ENEMY_POINTS: Record<EnemyType, number> = {
  vyaly_step: 40, router: 30, lag_ball: 15, tree_ghost: 50, wifi_drone: 25,
  cable_snake: 35, lag_ghost: 45, provider_golem: 55, child_swarm: 20, rain_drop: 18, kalyan_spirit: 60,
};

export function isBossWave(wave: number): boolean {
  return wave > 0 && wave % 5 === 0;
}

export const SHOP_ITEMS: ShopItem[] = [
  { id: "maxHp", name: "Запахо-броня", desc: "+12 HP (макс 10)", baseCost: 80, maxLevel: 10, perLevel: 12 },
  { id: "waterCap", name: "Бак 75Л+", desc: "+8Л макс (макс 6)", baseCost: 60, maxLevel: 6, perLevel: 8 },
  { id: "speed", name: "Подтяг-скорость", desc: "+4% скорости (макс 8)", baseCost: 100, maxLevel: 8, perLevel: 0.04 },
  { id: "stinkPower", name: "Усилитель вони", desc: "+2 урона Q (макс 8)", baseCost: 90, maxLevel: 8, perLevel: 2 },
  { id: "alienCdReduce", name: "Чужой мозг", desc: "-6% кд E (макс 5)", baseCost: 120, maxLevel: 5, perLevel: 0.06 },
  { id: "sabDmg", name: "Кость Семечкина", desc: "+3 урона псу (макс 8)", baseCost: 70, maxLevel: 8, perLevel: 3 },
  { id: "waterEfficiency", name: "Экономия воды", desc: "-0.2Л за выстрел (макс 5)", baseCost: 85, maxLevel: 5, perLevel: 0.2 },
  { id: "regenBoost", name: "Реген вони", desc: "+1 HP/сек Q (макс 4)", baseCost: 110, maxLevel: 4, perLevel: 1 },
  { id: "alienDuration", name: "Фаза E+", desc: "+5% длит. E (макс 4)", baseCost: 140, maxLevel: 4, perLevel: 0.05 },
];

export const WAVE_MODIFIERS = [
  "", "УСКОРЕНИЕ", "ДВОЙНОЙ СПАВН", "ТУМАН ВОНИ", "ШТОРМ ЛАГОВ", "КРОВАВЫЙ ДОЖДЬ",
];
