/**
 * Enumeration for chat factory types.
 * @enum {Symbol}
 */
export const CHAT_TYPE = {
   GENERIC_ROLL: Symbol('cftype_generic'),
   ABILITY_CHECK: Symbol('cftype_abil_check'),
   ATTACK_ROLL: Symbol('cftype_attack'),
   SKILL_ROLL: Symbol('cftype_skill'),
   DAMAGE_ROLL: Symbol('cftype_damage'),
   SPELL_CAST: Symbol('cftype_spell_cast'),
   SPECIAL_ABILITY: Symbol('cftype_special_ability'),
   ITEM_ROLL: Symbol('cftype_item'),
} as const;

export type ChatTypeEnum = typeof CHAT_TYPE[keyof typeof CHAT_TYPE];