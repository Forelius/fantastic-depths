import { ChatBuilder } from './ChatBuilder.mjs';
import { AbilityCheckChatBuilder } from './AbilityCheckChatBuilder.mjs';
import { GenericRollChatBuilder } from './GenericRollChatBuilder.mjs';
import { AttackRollChatBuilder } from './AttackRollChatBuilder.mjs';
/**
 * Enumeration for chat factory types.
 * @enum {Symbol}
 */
export const CHAT_TYPE = Object.freeze({
   GENERIC_ROLL: Symbol('cftype_generic'),
   ABILITY_CHECK: Symbol('cftype_abil_check'),
   ATTACK_ROLL: Symbol('cftype_attack'),
});

/**
 * Handler for creating instances of chat builders based on the specified type.
 * @param {Object} _ - The target object being constructed (ChatBuilder). Ignored.
 * @param {CHAT_TYPE} args.0 - The CHAT_TYPE enum value representing the type of builder to create.
 * @param {...*} args.1 - Additional arguments passed to the constructor of the chat builder.
 * @returns {ChatBuilder} An instance of a chat builder based on the provided type.
 */
const handler = {
   construct(_, args) {
      const [type, ...bArgs] = args;
      let result = null;
      if (type === CHAT_TYPE.ABILITY_CHECK) {
         result = new AbilityCheckChatBuilder(...bArgs);
      } else if (type === CHAT_TYPE.GENERIC_ROLL) {
         result = new GenericRollChatBuilder(...bArgs);
      } else if (type === CHAT_TYPE.ATTACK_ROLL) {
         result = new AttackRollChatBuilder(...bArgs);
      } else {
         throw new Error(`Unknown type: ${type}.`);
      }

      return result;
   },
};

export const ChatFactory = new Proxy(ChatBuilder, handler);