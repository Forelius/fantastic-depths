import { ChatBuilder } from './ChatBuilder.js';
import { AbilityCheckChatBuilder } from './AbilityCheckChatBuilder.js';
import { GenericRollChatBuilder } from './GenericRollChatBuilder.js';
import { AttackRollChatBuilder } from './AttackRollChatBuilder.js';
import { SkillRollChatBuilder } from './SkillRollChatBuilder.js';
import { DamageRollChatBuilder } from './DamageRollChatBuilder.js';
import { SpellCastChatBuilder } from './SpellCastChatBuilder.js';
import { SpecialAbilityChat } from './SpecialAbilityChat.js';
import { ItemRollChat } from './ItemRollChat.js';
import { CHAT_TYPE, ChatTypeEnum } from "./ChatTypeEnum.js"

/**
 * Handler for creating instances of chat builders based on the specified type.
 * @param {Object} _ - The target object being constructed (ChatBuilder). Ignored.
 * @param {CHAT_TYPE} args.0 - The CHAT_TYPE enum value representing the type of builder to create.
 * @param {...*} args.1 - Additional arguments passed to the constructor of the chat builder.
 * @returns {ChatBuilder} An instance of a chat builder based on the provided type.
 */
const handler = {
   construct(_target, args: [ChatTypeEnum, ...[]]): ChatBuilder {
      const [type, ...bArgs] = args;

      let result = null;
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