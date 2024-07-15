export const FADE = {};
/**
 * The set of Ability Scores used within the system.
 * @type {Object}
 */
FADE.adjustmentDesc = {
  str: 'FADE.Ability.Str.mod',
  dex: 'FADE.Ability.Dex.mod',
  con: 'FADE.Ability.Con.mod',
  int: 'FADE.Ability.Int.mod',
  wis: 'FADE.Ability.Wis.mod',
  cha: 'FADE.Ability.Cha.mod',
};
FADE.abilities = {
  str: 'FADE.Ability.Str.long',
  dex: 'FADE.Ability.Dex.long',
  con: 'FADE.Ability.Con.long',
  int: 'FADE.Ability.Int.long',
  wis: 'FADE.Ability.Wis.long',
  cha: 'FADE.Ability.Cha.long',
};
FADE.abilityAbbreviations = {
  str: 'FADE.Ability.Str.abbr',
  dex: 'FADE.Ability.Dex.abbr',
  con: 'FADE.Ability.Con.abbr',
  int: 'FADE.Ability.Int.abbr',
  wis: 'FADE.Ability.Wis.abbr',
  cha: 'FADE.Ability.Cha.abbr',
};
FADE.AdjustmentTable = [
  { max: 3, value: -3 },
  { max: 5, value: -2 },
  { max: 8, value: -1 },
  { max: 12, value: 0 },
  { max: 15, value: 1 },
  { max: 17, value: 2 },
  { max: 18, value: 3 },
];