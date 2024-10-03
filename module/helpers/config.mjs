export const FADE = {};
/**
 * The set of Ability Scores used within the system.
 * @type {Object}
 */
FADE.Abilities = {
   str: "Strength",
   dex: "Dexterity",
   con: "Constitution",
   int: "Intelligence",
   wis: "Wisdom",
   cha: "Charisma"
};
FADE.MasteryLevels = {
   basic: "Basic",
   skilled: "Skilled",
   expert: "Expert",
   master: "Master",
   grandMaster: "Grand Master",
};
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
   pc: [
      { wtPortion: 6, mvFactor: 1.0, label: "Unencumbered", desc: "Free to move without any hindrance." },
      { wtPortion: 3, mvFactor: 0.75, label: "Lightly Encumbered", desc: "Slightly burdened, movement is still easy." },
      { wtPortion: 2, mvFactor: 0.5, label: "Moderately Encumbered", desc: "Noticeable weight, movement is somewhat restricted." },
      { wtPortion: 1.5, mvFactor: 0.25, label: "Encumbered", desc: "Significantly burdened, movement is sluggish." },
      { wtPortion: 1, mvFactor: 0.125, label: "Heavily Encumbered", desc: "Struggling under weight, movement is laborious." },
      { wtPortion: 0, mvFactor: 0, label: "Over Encumbered", desc: "Severely overloaded, movement is impossible." },
   ],
   monster: [
      { wtPortion: 2, mvFactor: 1.0, label: "Unencumbered", desc: "Free to move without any hindrance." },
      { wtPortion: 1, mvFactor: 0.5, label: "Moderately Encumbered", desc: "Noticeable weight, movement is somewhat restricted. Half of maximum." },
      { wtPortion: 0, mvFactor: 0, label: "Over Encumbered", desc: "Severely overloaded, movement is impossible." },
   ]
};
FADE.Classes = {
   cleric: {
      name: "Cleric", species: "Human", primeReqs: [{ ability: "wis", xpBonus5: 13, xpBonus10: 16 }], maxLevel: 36,
      levels: [
         { level: 1, xp: 0, thac0: 19, hd: "1d6", hdcon: true, title: "Acolyte" },
         { level: 2, xp: 1500, thac0: 19, hd: "2d6", hdcon: true, title: "Adept" },
         { level: 3, xp: 3000, thac0: 19, hd: "3d6", hdcon: true, title: "Priest", femaleTitle: "Priestess" },
         { level: 4, xp: 6000, thac0: 19, hd: "4d6", hdcon: true, title: "Vicar" },
         { level: 5, xp: 12000, thac0: 17, hd: "5d6", hdcon: true, title: "Curate" },
         { level: 6, xp: 25000, thac0: 17, hd: "6d6", hdcon: true, title: "Elder" },
         { level: 7, xp: 50000, thac0: 17, hd: "7d6", hdcon: true, title: "Bishop" },
         { level: 8, xp: 100000, thac0: 17, hd: "8d6", hdcon: true, title: "Lama" },
         { level: 9, xp: 200000, thac0: 15, hd: "9d6", hdcon: true, title: "Patriarch", femaleTitle: "Matriarch" },
         { level: 10, xp: 300000, thac0: 15, hd: "9d6+1" },
         { level: 11, xp: 400000, thac0: 15, hd: "9d6+2" },
         { level: 12, xp: 500000, thac0: 15, hd: "9d6+3" },
         { level: 13, xp: 600000, thac0: 13, hd: "9d6+4" },
         { level: 14, xp: 700000, thac0: 13, hd: "9d6+5" },
         { level: 15, xp: 800000, thac0: 13, hd: "9d6+6" },
         { level: 16, xp: 900000, thac0: 13, hd: "9d6+7" },
         { level: 17, xp: 1000000, thac0: 11, hd: "9d6+8" },
         { level: 18, xp: 1100000, thac0: 11, hd: "9d6+9" },
         { level: 19, xp: 1200000, thac0: 11, hd: "9d6+10" },
         { level: 20, xp: 1300000, thac0: 11, hd: "9d6+11" },
         { level: 21, xp: 1400000, thac0: 9, hd: "9d6+12" },
         { level: 22, xp: 1500000, thac0: 9, hd: "9d6+13" },
         { level: 23, xp: 1600000, thac0: 9, hd: "9d6+14" },
         { level: 24, xp: 1700000, thac0: 9, hd: "9d6+15" },
         { level: 25, xp: 1800000, thac0: 7, hd: "9d6+16" },
         { level: 26, xp: 1900000, thac0: 7, hd: "9d6+17" },
         { level: 27, xp: 2000000, thac0: 7, hd: "9d6+18" },
         { level: 28, xp: 2100000, thac0: 7, hd: "9d6+19" },
         { level: 29, xp: 2200000, thac0: 5, hd: "9d6+20" },
         { level: 30, xp: 2300000, thac0: 5, hd: "9d6+21" },
         { level: 31, xp: 2400000, thac0: 5, hd: "9d6+22" },
         { level: 32, xp: 2500000, thac0: 5, hd: "9d6+23" },
         { level: 33, xp: 2600000, thac0: 3, hd: "9d6+24" },
         { level: 34, xp: 2700000, thac0: 3, hd: "9d6+25" },
         { level: 35, xp: 2800000, thac0: 3, hd: "9d6+26" },
         { level: 36, xp: 2900000, thac0: 2, hd: "9d6+27" },
      ],
      saves: [
         { level: 4, death: 11, wand: 12, paralysis: 14, breath: 16, spell: 15 },
         { level: 8, death: 9, wand: 10, paralysis: 12, breath: 14, spell: 13 },
         { level: 12, death: 7, wand: 8, paralysis: 10, breath: 12, spell: 11 },
         { level: 16, death: 6, wand: 7, paralysis: 8, breath: 10, spell: 9 },
         { level: 20, death: 5, wand: 6, paralysis: 6, breath: 8, spell: 7 },
         { level: 24, death: 4, wand: 5, paralysis: 5, breath: 6, spell: 5 },
         { level: 28, death: 3, wand: 4, paralysis: 4, breath: 4, spell: 4 },
         { level: 32, death: 2, wand: 3, paralysis: 3, breath: 3, spell: 3 },
         { level: 99, death: 2, wand: 2, paralysis: 2, breath: 2, spell: 2 },
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
         // 25 - 30
         [8, 7, 6, 6, 5, 5, 5], [8, 7, 7, 6, 6, 5, 5], [8, 8, 7, 6, 6, 6, 5], [8, 8, 7, 7, 7, 6, 5], [8, 8, 7, 7, 7, 6, 6], [8, 8, 8, 7, 7, 7, 6],
         // 31 - 36
         [8, 8, 8, 8, 8, 7, 6], [9, 8, 8, 8, 8, 7, 7], [9, 9, 8, 8, 8, 8, 7], [9, 9, 9, 8, 8, 8, 8], [9, 9, 9, 9, 9, 8, 8], [9, 9, 9, 9, 9, 9, 9]
      ]
   },
   fighter: {
      name: "Fighter", species: "Human", primeReqs: [{ ability: "str", xpBonus5: 13, xpBonus10: 16 }], maxLevel: 36,
      levels: [
         { level: 0, xp: 0, thac0: 20, hd: "1d6", hdcon: true, title: "Normal Man" },
         { level: 1, xp: 0, thac0: 19, hd: "1d8", hdcon: true, title: "Veteran" },
         { level: 2, xp: 2000, thac0: 19, hd: "2d8", hdcon: true, title: "Warrior" },
         { level: 3, xp: 4000, thac0: 19, hd: "3d8", hdcon: true, title: "Swordmaster" },
         { level: 4, xp: 8000, thac0: 17, hd: "4d8", hdcon: true, title: "Hero" },
         { level: 5, xp: 16000, thac0: 17, hd: "5d8", hdcon: true, title: "Swashbuckler" },
         { level: 6, xp: 32000, thac0: 17, hd: "6d8", hdcon: true, title: "Myrmidon" },
         { level: 7, xp: 64000, thac0: 15, hd: "7d8", hdcon: true, title: "Champion" },
         { level: 8, xp: 120000, thac0: 15, hd: "8d8", hdcon: true, title: "Superhero" },
         { level: 9, xp: 240000, thac0: 15, hd: "9d8", hdcon: true, title: "Lord", titleFemale: "Lady" },
         { level: 10, xp: 360000, thac0: 13, hd: "9d8+2" },
         { level: 11, xp: 480000, thac0: 13, hd: "9d8+4" },
         { level: 12, xp: 600000, thac0: 13, hd: "9d8+6" },
         { level: 13, xp: 720000, thac0: 11, hd: "9d8+8" },
         { level: 14, xp: 840000, thac0: 11, hd: "9d8+10" },
         { level: 15, xp: 960000, thac0: 11, hd: "9d8+12" },
         { level: 16, xp: 1080000, thac0: 9, hd: "9d8+14" },
         { level: 17, xp: 1200000, thac0: 9, hd: "9d8+16" },
         { level: 18, xp: 1320000, thac0: 9, hd: "9d8+18" },
         { level: 19, xp: 1440000, thac0: 7, hd: "9d8+20" },
         { level: 20, xp: 1560000, thac0: 7, hd: "9d8+22" },
         { level: 21, xp: 1680000, thac0: 7, hd: "9d8+24" },
         { level: 22, xp: 1800000, thac0: 5, hd: "9d8+26" },
         { level: 23, xp: 1920000, thac0: 5, hd: "9d8+28" },
         { level: 24, xp: 2040000, thac0: 5, hd: "9d8+30" },
         { level: 25, xp: 2160000, thac0: 3, hd: "9d8+32" },
         { level: 26, xp: 2280000, thac0: 3, hd: "9d8+34" },
         { level: 27, xp: 2400000, thac0: 3, hd: "9d8+36" },
         { level: 28, xp: 2520000, thac0: 2, hd: "9d8+38" },
         { level: 29, xp: 2640000, thac0: 2, hd: "9d8+40" },
         { level: 30, xp: 2760000, thac0: 2, hd: "9d8+42" },
         { level: 31, xp: 2880000, thac0: 2, hd: "9d8+44" },
         { level: 32, xp: 3000000, thac0: 2, hd: "9d8+46" },
         { level: 33, xp: 3120000, thac0: 2, hd: "9d8+48" },
         { level: 34, xp: 3240000, thac0: 1, hd: "9d8+50" },
         { level: 35, xp: 3360000, thac0: 1, hd: "9d8+52" },
         { level: 36, xp: 3480000, thac0: 1, hd: "9d8+54" }
      ],
      saves: [
         { level: 0, death: 14, wand: 15, paralysis: 16, breath: 17, spell: 17 },
         { level: 3, death: 12, wand: 13, paralysis: 14, breath: 15, spell: 16 },
         { level: 6, death: 10, wand: 11, paralysis: 12, breath: 13, spell: 14 },
         { level: 9, death: 8, wand: 9, paralysis: 10, breath: 11, spell: 12 },
         { level: 12, death: 6, wand: 7, paralysis: 8, breath: 9, spell: 10 },
         { level: 15, death: 6, wand: 6, paralysis: 7, breath: 8, spell: 9 },
         { level: 18, death: 5, wand: 6, paralysis: 6, breath: 7, spell: 8 },
         { level: 21, death: 5, wand: 5, paralysis: 6, breath: 6, spell: 7 },
         { level: 24, death: 4, wand: 5, paralysis: 5, breath: 4, spell: 6 },
         { level: 27, death: 4, wand: 4, paralysis: 5, breath: 4, spell: 5 },
         { level: 30, death: 3, wand: 4, paralysis: 4, breath: 3, spell: 4 },
         { level: 33, death: 3, wand: 3, paralysis: 3, breath: 2, spell: 3 },
         { level: 99, death: 2, wand: 2, paralysis: 2, breath: 2, spell: 2 }
      ]
   },
   magic_user: {
      name: "Magic-User", species: "Human", primeReqs: [{ ability: "int", xpBonus5: 13, xpBonus10: 16 }], maxLevel: 36,
      levels: [
         { level: 1, xp: 0, thac0: 19, hd: "1d4", hdcon: true, title: "Medium" },
         { level: 2, xp: 2500, thac0: 19, hd: "2d4", hdcon: true, title: "Seer" },
         { level: 3, xp: 5000, thac0: 19, hd: "3d4", hdcon: true, title: "Conjurer" },
         { level: 4, xp: 10000, thac0: 19, hd: "4d4", hdcon: true, title: "Magician" },
         { level: 5, xp: 20000, thac0: 19, hd: "5d4", hdcon: true, title: "Enchanter", titleFemale: "Enchantress" },
         { level: 6, xp: 40000, thac0: 17, hd: "6d4", hdcon: true, title: "Warlock" },
         { level: 7, xp: 80000, thac0: 17, hd: "7d4", hdcon: true, title: "Sorcerer", titleFemale: "Sorceress" },
         { level: 8, xp: 150000, thac0: 17, hd: "8d4", hdcon: true, title: "Necromancer" },
         { level: 9, xp: 300000, thac0: 17, hd: "9d4", hdcon: true, title: "Wizard" },
         { level: 10, xp: 450000, thac0: 17, hd: "9d4+1" },
         { level: 11, xp: 600000, thac0: 15, hd: "9d4+2" },
         { level: 12, xp: 750000, thac0: 15, hd: "9d4+3" },
         { level: 13, xp: 900000, thac0: 15, hd: "9d4+4" },
         { level: 14, xp: 1050000, thac0: 15, hd: "9d4+5" },
         { level: 15, xp: 1200000, thac0: 15, hd: "9d4+6" },
         { level: 16, xp: 1350000, thac0: 13, hd: "9d4+7" },
         { level: 17, xp: 1500000, thac0: 13, hd: "9d4+8" },
         { level: 18, xp: 1650000, thac0: 13, hd: "9d4+9" },
         { level: 19, xp: 1800000, thac0: 13, hd: "9d4+10" },
         { level: 20, xp: 1950000, thac0: 13, hd: "9d4+11" },
         { level: 21, xp: 2100000, thac0: 11, hd: "9d4+12" },
         { level: 22, xp: 2250000, thac0: 11, hd: "9d4+13" },
         { level: 23, xp: 2400000, thac0: 11, hd: "9d4+14" },
         { level: 24, xp: 2550000, thac0: 11, hd: "9d4+15" },
         { level: 25, xp: 2700000, thac0: 9, hd: "9d4+16" },
         { level: 26, xp: 2850000, thac0: 9, hd: "9d4+17" },
         { level: 27, xp: 3000000, thac0: 9, hd: "9d4+18" },
         { level: 28, xp: 3150000, thac0: 9, hd: "9d4+19" },
         { level: 29, xp: 3300000, thac0: 7, hd: "9d4+20" },
         { level: 30, xp: 3450000, thac0: 7, hd: "9d4+21" },
         { level: 31, xp: 3600000, thac0: 7, hd: "9d4+22" },
         { level: 32, xp: 3750000, thac0: 7, hd: "9d4+23" },
         { level: 33, xp: 3900000, thac0: 5, hd: "9d4+24" },
         { level: 34, xp: 4050000, thac0: 5, hd: "9d4+25" },
         { level: 35, xp: 4200000, thac0: 5, hd: "9d4+26" },
         { level: 36, xp: 4350000, thac0: 5, hd: "9d4+27" }
      ],
      saves: [
         { level: 5, death: 13, wand: 14, paralysis: 13, breath: 16, spell: 15 },
         { level: 10, death: 11, wand: 12, paralysis: 11, breath: 14, spell: 12 },
         { level: 15, death: 9, wand: 10, paralysis: 9, breath: 12, spell: 9 },  
         { level: 20, death: 7, wand: 8, paralysis: 7, breath: 10, spell: 6 },   
         { level: 24, death: 5, wand: 6, paralysis: 5, breath: 8, spell: 4 },    
         { level: 28, death: 4, wand: 4, paralysis: 4, breath: 6, spell: 3 },
         { level: 32, death: 3, wand: 3, paralysis: 3, breath: 4, spell: 2 },
         { level: 99, death: 2, wand: 2, paralysis: 2, breath: 2, spell: 2 }
      ],
      spells: [
         // 1 - 5
         [1, 0, 0, 0, 0, 0, 0, 0, 0], [2, 0, 0, 0, 0, 0, 0, 0, 0], [2, 1, 0, 0, 0, 0, 0, 0, 0], [2, 2, 0, 0, 0, 0, 0, 0, 0], [2, 2, 1, 0, 0, 0, 0, 0, 0],
         // 6 - 10
         [2, 2, 2, 0, 0, 0, 0, 0, 0], [3, 2, 2, 1, 0, 0, 0, 0, 0], [3, 3, 2, 2, 0, 0, 0, 0, 0], [3, 3, 3, 2, 1, 0, 0, 0, 0], [3, 3, 3, 3, 2, 0, 0, 0, 0],
         // 11 - 15
         [4, 3, 3, 3, 2, 0, 0, 0, 0], [4, 4, 4, 3, 2, 1, 0, 0, 0], [4, 4, 4, 3, 2, 2, 0, 0, 0], [4, 4, 4, 4, 3, 2, 0, 0, 0], [5, 4, 4, 4, 3, 2, 1, 0, 0],
         // 16 - 20
         [5, 5, 5, 4, 3, 2, 2, 0, 0], [6, 5, 5, 4, 4, 3, 2, 0, 0], [6, 5, 5, 4, 4, 3, 2, 1, 0], [6, 5, 5, 5, 4, 3, 2, 2, 0], [6, 5, 5, 5, 4, 4, 3, 2, 0],
         // 21 - 25
         [6, 5, 5, 5, 4, 4, 3, 2, 1],
         [6, 6, 5, 5, 5, 4, 3, 2, 2],
         [6, 6, 6, 6, 5, 4, 3, 3, 2],
         [7, 7, 6, 6, 5, 5, 4, 3, 2],
         [7, 7, 6, 6, 5, 5, 4, 4, 3],
         // 26 - 30
         [7, 7, 7, 6, 6, 5, 5, 4, 3],
         [7, 7, 7, 6, 6, 5, 5, 5, 4],
         [8, 8, 7, 6, 6, 6, 6, 5, 4],
         [8, 8, 7, 7, 7, 6, 6, 5, 5],
         [8, 8, 8, 7, 7, 7, 6, 6, 5],
         // 31 - 36
         [8, 8, 8, 7, 7, 7, 7, 6, 6],
         [9, 8, 8, 8, 8, 7, 7, 7, 6],
         [9, 9, 9, 8, 8, 8, 7, 7, 7],
         [9, 9, 9, 9, 8, 8, 8, 8, 7],
         [9, 9, 9, 9, 9, 9, 8, 8, 8],
         [9, 9, 9, 9, 9, 9, 9, 9, 9]
      ]
   },
   thief: {
      name: "Thief", species: "Human", primeReqs: [{ ability: "dex", xpBonus5: 13, xpBonus10: 16 }], maxLevel: 36,
      levels: [
         { level: 1, xp: 0, thac0: 19, hd: "1d4", hdcon: true, title: "Apprentice" },
         { level: 2, xp: 1200, thac0: 19, hd: "2d4", hdcon: true, title: "Footpad" },
         { level: 3, xp: 2400, thac0: 19, hd: "3d4", hdcon: true, title: "Robber" },
         { level: 4, xp: 4800, thac0: 19, hd: "4d4", hdcon: true, title: "Burglar" },
         { level: 5, xp: 9600, thac0: 17, hd: "5d4", hdcon: true, title: "Cutpurse" },
         { level: 6, xp: 20000, thac0: 17, hd: "6d4", hdcon: true, title: "Sharper" },
         { level: 7, xp: 40000, thac0: 17, hd: "7d4", hdcon: true, title: "Pilferer" },
         { level: 8, xp: 80000, thac0: 17, hd: "8d4", hdcon: true, title: "Thief" },
         { level: 9, xp: 160000, thac0: 15, hd: "9d4", hdcon: true, title: "Master Thief" },
         { level: 10, xp: 280000, thac0: 15, hd: "9d4+2" },
         { level: 11, xp: 400000, thac0: 15, hd: "9d4+4" },
         { level: 12, xp: 520000, thac0: 15, hd: "9d4+6" },
         { level: 13, xp: 640000, thac0: 13, hd: "9d4+8" },
         { level: 14, xp: 760000, thac0: 13, hd: "9d4+10" },
         { level: 15, xp: 880000, thac0: 13, hd: "9d4+12" },
         { level: 16, xp: 1000000, thac0: 13, hd: "9d4+14" },
         { level: 17, xp: 1120000, thac0: 11, hd: "9d4+16" },
         { level: 18, xp: 1240000, thac0: 11, hd: "9d4+18" },
         { level: 19, xp: 1360000, thac0: 11, hd: "9d4+20" },
         { level: 20, xp: 1480000, thac0: 11, hd: "9d4+22" },
         { level: 21, xp: 1600000, thac0: 9, hd: "9d4+24" },
         { level: 22, xp: 1720000, thac0: 9, hd: "9d4+26" },
         { level: 23, xp: 1840000, thac0: 9, hd: "9d4+28" },
         { level: 24, xp: 1960000, thac0: 9, hd: "9d4+30" },
         { level: 25, xp: 2080000, thac0: 7, hd: "9d4+32" },
         { level: 26, xp: 2200000, thac0: 7, hd: "9d4+34" },
         { level: 27, xp: 2320000, thac0: 7, hd: "9d4+36" },
         { level: 28, xp: 2440000, thac0: 7, hd: "9d4+38" },
         { level: 29, xp: 2560000, thac0: 5, hd: "9d4+40" },
         { level: 30, xp: 2680000, thac0: 5, hd: "9d4+42" },
         { level: 31, xp: 2800000, thac0: 5, hd: "9d4+44" },
         { level: 32, xp: 2920000, thac0: 5, hd: "9d4+46" },
         { level: 33, xp: 3040000, thac0: 3, hd: "9d4+48" },
         { level: 34, xp: 3160000, thac0: 3, hd: "9d4+50" },
         { level: 35, xp: 3280000, thac0: 3, hd: "9d4+52" },
         { level: 36, xp: 3400000, thac0: 2, hd: "9d4+54" }
      ],
      saves: [
         { level: 4, death: 13, wand: 14, paralysis: 13, breath: 16, spell: 15 },
         { level: 8, death: 11, wand: 12, paralysis: 11, breath: 14, spell: 13 },
         { level: 12, death: 9, wand: 10, paralysis: 9, breath: 12, spell: 11 },
         { level: 16, death: 7, wand: 8, paralysis: 7, breath: 10, spell: 9 },
         { level: 20, death: 5, wand: 6, paralysis: 5, breath: 8, spell: 7 },
         { level: 24, death: 4, wand: 5, paralysis: 4, breath: 6, spell: 5 },
         { level: 28, death: 3, wand: 4, paralysis: 3, breath: 4, spell: 4 },
         { level: 32, death: 2, wand: 3, paralysis: 2, breath: 3, spell: 3 },
         { level: 99, death: 2, wand: 2, paralysis: 2, breath: 2, spell: 2 }
      ]
   },
   dwarf: {
      name: "Dwarf", species: "Dwarf", primeReqs: [{ ability: "str", xpBonus5: 13, xpBonus10: 16 }], minCon: 9, maxLevel: 12,
      levels: [
         { level: 1, xp: 0, thac0: 19, hd: "1d8", hdcon: true, title: "Veteran" },
         { level: 2, xp: 2200, thac0: 19, hd: "2d8", hdcon: true, title: "Warrior" },
         { level: 3, xp: 4400, thac0: 19, hd: "3d8", hdcon: true, title: "Swordmaster" },
         { level: 4, xp: 8800, thac0: 17, hd: "4d8", hdcon: true, title: "Hero" },
         { level: 5, xp: 17000, thac0: 17, hd: "5d8", hdcon: true, title: "Swashbuckler" },
         { level: 6, xp: 35000, thac0: 17, hd: "6d8", hdcon: true, title: "Myrmidon" },
         { level: 7, xp: 70000, thac0: 15, hd: "7d8", hdcon: true, title: "Champion" },
         { level: 8, xp: 140000, thac0: 15, hd: "8d8", hdcon: true, title: "Superhero" },
         { level: 9, xp: 270000, thac0: 15, hd: "9d8", hdcon: true, title: "Lord", femaleTitle: "Lady" },
         { level: 10, xp: 400000, thac0: 15, hd: "9d8+3" },
         { level: 11, xp: 530000, thac0: 15, hd: "9d8+6" },
         { level: 12, xp: 660000, thac0: 13, hd: "9d8+9", attackRank: "C" },
         { level: 13, xp: 800000, thac0: 12, hd: "9d8+12", attackRank: "D" },
         { level: 14, xp: 1000000, thac0: 11, hd: "9d8+15", attackRank: "E" },
         { level: 15, xp: 1200000, thac0: 10, hd: "9d8+18", attackRank: "F" },
         { level: 16, xp: 1400000, thac0: 9, hd: "9d8+21", attackRank: "G" },
         { level: 17, xp: 1600000, thac0: 8, hd: "9d8+24", attackRank: "H" },
         { level: 18, xp: 1800000, thac0: 7, hd: "9d8+27", attackRank: "I" },
         { level: 19, xp: 2000000, thac0: 6, hd: "9d8+30", attackRank: "J" },
         { level: 20, xp: 2200000, thac0: 5, hd: "9d8+33", attackRank: "K" },
         { level: 21, xp: 2400000, thac0: 4, hd: "9d8+36", attackRank: "L" },
         { level: 22, xp: 2600000, thac0: 3, hd: "9d8+39", attackRank: "M" },
      ],
      saves: [
         { level: 3, death: 8, wand: 9, paralysis: 10, breath: 13, spell: 12 },
         { level: 6, death: 6, wand: 7, paralysis: 8, breath: 10, spell: 9 },
         { level: 9, death: 4, wand: 5, paralysis: 6, breath: 7, spell: 6 },
         { level: 99, death: 2, wand: 3, paralysis: 4, breath: 4, spell: 3 },
      ],
   },
   elf: {
      name: "Elf", species: "Elf", primeReqs: [
         { ability: "str", xpBonus5: 13, xpBonus10: 13 },
         { ability: "int", xpBonus5: 13, xpBonus10: 16 }],
      minInt: 9, maxLevel: 10,
      levels: [
         { level: 1, xp: 0, thac0: 19, hd: "1d6", hdcon: true, title: "Veteran Medium" },
         { level: 2, xp: 4000, thac0: 19, hd: "2d6", hdcon: true, title: "Warrior Seer" },
         { level: 3, xp: 8000, thac0: 19, hd: "3d6", hdcon: true, title: "Swordmaster Conjurer" },
         { level: 4, xp: 16000, thac0: 17, hd: "4d6", hdcon: true, title: "Hero Magician" },
         { level: 5, xp: 32000, thac0: 17, hd: "5d6", hdcon: true, title: "Swashbuckler Enchanter", femalTitle: "Swashbuckler Enchantress" },
         { level: 6, xp: 64000, thac0: 17, hd: "6d6", hdcon: true, title: "Myrmidon Warlock" },
         { level: 7, xp: 120000, thac0: 15, hd: "7d6", hdcon: true, title: "Champion Sorcerer", femaleTitle: "Champion Sorceress" },
         { level: 8, xp: 250000, thac0: 15, hd: "8d6", hdcon: true, title: "Superhero Necromancer" },
         { level: 9, xp: 400000, thac0: 15, hd: "9d6", hdcon: true, title: "Lord Wizard", femaleTitle: "Lady Wizard" },
         { level: 10, xp: 600000, thac0: 15, hd: "9d6+1", attackRank: "C" },
         { level: 11, xp: 850000, thac0: 15, hd: "9d6+2", attackRank: "D" },
         { level: 12, xp: 1100000, thac0: 13, hd: "9d6+3", attackRank: "E" },
         { level: 13, xp: 1350000, thac0: 12, hd: "9d6+4", attackRank: "F" },
         { level: 14, xp: 1600000, thac0: 11, hd: "9d6+5", attackRank: "G" },
         { level: 15, xp: 1850000, thac0: 10, hd: "9d6+6", attackRank: "H" },
         { level: 16, xp: 2100000, thac0: 9, hd: "9d6+7", attackRank: "I" },
         { level: 17, xp: 2350000, thac0: 8, hd: "9d6+8", attackRank: "J" },
         { level: 18, xp: 2600000, thac0: 7, hd: "9d6+9", attackRank: "K" },
         { level: 19, xp: 2850000, thac0: 6, hd: "9d6+10", attackRank: "L" },
         { level: 20, xp: 3100000, thac0: 5, hd: "9d6+11", attackRank: "M" }
      ],
      saves: [
         { level: 3, death: 12, wand: 13, paralysis: 13, breath: 15, spell: 15 },
         { level: 6, death: 8, wand: 10, paralysis: 10, breath: 11, spell: 11 },
         { level: 9, death: 4, wand: 7, paralysis: 7, breath: 7, spell: 7 },
         { level: 99, death: 2, wand: 4, paralysis: 4, breath: 3, spell: 3 }
      ],
      spells: [
         // 1 - 5
         [1, 0, 0, 0, 0], [2, 0, 0, 0, 0], [2, 1, 0, 0, 0], [2, 2, 0, 0, 0], [2, 2, 1, 0, 0],
         // 6 - 10
         [3, 2, 2, 0, 0], [3, 3, 2, 1, 0], [4, 3, 2, 2, 0], [4, 4, 3, 2, 0], [5, 4, 3, 3, 1],
      ]
   },
   halfling: {
      name: "Halfling",
      species: "Halfling",
      primeReqs: [
         { ability: "str", xpBonus5: 13, xpBonus10: 16 },
         { ability: "dex", xpBonus5: 13, xpBonus10: 16 }
      ],
      minDex: 9,
      minCon: 9,
      maxLevel: 8,
      levels: [
         { level: 1, xp: 0, thac0: 19, hd: "1d6", hdcon: true, title: "Halfling Veteran" },
         { level: 2, xp: 2000, thac0: 19, hd: "2d6", hdcon: true, title: "Halfling Warrior" },
         { level: 3, xp: 4000, thac0: 19, hd: "3d6", hdcon: true, title: "Halfling Swordmaster" },
         { level: 4, xp: 8000, thac0: 17, hd: "4d6", hdcon: true, title: "Halfling Hero" },
         { level: 5, xp: 16000, thac0: 17, hd: "5d6", hdcon: true, title: "Halfling Swashbuckler" },
         { level: 6, xp: 32000, thac0: 17, hd: "6d6", hdcon: true, title: "Halfling Myrmidon" },
         { level: 7, xp: 64000, thac0: 15, hd: "7d6", hdcon: true, title: "Halfling Champion" },
         { level: 8, xp: 120000, thac0: 15, hd: "8d6", hdcon: true, title: "Sheriff", attackRank: "A" },
         { level: 9, xp: 300000, thac0: 15, hd: "8d6", attackRank: "B" },
         { level: 10, xp: 600000, thac0: 13, hd: "8d6", attackRank: "C" },
         { level: 11, xp: 900000, thac0: 13, hd: "8d6", attackRank: "D" },
         { level: 12, xp: 1200000, thac0: 13, hd: "8d6", attackRank: "E" },
         { level: 13, xp: 1500000, thac0: 11, hd: "8d6", attackRank: "F" },
         { level: 14, xp: 1800000, thac0: 11, hd: "8d6", attackRank: "G" },
         { level: 15, xp: 2100000, thac0: 9, hd: "8d6", attackRank: "H" },
         { level: 16, xp: 2400000, thac0: 9, hd: "8d6", attackRank: "I" },
         { level: 17, xp: 2700000, thac0: 7, hd: "8d6", attackRank: "J" },
         { level: 18, xp: 3000000, thac0: 7, hd: "8d6", attackRank: "K" }
      ],
      saves: [
         { level: 3, death: 8, wand: 9, paralysis: 10, breath: 13, spell: 12 },
         { level: 6, death: 5, wand: 6, paralysis: 7, breath: 9, spell: 8 },
         { level: 99, death: 2, wand: 3, paralysis: 4, breath: 5, spell: 4 }
      ]
   },
   mystic: {
      name: "Mystic",
      species: "Human",
      primeReqs: [
         { ability: "str", xpBonus5: 13, xpBonus10: 16 },
         { ability: "dex", xpBonus5: 13 }
      ],
      minDex: 13,
      minWis: 13,
      maxLevel: 16,
      levels: [
         { level: 1, xp: 0, thac0: 19, hd: "1d6", hdcon: true, title: "Initiate" },
         { level: 2, xp: 2000, thac0: 19, hd: "2d6", hdcon: true, title: "Brother/Sister" },
         { level: 3, xp: 4000, thac0: 19, hd: "3d6", hdcon: true, title: "Disciple" },
         { level: 4, xp: 8000, thac0: 17, hd: "4d6", hdcon: true, title: "Immaculate" },
         { level: 5, xp: 16000, thac0: 17, hd: "5d6", hdcon: true, title: "Enlightened" },
         { level: 6, xp: 32000, thac0: 17, hd: "6d6", hdcon: true, title: "Master" },
         { level: 7, xp: 64000, thac0: 15, hd: "7d6", hdcon: true, title: "Exalted Master" },
         { level: 8, xp: 120000, thac0: 15, hd: "8d6", hdcon: true, title: "Illuminated Master" },
         { level: 9, xp: 240000, thac0: 13, hd: "9d6", hdcon: true, title: "Great Master" },
         { level: 10, xp: 360000, thac0: 13, hd: "9d6+2" },
         { level: 11, xp: 480000, thac0: 11, hd: "9d6+4" },
         { level: 12, xp: 600000, thac0: 11, hd: "9d6+6" },
         { level: 13, xp: 720000, thac0: 9, hd: "9d6+8" },
         { level: 14, xp: 840000, thac0: 9, hd: "9d6+10" },
         { level: 15, xp: 960000, thac0: 7, hd: "9d6+12" },
         { level: 16, xp: 1080000, thac0: 7, hd: "9d6+14" }
      ],
      saves: [
         { level: 3, death: 12, wand: 13, paralysis: 14, breath: 15, spell: 16 },
         { level: 6, death: 10, wand: 11, paralysis: 12, breath: 13, spell: 14 },
         { level: 9, death: 8, wand: 9, paralysis: 10, breath: 11, spell: 12 },
         { level: 12, death: 6, wand: 7, paralysis: 8, breath: 9, spell: 10 },
         { level: 15, death: 6, wand: 6, paralysis: 7, breath: 8, spell: 9 },
         { level: 99, death: 5, wand: 6, paralysis: 6, breath: 7, spell: 8 }
      ],
      specialAbilities: {
         acBonuses: [
            { level: 1, ac: 9, mv: "120'", attacks: 1, damage: "1d4" },
            { level: 2, ac: 8, mv: "130'", attacks: 1, damage: "1d4+1", ability: "Awareness" },
            { level: 3, ac: 7, mv: "140'", attacks: 1, damage: "1d6" },
            { level: 4, ac: 6, mv: "150'", attacks: 1, damage: "1d6+1", ability: "Heal Self" },
            { level: 5, ac: 5, mv: "160'", attacks: 2, damage: "1d8" },
            { level: 6, ac: 4, mv: "170'", attacks: 2, damage: "1d8+1", ability: "Speak with Animals" },
            { level: 7, ac: 3, mv: "180'", attacks: 2, damage: "1d10" },
            { level: 8, ac: 2, mv: "190'", attacks: 2, damage: "1d12", ability: "Resistance" },
            { level: 9, ac: 1, mv: "200'", attacks: 3, damage: "2d8" },
            { level: 10, ac: 0, mv: "210'", attacks: 3, damage: "2d10", ability: "Speak with Anyone" },
            { level: 11, ac: -1, mv: "220'", attacks: 3, damage: "2d12" },
            { level: 12, ac: -2, mv: "240'", attacks: 3, damage: "3d8+1", ability: "Mind Block" },
            { level: 13, ac: -3, mv: "260'", attacks: 4, damage: "4d6+2" },
            { level: 14, ac: -4, mv: "280'", attacks: 4, damage: "5d6", ability: "Blankout" },
            { level: 15, ac: -5, mv: "300'", attacks: 4, damage: "4d8" },
            { level: 16, ac: -6, mv: "320'", attacks: 4, damage: "3d12", ability: "Gentle Touch" }
         ],
         unarmedAttackEquivalents: [
            { level: 2, equivalent: "Silver Weapon" },
            { level: 5, equivalent: "+1 Weapon" },
            { level: 8, equivalent: "+2 Weapon" },
            { level: 11, equivalent: "+3 Weapon" },
            { level: 14, equivalent: "+4 Weapon" },
            { level: 16, equivalent: "+5 Weapon" }
         ],
         mysticAbilities: [
            { level: 2, ability: "Awareness" },
            { level: 4, ability: "Heal Self" },
            { level: 6, ability: "Speak with Animals" },
            { level: 8, ability: "Resistance" },
            { level: 10, ability: "Speak with Anyone" },
            { level: 12, ability: "Mind Block" },
            { level: 14, ability: "Blankout" },
            { level: 16, ability: "Gentle Touch" }
         ],
         thiefAbilities: ["Find Traps", "Remove Traps", "Move Silently", "Climb Walls", "Hide in Shadows"],
         acrobatics: {
            xpPenalty: "-20% XP",
            abilities: ["Jumps/Leaps", "Tumbles/Flips", "Catches", "Swings", "Balancing"],
            checkFormula: "(3 * Dex) + (2 * Level)"
         }
      },
      restrictions: {
         noArmor: true,
         noMagicDevices: true,
         cloisterOwnership: true
      }
   },
   druid: {
      name: "Druid", species: "Human", primeReqs: [{ ability: "wis", xpBonus5: 13, xpBonus10: 16 }], alignment: "Neutral", maxLevel: 36,
      levels: [
         { level: 9, xp: 200000, thac0: 12, hd: "9d8", hdcon: true, title: "Druid" },
         { level: 10, xp: 300000, thac0: 12, hd: "9d8+1" },
         { level: 11, xp: 400000, thac0: 11, hd: "9d8+2" },
         { level: 12, xp: 500000, thac0: 11, hd: "9d8+3" },
         { level: 13, xp: 600000, thac0: 11, hd: "9d8+4" },
         { level: 14, xp: 700000, thac0: 10, hd: "9d8+5" },
         { level: 15, xp: 800000, thac0: 10, hd: "9d8+6" },
         { level: 16, xp: 900000, thac0: 10, hd: "9d8+7" },
         { level: 17, xp: 1000000, thac0: 9, hd: "9d8+8" },
         { level: 18, xp: 1100000, thac0: 9, hd: "9d8+9" },
         { level: 19, xp: 1200000, thac0: 9, hd: "9d8+10" },
         { level: 20, xp: 1300000, thac0: 8, hd: "9d8+11" },
         { level: 21, xp: 1400000, thac0: 8, hd: "9d8+12" },
         { level: 22, xp: 1500000, thac0: 8, hd: "9d8+13" },
         { level: 23, xp: 1600000, thac0: 7, hd: "9d8+14" },
         { level: 24, xp: 1700000, thac0: 7, hd: "9d8+15" },
         { level: 25, xp: 1800000, thac0: 7, hd: "9d8+16" },
         { level: 26, xp: 1900000, thac0: 6, hd: "9d8+17" },
         { level: 27, xp: 2000000, thac0: 6, hd: "9d8+18" },
         { level: 28, xp: 2100000, thac0: 6, hd: "9d8+19" },
         { level: 29, xp: 2200000, thac0: 5, hd: "9d8+20" },
         { level: 30, xp: 2300000, thac0: 5, hd: "9d8+21" },
         { level: 31, xp: 2400000, thac0: 5, hd: "9d8+22" },
         { level: 32, xp: 2500000, thac0: 5, hd: "9d8+23" },
         { level: 33, xp: 2600000, thac0: 4, hd: "9d8+24" },
         { level: 34, xp: 2700000, thac0: 4, hd: "9d8+25" },
         { level: 35, xp: 2800000, thac0: 4, hd: "9d8+26" },
         { level: 36, xp: 2900000, thac0: 3, hd: "9d8+27" }
      ],
      saves: [
         { level: 12, death: 7, wand: 8, paralysis: 10, breath: 12, spell: 11 },
         { level: 16, death: 6, wand: 7, paralysis: 8, breath: 10, spell: 9 },
         { level: 20, death: 5, wand: 6, paralysis: 6, breath: 8, spell: 7 },
         { level: 24, death: 4, wand: 5, paralysis: 5, breath: 6, spell: 5 },
         { level: 28, death: 3, wand: 4, paralysis: 4, breath: 4, spell: 4 },
         { level: 32, death: 2, wand: 3, paralysis: 3, breath: 3, spell: 3 },
         { level: 99, death: 2, wand: 2, paralysis: 2, breath: 2, spell: 2 }
      ],
      spells: [
         // Spells for levels 9-12
         [3, 3, 3, 2, 0, 0, 0], [4, 4, 3, 2, 1, 0, 0], [4, 4, 3, 3, 2, 0, 0], [4, 4, 4, 3, 2, 1, 0],
         // Spells for levels 13-16
         [5, 5, 4, 3, 2, 2, 0], [5, 5, 5, 3, 3, 2, 0], [6, 5, 5, 3, 3, 3, 0], [6, 5, 5, 4, 4, 3, 0],
         // Spells for levels 17-20
         [6, 6, 5, 4, 4, 3, 1], [6, 6, 5, 4, 4, 3, 2], [7, 6, 5, 4, 4, 4, 2], [7, 6, 5, 4, 4, 4, 3],
         // Spells for levels 21-24
         [7, 6, 5, 5, 5, 4, 3], [7, 6, 5, 5, 5, 4, 4], [7, 7, 6, 6, 5, 4, 4], [8, 7, 6, 6, 5, 5, 4],
         // Spells for levels 25-28
         [8, 7, 6, 6, 5, 5, 5], [8, 7, 7, 6, 6, 5, 5], [8, 8, 7, 6, 6, 6, 5], [8, 8, 7, 7, 7, 6, 5],
         // Spells for levels 29-32
         [8, 8, 7, 7, 7, 6, 6], [8, 8, 8, 7, 7, 7, 6], [8, 8, 8, 8, 8, 7, 6], [9, 8, 8, 8, 8, 7, 7],
         // Spells for levels 33-36
         [9, 9, 8, 8, 8, 8, 7], [9, 9, 9, 8, 8, 8, 8], [9, 9, 9, 9, 9, 8, 8], [9, 9, 9, 9, 9, 9, 9]
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
   { name: "Common", script: "Common", description: "Common is the universal language spoken by most races/species." },
   { name: "Dwarvish", script: "Dwarvish", description: "Dwarvish uses a runic script typical for dwarven cultures." },
   { name: "Elvish", script: "Elvish", description: "Elvish uses a flowing, script-like writing typical of elven cultures." },
   { name: "Giant", script: "Dwarvish", description: "Giant shares the runic script with Dwarvish due to historical and cultural overlaps." },
   { name: "Gnomish", script: "Dwarvish", description: "Gnomish shares the script with Dwarvish, reflecting similar cultural roots." },
   { name: "Goblin", script: "Dwarvish", description: "Goblin uses the same script as Dwarvish, typically adapted for goblin use." },
   { name: "Halfling", script: "Common", description: "Halfling uses the Common script, reflecting their integration with human societies." },
   { name: "Orcish", script: "Dwarvish", description: "Orcish uses the Dwarvish script, often due to interactions and conflicts with dwarves." },
   { name: "Draconic", script: "Draconic", description: "Draconic uses a unique script specific to dragons and ancient reptilian species." },
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
