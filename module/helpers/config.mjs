export const FADE = {};
/**
 * The set of Ability Scores used within the system.
 * @type {Object}
 */
FADE.Armor = {
   acNaked:  9
}
FADE.Encumbrance = {
   max: 2400,
   table: [
      { max: 400, mv: 120, label: "Unencumbered", desc: "Free to move without any hindrance."},
      { max: 800, mv: 90, label: "Lightly Encumbered", desc: "Slightly burdened, movement is still easy." },
      { max: 1200, mv: 60, label: "Moderately Encumbered", desc: "Noticeable weight, movement is somewhat restricted." },
      { max: 1600, mv: 30, label: "Encumbered", desc: "Significantly burdened, movement is sluggish." },
      { max: 2400, mv: 15, label: "Heavily Encumbered", desc: "Struggling under weight, movement is laborious." },
      { max: 9999999, mv: 0, label: "Over Encumbered", desc: "Severely overloaded, movement is impossible." },
   ]
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