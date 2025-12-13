export const SYSTEM_ID = "fantastic-depths";
export const FADE = {};

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
   "breath", // Is physical
   "fire", // Is physical
   "frost", // Is physical
   "magic",
   "poison",
   "corrosive", // Is physical
   "heal",
   "hull",
   "fall",
   "piercing" // Short for armor-piercing. Is physical and ignores half of AV.
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
   //"wr", "siege"
];
FADE.VehicleTypes = [
   "mount",
   "simple",
   "siege",
   "vessel"
]
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
   "save",
   "spellcasting"
];
FADE.Operators = {
   eq: "=",
   gt: ">",
   lt: "<",
   gte: ">=",
   lte: "<="
}
FADE.Actions = [
   {
      id: "melee",
      img: "icons/skills/melee/sword-shield-stylized-white.webp"
   },
   {
      id: "shoot",
      img: "icons/skills/ranged/person-archery-bow-attack-gray.webp"
   },
   {
      id: "throw",
      img: "icons/skills/ranged/dagger-thrown-jeweled-purple.webp"
   },
   {
      id: "consume",
      img: "icons/consumables/drinks/pitcher-dripping-white.webp"
   },
   {
      id: "cast",
      img: "icons/magic/fire/orb-fireball-puzzle.webp"
   },
   {
      id: "use",
      img: "icons/svg/lever.svg"
   },
   {
      id: "read",
      img: "icons/sundries/scrolls/scroll-runed-brown-black.webp"
   },
   {
      id: null,
      img: null,
   }
]
FADE.CombatPhases = {
   normal: {
      specialBegin: { declared: true },
      morale: { declared: false },
      movement: { declared: false },
      missile: { declared: true },
      magicItem: { declared: true },
      magic: { declared: true },
      melee: { declared: true },
      specialEnd: { declared: true }
   },
   immortal: {
      swifter: {
         specialBegin: { declared: true },
         morale: { declared: false },
         movement: { declared: false },
         missile: { declared: true },
         magicItem: { declared: true },
      },
      slower: {
         magic: { declared: true },
         melee: { declared: true },
         specialEnd: { declared: true }
      }
   }

};
FADE.CombatManeuvers = {
   nothing: { phase: "specialEnd" },
   readyWeapon: { phase: "specialBegin", canMove: true },
   moveOnly: { phase: "movement", canMove: true },
   shove: { phase: "movement", canMove: true },
   throw: { phase: "missile", canMove: true },
   fire: { phase: "missile", canMove: true },
   spell: { phase: "magic" },
   concentrate: { phase: "specialEnd" },
   magicItem: { phase: "magicItem", canMove: true },
   attack: { phase: "melee", needWeapon: true, canMove: true },
   withdrawal: { phase: "movement", attackAfter: true, canMove: true },
   retreat: { phase: "movement", canMove: true },
   lance: { phase: "movement", needWeapon: true, needAbility: true, classes: ["fighter", "dwarf", "elf"], canMove: true },
   multiAttack: { phase: "melee", needAbility: true, classes: ["fighter", "dwarf", "elf", "halfling"], canMove: true },
   setSpear: { phase: "movement", attackBefore: true, needWeapon: true, needAbility: true, classes: ["fighter", "dwarf", "elf", "halfling", "mystic"], canMove: true },
   smash: { phase: "specialEnd", needAbility: true, classes: ["fighter", "dwarf", "elf", "halfling", "mystic"], special: true, canMove: true },
   parry: { phase: "movement", needAbility: true, classes: ["fighter", "dwarf", "elf", "halfling", "mystic"], special: true, canMove: true },
   disarm: { phase: "melee", needAbility: true, classes: ["fighter", "dwarf", "elf", "halfling", "mystic"], special: true, canMove: true },
   guard: { phase: "melee", attackBefore: true, canMove: true },
   unarmed: { phase: "melee", canMove: true },
   dodge: { phase: "melee", canMove: true },
   specialAbility: { phase: "melee", canMove: true },
   charge: { phase: "melee", special: true, classes: ["monster"], needAbility: true, canMove: true },
   swoop: { phase: "melee", special: true, classes: ["monster"], needAbility: true, canMove: true },
   crush: { phase: "melee", special: true, classes: ["monster"], needAbility: true, canMove: true }
}
FADE.ActorSizes = [
   { id: "T", isCombat: false, maxFeet: 2 },   // Tiny: Up to 2 feet
   { id: "S", isCombat: true, maxFeet: 4 },    // Small: 2 to 4 feet
   { id: "M", isCombat: true, maxFeet: 7 },    // Medium: 4 to 7 feet
   { id: "L", isCombat: true, maxFeet: 12 },   // Large: 7 to 12 feet
   { id: "G", isCombat: false, maxFeet: 25 },  // Huge: 12 to 25 feet
   { id: "I", isCombat: false, maxFeet: Infinity } // Immense: Over 25 feet (no upper limit)
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
         { min: 100, max: 3999, table: "Common Jewelry (4k)" },
         { min: 4000, max: 14999, table: "Uncommon Jewelry (15k)" },
         { min: 15000, max: 50000, table: "Rare Jewelry (50k)" }
      ]
   }
};
FADE.ActorGroups = [
   { id: "alignment", rule: "alignment", special: true },
   { id: "bugs" },
   { id: "constructs" },
   { id: "dragonkind" },
   { id: "enchanted", rule: "enchanted" },
   { id: "fey" },
   { id: "flaming-weak" },
   { id: "giantkind" },
   { id: "lycanthropes" },
   { id: "name", rule: "name", special: true },
   { id: "planar" },
   { id: "plants" },
   { id: "regenerating" },
   { id: "reptiles-dinosaurs" },
   { id: "spell-immune" },
   { id: "spellcasters", rule: "spellcaster" },
   { id: "undead" },
   { id: "water-breathing" },
   { id: "weapon-using", rule: "equippedWeapon" }
];
FADE.Armor = {
   acNaked: 9,
   acNakedAAC: 10
};
FADE.ToHit = {
   /** Represents THAC0 for Normal Man */
   baseTHAC0: 19
};
FADE.Encumbrance = {};
FADE.Encumbrance.Basic = {
   armorChoices: {
      none: "none",
      light: "light",
      heavy: "heavy"
   },
   maxMove: 120, // The default maximum movement rate per turn for an unencumbered character.
   maxLoad: 1600, // The default maximum load that a character can carry.
   defaultGearEnc: 80, // The default value for how much regular gear weighs.
   tablePC: [
      { wtPortion: 6, mvFactor: 1.0, name: "unencumbered" },
      { wtPortion: 3, mvFactor: 0.75, name: "lightly" },
      { wtPortion: 2, mvFactor: 0.5, name: "moderately" },
      { wtPortion: 1, mvFactor: 0.25, name: "encumbered" },
      { wtPortion: 0, mvFactor: 0, name: "over" },
   ],
   tableMonster: [
      { wtPortion: 2, mvFactor: 1.0, name: "unencumbered" },
      { wtPortion: 1, mvFactor: 0.5, name: "moderately" },
      { wtPortion: 0, mvFactor: 0, name: "over" },
   ]
};
FADE.Encumbrance.Expert = {
   maxMove: 120,
   maxLoad: 2400,
   tablePC: [
      { wtPortion: 6, mvFactor: 1.0, name: "unencumbered" },
      { wtPortion: 3, mvFactor: 0.75, name: "lightly" },
      { wtPortion: 2, mvFactor: 0.5, name: "moderately" },
      { wtPortion: 1.5, mvFactor: 0.25, name: "encumbered" },
      { wtPortion: 1, mvFactor: 0.125, name: "heavily" },
      { wtPortion: 0, mvFactor: 0, name: "over" }
   ],
   tableMonster: [
      { wtPortion: 2, mvFactor: 1.0, name: "unencumbered" },
      { wtPortion: 1, mvFactor: 0.5, name: "moderately" },
      { wtPortion: 0, mvFactor: 0, name: "over" },
   ]
};