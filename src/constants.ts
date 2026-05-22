import type { BossType, EnemyType, ShopItem } from "./types";

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
  { id: "maxHp", name: "Запахо-броня", desc: "+15 HP Коле", baseCost: 80, maxLevel: 10, perLevel: 15 },
  { id: "waterCap", name: "Бак 75Л+", desc: "+10Л воды макс", baseCost: 60, maxLevel: 5, perLevel: 10 },
  { id: "speed", name: "Подтяг-скорость", desc: "+5% скорости", baseCost: 100, maxLevel: 8, perLevel: 0.05 },
  { id: "stinkPower", name: "Усилитель вони", desc: "+3 урона Q", baseCost: 90, maxLevel: 10, perLevel: 3 },
  { id: "alienCdReduce", name: "Чужой мозг", desc: "-8% кд E", baseCost: 120, maxLevel: 5, perLevel: 0.08 },
  { id: "sabDmg", name: "Кость Семечкина", desc: "+4 урона псу", baseCost: 70, maxLevel: 10, perLevel: 4 },
];

export const WAVE_MODIFIERS = [
  "", "УСКОРЕНИЕ", "ДВОЙНОЙ СПАВН", "ТУМАН ВОНИ", "ШТОРМ ЛАГОВ", "КРОВАВЫЙ ДОЖДЬ",
];
