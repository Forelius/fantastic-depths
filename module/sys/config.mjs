export const SYSTEM_ID = "fantastic-depths";
export const FADE = {};
const path = 'systems/fantastic-depths/assets/';

/**
 * The set of Ability Scores used within the system.
 * @type {Object}
 */
FADE.Abilities = [
   "str",
   "dex",
   "con",
   "int",
   "wis",
   "cha"
];
FADE.AttackTypes = [
   "melee",
   "missile",
   "breath",
   "save"
];
FADE.DamageTypes = [
   "physical",
   "breath",
   "fire",
   "frost",
   "magic",
   "poison",
   "heal",
   "hull"
]
FADE.ConcatLogic = [
   "none",
   "and",
   "or"
];
/** 
 * This is the type of weapon being used.
 */
FADE.WeaponTypes = [
   "monster",
   "handheld",
   "all"
];
FADE.MasteryLevels = [
   "basic",
   "skilled",
   "expert",
   "master",
   "grandMaster",
];
FADE.LightTypes = [
   "torch",
   "lantern",
   "candle",
   "bullseye",
   "magic",
   "custom"
];
FADE.SpecialAbilityCategories = [
   "explore",
   "class",
   "save"
];
FADE.Armor = {
   acNaked: 9
}
FADE.Operators = {
   eq: "=",
   gt: ">",
   lt: "<",
   gte: ">=",
   lte: "<="
}
FADE.Encumbrance = {
   armorChoices: {
      none: "none",
      light: "light",
      heavy: "heavy"
   },
   maxMove: 120, // The default maximum movement rate per turn for an unencumbered character.
   maxLoad: 2400, // The default maximum load (cn) that a character can carry.
   classicPC: [
      { wtPortion: 6, mvFactor: 1.0, name: "unencumbered" },
      { wtPortion: 3, mvFactor: 0.75, name: "lightly" },
      { wtPortion: 2, mvFactor: 0.5, name: "moderately" },
      { wtPortion: 1, mvFactor: 0.25, name: "encumbered" },
      { wtPortion: 0, mvFactor: 0, name: "over" },
   ],
   expertPC: [
      { wtPortion: 6, mvFactor: 1.0, name: "unencumbered" },
      { wtPortion: 3, mvFactor: 0.75, name: "lightly" },
      { wtPortion: 2, mvFactor: 0.5, name: "moderately" },
      { wtPortion: 1.5, mvFactor: 0.25, name: "encumbered" },
      { wtPortion: 1, mvFactor: 0.125, name: "heavily" },
      { wtPortion: 0, mvFactor: 0, name: "over" },
   ],
   monster: [
      { wtPortion: 2, mvFactor: 1.0, name: "unencumbered" },
      { wtPortion: 1, mvFactor: 0.5, name: "moderately" },
      { wtPortion: 0, mvFactor: 0, name: "over" },
   ]
};
FADE.abilityScoreModSystem = {};
FADE.abilityScoreModSystem.darkdungeons = {
   key: 'darkdungeons',
   mods: [
      { max: 1, value: -4, maxRetainers: 0, retainerMorale: 0 },
      { max: 3, value: -3, maxRetainers: 1, retainerMorale: 4 },
      { max: 5, value: -2, maxRetainers: 2, retainerMorale: 5 },
      { max: 8, value: -1, maxRetainers: 3, retainerMorale: 6 },
      { max: 12, value: 0, maxRetainers: 4, retainerMorale: 7 },
      { max: 15, value: 1, maxRetainers: 5, retainerMorale: 8 },
      { max: 17, value: 2, maxRetainers: 6, retainerMorale: 9 },
      { max: 19, value: 3, maxRetainers: 7, retainerMorale: 10 },
      { max: 21, value: 4, maxRetainers: 8, retainerMorale: 11 },
      { max: 23, value: 5, maxRetainers: 9, retainerMorale: 12 },
      { max: 27, value: 6, maxRetainers: 10, retainerMorale: 13 },
      { max: 32, value: 7, maxRetainers: 11, retainerMorale: 14 },
      { max: 38, value: 8, maxRetainers: 12, retainerMorale: 15 },
      { max: 45, value: 9, maxRetainers: 13, retainerMorale: 16 },
      { max: 53, value: 10 },
      { max: 62, value: 11 },
      { max: 70, value: 12 },
      { max: 77, value: 13 },
      { max: 83, value: 14 },
      { max: 88, value: 15 },
      { max: 93, value: 16 },
      { max: 96, value: 17 },
      { max: 98, value: 18 },
      { max: 99, value: 19 },
      { max: 100, value: 20 }
   ]
};
FADE.abilityScoreModSystem.simple = {
   key: 'simple',
   mods: [
      { max: 4, value: -1, maxRetainers: 1, loyaltyMod: -2 },
      { max: 6, value: -1, maxRetainers: 2, loyaltyMod: -2 },
      { max: 8, value: 0, maxRetainers: 3, loyaltyMod: -1 },
      { max: 12, value: 0, maxRetainers: 4, loyaltyMod: 0 },
      { max: 14, value: 0, maxRetainers: 5, loyaltyMod: 1 },
      { max: 15, value: 1, maxRetainers: 5, loyaltyMod: 1 },
      { max: 17, value: 1, maxRetainers: 6, loyaltyMod: 2 },
      { max: 18, value: 1, maxRetainers: 7, loyaltyMod: 2 }
   ]
};
FADE.Actions = [
   {
      id: "attack",
      img: "icons/svg/sword.svg",
   },
   {
      id: "consume",
      img: "icons/consumables/drinks/pitcher-dripping-white.webp",
   },
   {
      id: "cast",
      img: "icons/magic/fire/orb-fireball-puzzle.webp",
   }
]
FADE.CombatPhases = {
   morale: { declared: false },
   movement: { declared: false },
   missile: { declared: true },
   magic: { declared: true },
   melee: { declared: true },
   special: { declared: true },
};
FADE.CombatManeuvers = {
   nothing: { phase: "special", canMove: false },
   readyWeapon: { phase: "special", canMove: true },
   moveOnly: { phase: "movement", canMove: true },
   shove: { phase: "movement", canMove: true },
   throw: { phase: "missile", canMove: true },
   fire: { phase: "missile", canMove: true },
   spell: { phase: "magic", canMove: false },
   magicItem: { phase: "magic", canMove: false },
   attack: { phase: "melee", canMove: true, needWeapon: true },
   withdrawal: { phase: "melee", canMove: true },
   retreat: { phase: "melee", canMove: true },
   lance: { phase: "melee", canMove: true, needWeapon: true, needAbility: true, classes: ["fighter", "dwarf", "elf"] },
   multiAttack: { phase: "melee", canMove: true, needAbility: true, classes: ["fighter", "dwarf", "elf", "halfling"] },
   setSpear: { phase: "melee", canMove: false, needWeapon: true, needAbility: true, classes: ["fighter", "dwarf", "elf", "halfling", "mystic"] },
   smash: { phase: "melee", canMove: true, needAbility: true, classes: ["fighter", "dwarf", "elf", "halfling", "mystic"], special: true },
   parry: { phase: "melee", canMove: true, needAbility: true, classes: ["fighter", "dwarf", "elf", "halfling", "mystic"], special: true },
   disarm: { phase: "melee", canMove: true, needAbility: true, classes: ["fighter", "dwarf", "elf", "halfling", "mystic"], special: true },
   guard: { phase: "melee", canMove: true },
   unarmed: { phase: "melee", canMove: true },
   dodge: { phase: "melee", canMove: true }
}
FADE.WrestlingStates = ["defpin", "deftakedown", "defgrab", "free", "attgrab", "atttakedown", "attpin"];
FADE.ActorSizes = [
   { id: "T", shoveResist: 1, isCombat: false, maxFeet: 2 },   // Tiny: Up to 2 feet
   { id: "S", shoveResist: 2, isCombat: true, maxFeet: 4 },    // Small: 2 to 4 feet
   { id: "M", shoveResist: 3, isCombat: true, maxFeet: 7 },    // Medium: 4 to 7 feet
   { id: "L", shoveResist: 4, isCombat: true, maxFeet: 12 },   // Large: 7 to 12 feet
   { id: "G", shoveResist: 5, isCombat: false, maxFeet: 25 },  // Huge: 12 to 25 feet
   { id: "I", shoveResist: 6, isCombat: false, maxFeet: Infinity } // Immense: Over 25 feet (no upper limit)
];
FADE.TreasureTypes = {
   coins: {
      cp: 0.01,
      sp: 0.1,
      ep: 0.5,
      gp: 1,
      pp: 5
   },
   gems: [
      { "type": "agate", "value": 10 },
      { "type": "quartz", "value": 10 },
      { "type": "turquoise", "value": 10 },
      { "type": "crystal", "value": 50 },
      { "type": "jasper", "value": 50 },
      { "type": "onyx", "value": 50 },
      { "type": "amber", "value": 100 },
      { "type": "amethyst", "value": 100 },
      { "type": "coral", "value": 100 },
      { "type": "garnet", "value": 100 },
      { "type": "jade", "value": 100 },
      { "type": "aquamarine", "value": 500 },
      { "type": "pearl", "value": 500 },
      { "type": "topaz", "value": 500 },
      { "type": "carbuncle", "value": 1000 },
      { "type": "opal", "value": 1000 },
      { "type": "emerald", "value": 5000 },
      { "type": "ruby", "value": 5000 },
      { "type": "sapphire", "value": 5000 },
      { "type": "diamond", "value": 10000 },
      { "type": "jacinth", "value": 10000 },
      { "type": "starstone", "value": 0 },
      { "type": "tristal", "value": 0 }
   ],
   jewelry: {
      values: [
         { "min": 1, "max": 1, "value": 100, "encumbrance": 10 },
         { "min": 2, "max": 3, "value": 500, "encumbrance": 10 },
         { "min": 4, "max": 6, "value": 1000, "encumbrance": 10 },
         { "min": 7, "max": 10, "value": 1500, "encumbrance": 10 },
         { "min": 11, "max": 16, "value": 2000, "encumbrance": 10 },
         { "min": 17, "max": 24, "value": 2500, "encumbrance": 10 },
         { "min": 25, "max": 34, "value": 3000, "encumbrance": 25 },
         { "min": 35, "max": 45, "value": 4000, "encumbrance": 25 },
         { "min": 46, "max": 58, "value": 5000, "encumbrance": 25 },
         { "min": 59, "max": 69, "value": 7500, "encumbrance": 25 },
         { "min": 70, "max": 78, "value": 10000, "encumbrance": 25 },
         { "min": 79, "max": 85, "value": 15000, "encumbrance": 25 },
         { "min": 86, "max": 90, "value": 20000, "encumbrance": 50 },
         { "min": 91, "max": 94, "value": 25000, "encumbrance": 50 },
         { "min": 95, "max": 97, "value": 30000, "encumbrance": 50 },
         { "min": 98, "max": 99, "value": 40000, "encumbrance": 50 },
         { "min": 100, "max": 100, "value": 50000, "encumbrance": 50 }
      ],
      rollTables: [
         { min: 100, max: 3999, table: "Common Jewelry (<4k)" },
         { min: 4000, max: 14999, table: "Uncommon Jewelry (<15k)" },
         { min: 15000, max: 50000, table: "Rare Jewelry (<50k)" }
      ]
   }
};
