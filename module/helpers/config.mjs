export const FADE = {};
/**
 * The set of Ability Scores used within the system.
 * @type {Object}
 */
FADE.Armor = {
   acNaked: 9
}
FADE.Encumbrance = {
   max: 2400,
   table: [
      { max: 400, mv: 120, label: "Unencumbered", desc: "Free to move without any hindrance." },
      { max: 800, mv: 90, label: "Lightly Encumbered", desc: "Slightly burdened, movement is still easy." },
      { max: 1200, mv: 60, label: "Moderately Encumbered", desc: "Noticeable weight, movement is somewhat restricted." },
      { max: 1600, mv: 30, label: "Encumbered", desc: "Significantly burdened, movement is sluggish." },
      { max: 2400, mv: 15, label: "Heavily Encumbered", desc: "Struggling under weight, movement is laborious." },
      { max: 9999999, mv: 0, label: "Over Encumbered", desc: "Severely overloaded, movement is impossible." },
   ]
};
FADE.Classes = {
   cleric: {
      name: "Cleric", race: "Human", primeReqs: [{ attribute: "wis", xpBonus5: 13, xpBonus10: 16 }], maxLevel: 36,
      levels: [
         { level: 1, xp: 0, thac0: 19, hd: "1d6", hdcon: true }, { level: 2, xp: 1500, thac0: 19, hd: "2d6", hdcon: true }, { level: 3, xp: 3000, thac0: 19, hd: "3d6", hdcon: true },
         { level: 4, xp: 6000, thac0: 19, hd: "4d6", hdcon: true }, { level: 5, xp: 12000, thac0: 17, hd: "5d6", hdcon: true }, { level: 6, xp: 25000, thac0: 17, hd: "6d6", hdcon: true },
         { level: 7, xp: 50000, thac0: 17, hd: "7d6", hdcon: true }, { level: 8, xp: 100000, thac0: 17, hd: "8d6", hdcon: true }, { level: 9, xp: 200000, thac0: 15, hd: "9d6", hdcon: true },
         { level: 10, xp: 300000, thac0: 15, hd: "9d6+1" }, { level: 11, xp: 400000, thac0: 15, hd: "9d6+2" }, { level: 12, xp: 500000, thac0: 15, hd: "9d6+3" },
         { level: 13, xp: 600000, thac0: 13, hd: "9d6+4" }, { level: 14, xp: 700000, thac0: 13, hd: "9d6+5" }, { level: 15, xp: 800000, thac0: 13, hd: "9d6+6" },
         { level: 16, xp: 900000, thac0: 13, hd: "9d6+7" }, { level: 17, xp: 1000000, thac0: 11, hd: "9d6+8" }, { level: 18, xp: 1100000, thac0: 11, hd: "9d6+9" },
         { level: 19, xp: 1200000, thac0: 11, hd: "9d6+10" }, { level: 20, xp: 1300000, thac0: 11, hd: "9d6+11" }, { level: 21, xp: 1400000, thac0: 9, hd: "9d6+12" },
         { level: 22, xp: 1500000, thac0: 9, hd: "9d6+13" }, { level: 23, xp: 1600000, thac0: 9, hd: "9d6+14" }, { level: 24, xp: 1700000, thac0: 9, hd: "9d6+15" },
      ],
      spells: [
         // 1 - 6
         [0, 0, 0, 0, 0, 0, 0], [1, 0, 0, 0, 0, 0, 0], [2, 0, 0, 0, 0, 0, 0], [2, 1, 0, 0, 0, 0, 0], [2, 2, 0, 0, 0, 0, 0], [2, 2, 1, 0, 0, 0, 0],
         // 7 - 12
         [3, 2, 2, 0, 0, 0, 0], [3, 3, 2, 1, 0, 0, 0], [3, 3, 3, 2, 0, 0, 0], [4, 4, 3, 2, 1, 0, 0], [4, 4, 3, 3, 2, 0, 0], [4, 4, 4, 3, 2, 1, 0],
         // 13 - 18
         [5, 5, 4, 3, 2, 2, 0], [5, 5, 5, 3, 3, 2, 0], [6, 5, 5, 3, 3, 3, 0], [6, 5, 5, 4, 4, 3, 0], [6, 6, 5, 4, 4, 3, 1], [6, 6, 5, 4, 4, 3, 2],
         // 19 - 24
         [7, 6, 5, 4, 4, 4, 2], [7, 6, 5, 4, 4, 4, 3], [7, 6, 5, 5, 5, 4, 3], [7, 6, 5, 5, 5, 4, 4], [7, 7, 6, 6, 5, 4, 4], [8, 7, 6, 6, 5, 5, 4],
      ],
      saves: [
         { level: 4, death: 11, magic: 12, paralysis: 14, breath: 16, spell: 15 },
         { level: 8, death: 9, magic: 10, paralysis: 12, breath: 14, spell: 13 },
         { level: 12, death: 7, magic: 8, paralysis: 10, breath: 12, spell: 11 },
         { level: 16, death: 6, magic: 7, paralysis: 8, breath: 10, spell: 9 },
         { level: 20, death: 5, magic: 6, paralysis: 6, breath: 8, spell: 7 },
         { level: 24, death: 4, magic: 5, paralysis: 5, breath: 6, spell: 5 },
      ]
   },
   fighter: {
      name: "Fighter", race: "Human", primeReqs: [{ attribute: "str", xpBonus5: 13, xpBonus10: 16 }], maxLevel: 36,
      levels: [
         { level: 1, xp: 0, thac0: 19, hd: "1d8", hdcon: true }, { level: 2, xp: 2000, thac0: 19, hd: "2d8", hdcon: true }, { level: 3, xp: 4000, thac0: 19, hd: "3d8", hdcon: true },
         { level: 4, xp: 8000, thac0: 17, hd: "4d8", hdcon: true }, { level: 5, xp: 16000, thac0: 17, hd: "5d8", hdcon: true }, { level: 6, xp: 32000, thac0: 17, hd: "6d8", hdcon: true },
         { level: 7, xp: 64000, thac0: 15, hd: "7d8", hdcon: true }, { level: 8, xp: 120000, thac0: 15, hd: "8d8", hdcon: true }, { level: 9, xp: 240000, thac0: 15, hd: "9d8", hdcon: true },
         { level: 10, xp: 360000, thac0: 13, hd: "9d8+2" }, { level: 11, xp: 480000, thac0: 13, hd: "9d8+4" }, { level: 12, xp: 600000, thac0: 13, hd: "9d8+6" },
         { level: 13, xp: 720000, thac0: 11, hd: "9d8+8" }, { level: 14, xp: 840000, thac0: 11, hd: "9d8+10" }, { level: 15, xp: 960000, thac0: 11, hd: "9d8+12" },
         { level: 16, xp: 1080000, thac0: 9, hd: "9d8+14" }, { level: 17, xp: 1200000, thac0: 9, hd: "9d8+16" }, { level: 18, xp: 1320000, thac0: 9, hd: "9d8+18" },
         { level: 19, xp: 1440000, thac0: 7, hd: "9d8+20" }, { level: 20, xp: 1560000, thac0: 7, hd: "9d8+22" }, { level: 21, xp: 1680000, thac0: 7, hd: "9d8+24" },
         { level: 22, xp: 1800000, thac0: 5, hd: "9d8+26" }, { level: 23, xp: 1920000, thac0: 5, hd: "9d8+28" }, { level: 24, xp: 2040000, thac0: 5, hd: "9d8+30" },
      ],
      saves: [
         { level: 0, death: 14, magic: 15, paralysis: 16, breath: 17, spell: 17 },
         { level: 3, death: 12, magic: 13, paralysis: 14, breath: 15, spell: 16 },
         { level: 6, death: 10, magic: 11, paralysis: 12, breath: 13, spell: 14 },
         { level: 9, death: 8, magic: 9, paralysis: 10, breath: 11, spell: 12 },
         { level: 12, death: 6, magic: 7, paralysis: 8, breath: 9, spell: 10 },
         { level: 15, death: 6, magic: 6, paralysis: 7, breath: 8, spell: 9 },
         { level: 18, death: 5, magic: 6, paralysis: 6, breath: 7, spell: 8 },
         { level: 21, death: 5, magic: 5, paralysis: 6, breath: 6, spell: 7 },
         { level: 24, death: 4, magic: 5, paralysis: 5, breath: 4, spell: 6 },
      ]
   }
};
FADE.AdjustmentTable = [
   { max: 1, value: -4 },
   { max: 3, value: -3 },
   { max: 5, value: -2 },
   { max: 8, value: -1 },
   { max: 12, value: 0 },
   { max: 15, value: 1 },
   { max: 17, value: 2 },
   { max: 19, value: 3 },
   { max: 21, value: 4 },
   { max: 23, value: 5 },
   { max: 27, value: 6 },
   { max: 32, value: 7 },
   { max: 38, value: 8 },
   { max: 45, value: 9 },
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
FADE.Languages = [
   { name: "Common", script: "Common", description: "Common is the universal language spoken by most races." },
   { name: "Dwarvish", script: "Dwarvish", description: "Dwarvish uses a runic script typical for dwarven cultures." },
   { name: "Elvish", script: "Elvish", description: "Elvish uses a flowing, script-like writing typical of elven cultures." },
   { name: "Giant", script: "Dwarvish", description: "Giant shares the runic script with Dwarvish due to historical and cultural overlaps." },
   { name: "Gnomish", script: "Dwarvish", description: "Gnomish shares the script with Dwarvish, reflecting similar cultural roots." },
   { name: "Goblin", script: "Dwarvish", description: "Goblin uses the same script as Dwarvish, typically adapted for goblin use." },
   { name: "Halfling", script: "Common", description: "Halfling uses the Common script, reflecting their integration with human societies." },
   { name: "Orcish", script: "Dwarvish", description: "Orcish uses the Dwarvish script, often due to interactions and conflicts with dwarves." },
   { name: "Draconic", script: "Draconic", description: "Draconic uses a unique script specific to dragons and ancient reptilian races." },
   { name: "Abyssal", script: "Infernal", description: "Abyssal uses the Infernal script, reflecting its demonic origins." },
   { name: "Celestial", script: "Celestial", description: "Celestial uses a script of divine origin, often used by celestial beings." },
   { name: "Infernal", script: "Infernal", description: "Infernal uses a specific script for devils and infernal entities." },
   { name: "Primordial", script: "Primordial", description: "Primordial uses a script that predates most other languages, often associated with elemental beings." },
   { name: "Sylvan", script: "Elvish", description: "Sylvan uses the Elvish script, reflecting the fey and nature-oriented culture." },
   { name: "Undercommon", script: "Elvish", description: "Undercommon uses the Elvish script, adapted for use in the Underdark." },
   { name: "Lawful", script: "None", description: "Lawful alignment language is spoken only and has no written script." },
   { name: "Chaotic", script: "None", description: "Chaotic alignment language is spoken only and has no written script." },
   { name: "Neutral", script: "None", description: "Neutral alignment language is spoken only and has no written script." }
];
