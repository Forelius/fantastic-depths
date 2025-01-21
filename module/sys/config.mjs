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
FADE.SavingThrows = [
   "death",
   "wand",
   "paralysis",
   "breath",
   "spell"
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
   "heal"
]
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
   "class"
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
FADE.AdjustmentTableDD = [
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
];
FADE.Conditions = [
   {
      id: "invulnerable",
      name: "Invulnerable",
      img: `${path}img/ui/invulnerable.webp`,
      changes: [
         { key: "system.mod.ac", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: 2 },  // +2 bonus to AC (actually substracts 2)
         { key: "system.mod.save.all", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: 2 },  // +2 to all saving throw rolls
      ],
      duration: { seconds: 60 * 10 },  // Duration (10 minutes, 1 turn)
      flags: {
         [SYSTEM_ID]: {
            "statusId": "invulnerable",
            "appliedCount": 0,  // Tracks application count
            "lastApplied": null  // Tracks the last time applied for the "once per week" rule
         }
      }
   },
   {
      id: "exhausted",
      name: "Exhausted",
      img: `icons/svg/unconscious.svg`,
      changes: [
         { key: "system.mod.combat.toHit", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: -2 },  // -2 to attack rolls
         { key: "system.mod.combat.toHitRanged", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: -2 },  // -2 to attack rolls
         { key: "system.mod.combat.dmg", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: -2 },  // -2 to damage rolls
         { key: "system.mod.combat.dmgRanged", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: -2 },  // -2 to ranged damage rolls
      ],
      duration: { seconds: 60 * 30 },  // Duration (30 minutes. 3 turns)
      flags: {
         [SYSTEM_ID]: {
            "statusId": "exhausted",
         }
      }
   },
   {
      id: "protected1",
      name: "Protected from Evil",
      img: `${path}img/ui/protectfromevil.webp`,
      description: `<p>This effect creates an invisible magical barrier surrounding the spell target's body, less than an inch away.</p>
<p>In addition, enchanted creatures cannot touch the spell target. (An enchanted creature is one that cannot be harmed by normal weapons and can only be affected by magical weapons. A creature that can only be harmed by silver weapons, such as a werewolf, is not considered enchanted.Creatures that are magically summoned or controlled, like a charmed character, are also classified as enchanted.) The barrier completely protects the spell target from all melee or hand- to - hand attacks from these creatures, although it does not block attacks from missile weapons.Enchanted creatures using missile weapons still suffer the - 1 attack penalty but can hit the spell target.</p>
<p>This effect does not block magic missile spells used by magic - users.</p>
<p>If the spell target attacks an enchanted creature while this effect is active, the barrier's properties change slightly. Enchanted creatures can then touch the spell target, but they still suffer the attack roll penalty.The attack penalty and the spell target's saving throw bonus remain until the effect ends.</p>`,
      changes: [
         { key: "system.mod.combat.selfToHit", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: -1 },  // -1 to attack rolls against 
         { key: "system.mod.combat.selfToHitRanged", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: -1 },  // -1 to attack rolls against
         { key: "system.mod.save.all", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: 1 },  // +1 to all saving throw rolls
      ],
      duration: { seconds: 60 * 60 },  // Duration (60 minutes, 6 turns)
      flags: {
         [SYSTEM_ID]: {
            "statusId": "protected1",
         }
      }
   },
   {
      id: "blessed",
      name: "Blessed",
      img: `${path}img/ui/blessed.webp`,
      description: `<p>This effect improves the morale of friendly creatures by +1 and gives the recipients a +1 bonus on all attack and damage rolls. It will only affect creatures in a 20' X 20' area, and only those who are not yet in melee. </p>`,
      changes: [
         { key: "system.details.morale", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: 1 },  // +1 to morale
         { key: "system.mod.combat.toHit", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: 1 },  // +1 to attack rolls
         { key: "system.mod.combat.toHitRanged", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: 1 },  // +1 to ranged attack rolls
         { key: "system.mod.combat.dmg", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: 1 },  // +1 to damage rolls
         { key: "system.mod.combat.dmgRanged", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: 1 },  // +1 to ranged damage rolls
      ],
      duration: { seconds: 60 * 60 },  // Duration (60 minutes, 6 turns)
      flags: {
         [SYSTEM_ID]: {
            "statusId": "blessed",
         }
      }
   },
   {
      id: "blighted",
      name: "Blighted",
      img: `${path}img/ui/blessed.webp`,
      tint: "#ff3000",
      description: `<p>Blight, places a -1 penalty on enemies' morale, attack rolls, and damage rolls. Each victim may make a saving throw vs. spells to avoid the penalties. It will only affect creatures in a 20' X 20' area.</p>`,
      changes: [
         { key: "system.details.morale", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: -1 },  // -1 to morale
         { key: "system.mod.combat.toHit", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: -1 },  // -1 to attack rolls
         { key: "system.mod.combat.toHitRanged", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: -1 },  // -1 to ranged attack rolls
         { key: "system.mod.combat.dmg", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: -1 },  // -1 to damage rolls
         { key: "system.mod.combat.dmgRanged", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: -1 },  // -1 to ranged damage rolls
      ],
      duration: { seconds: 60 * 60 },  // Duration (60 minutes, 6 turns)
      flags: {
         [SYSTEM_ID]: {
            "statusId": "blighted",
         }
      }
   },
   {
      id: "shield",
      name: "Shield",
      img: `icons/svg/shield.svg`,
      tint: "#bbffcc",
      description: `<h2>Shield</h2><p>A magical barrier envelops the affected individual, forming less than an inch from their body and moving with them. While this status is active, the individual's Armor Class is set to <strong>2</strong> against missile attacks and <strong>4</strong> against all other attacks.</p><p>If the individual is targeted by a <em>magic missile</em>, they may make a <strong>saving throw vs. spells</strong> for each missile. On a successful save, the magic missile is absorbed by the barrier and evaporates without causing harm.</p>`,
      changes: [
         { key: "system.mod.upgradeAc", mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE, value: 4 },  // AC 4 for attack rolls
         { key: "system.mod.upgradeRangedAc", mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE, value: 2 },  // AC 2 for ranged attack rolls
      ],
      duration: { seconds: 20 * 60 },  // Duration (20 minutes, 2 turns)
      flags: {
         [SYSTEM_ID]: {
            "statusId": "shield",
         }
      }
   }
];
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
   attack: { phase: "melee", canMove: true },
   withdrawal: { phase: "melee", canMove: true },
   retreat: { phase: "melee", canMove: true },
   lance: { phase: "melee", canMove: true, classes: ["fighter", "dwarf", "elf"] },
   multiAttack: { phase: "melee", canMove: true, classes: ["fighter", "dwarf", "elf", "halfling"] },
   setSpear: { phase: "melee", canMove: false, classes: ["fighter", "dwarf", "elf", "halfling", "mystic"] },
   smash: { phase: "melee", canMove: true, classes: ["fighter", "dwarf", "elf", "halfling", "mystic"], special: true },
   parry: { phase: "melee", canMove: true, classes: ["fighter", "dwarf", "elf", "halfling", "mystic"], special: true },
   disarm: { phase: "melee", canMove: true, classes: ["fighter", "dwarf", "elf", "halfling", "mystic"], special: true },
   guard: { phase: "melee", canMove: true },
   unarmed: { phase: "melee", canMove: true }
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
