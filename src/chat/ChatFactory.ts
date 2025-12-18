import { ChatBuilder } from './ChatBuilder.js';
import { AbilityCheckChatBuilder } from './AbilityCheckChatBuilder.js';
import { GenericRollChatBuilder } from './GenericRollChatBuilder.js';
import { AttackRollChatBuilder } from './AttackRollChatBuilder.js';
import { SkillRollChatBuilder } from './SkillRollChatBuilder.js';
import { DamageRollChatBuilder } from './DamageRollChatBuilder.js';
import { SpellCastChatBuilder } from './SpellCastChatBuilder.js';
import { SpecialAbilityChat } from './SpecialAbilityChat.js';
import { ItemRollChat } from './ItemRollChat.js';

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
type ChatTypeEnum = typeof CHAT_TYPE[keyof typeof CHAT_TYPE];

/**
 * Handler for creating instances of chat builders based on the specified type.
 * @param {Object} _ - The target object being constructed (ChatBuilder). Ignored.
 * @param {CHAT_TYPE} args.0 - The CHAT_TYPE enum value representing the type of builder to create.
 * @param {...*} args.1 - Additional arguments passed to the constructor of the chat builder.
 * @returns {ChatBuilder} An instance of a chat builder based on the provided type.
 */
const handler: ProxyHandler<any> = {
   construct(_target, args: [ChatTypeEnum, ...any[]]): any {
      const [type, ...bArgs] = args;
      //const bArgs = [...argsArray];

      let result: any = null;
      if (type === CHAT_TYPE.ABILITY_CHECK) {
         result = new AbilityCheckChatBuilder(...bArgs);
      } else if (type === CHAT_TYPE.ATTACK_ROLL) {
         result = new AttackRollChatBuilder(...bArgs);
      } else if (type === CHAT_TYPE.SKILL_ROLL) {
         result = new SkillRollChatBuilder(...bArgs);
      } else if (type === CHAT_TYPE.DAMAGE_ROLL) {
         result = new DamageRollChatBuilder(...bArgs);
      } else if (type === CHAT_TYPE.SPELL_CAST) {
         result = new SpellCastChatBuilder(...bArgs);
      } else if (type === CHAT_TYPE.SPECIAL_ABILITY) {
         result = new SpecialAbilityChat(...bArgs);
      } else if (type === CHAT_TYPE.ITEM_ROLL) {
         result = new ItemRollChat(...bArgs);
      } else {
         result = new GenericRollChatBuilder(...bArgs);
      }

      return result;
   },
};

export const ChatFactory = new Proxy(ChatBuilder, handler);

