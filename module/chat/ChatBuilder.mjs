import { ChatBuilderSchema } from './ChatBuilderSchema.mjs';

/**
* Enumeration for chat result codes.
* @enum {Symbol}
*/
const RESULT_TYPE = {
   NONE: Symbol('result_none'),
   FAILED: Symbol('result_failed'),
   PASSED: Symbol('result_passed')
};

/**
 * Chat card builder.
 * @class
 * @abstract
 */
export class ChatBuilder {
   /**
    * Creates an instance of ChatBuilder.
    * @constructor
    * @throws {Error} - If instantiated directly.
    * @param {Object} dataset - The dataset object for the builder.
    * @param {fadeActor} dataset.caller - The actor the chat pertains to.
    * @param {fadeItem} dataset.context - The item the chat pertains to.
    * @param {Roll} dataset.roll - A dice roll the chat pertains to.
    * @param {Object} dataset.resp - Data polled from the user from an Application.
    * @param {Object[]} dataset.batch - Bulk object data for batch processing.
    * @param {Object} dataset.mdata - Details for chat card enrichment.
    * @param {Object} dataset.options - Options passed directly to ChatMessage.create().
    * @prop {string} template - Path to hbs template. Must be defined by subclasses.
    */
   constructor(dataset, options) {
      if (new.target === ChatBuilder) {
         throw new Error('ChatBuilder cannot be instantiated directly.');
      }

      if (!new.target.template) {
         throw new Error('Subclasses must define a static template property.');
      }

      this.RESULT_TYPE = RESULT_TYPE;
      this.data = new ChatBuilderSchema({ ...dataset, options });
      this.template = new.target.template;
   }

   /**
    * Updates this.data with new information after builder instantiation.
    * @param {string} key - this.data key to update.
    * @param {Object} value - An object containing data to merge into this.data[key].
    */
   update(key, value) {
      this.data[key] ??= {};
      foundry.utils.mergeObject(this.data[key], value);
   }

	/**
	 * Mapping of result types to their corresponding HTML representations.
	 * @type {Object.<Symbol, string|undefined>}
	 * @private
	 */
	static resultCache;

	/**
	 * Initializes resultCache with the mapping of result types to their corresponding HTML.
	 * Called only once when the cache isn't created yet.
	 * @return {Object.<Symbol, string|undefined} - The initialized result mapping object.
	 * @private
	 * @static
	 */
	static initializeResultCache() {
		this.resultCache = {
			[RESULT_TYPE.NONE]: undefined,
			[RESULT_TYPE.FAILED]: `<b>${game.i18n.localize('FADE.Chat.fail')}</b>`,
			[RESULT_TYPE.PASSED]: `<b>${game.i18n.localize('FADE.Chat.pass')}</b>`,
		};
		return this.resultCache;
	}

   /**
    * Returns HTML for a given RESULT_TYPE.
    * @param {Symbol} rv - Result symbol of type RESULT_TYPE.
    * @returns {string} HTML string for result type.
    */
   getBoolResult(rv) {
      //if (!rv || rv === RESULT_TYPE.NONE) return false;
      ChatBuilder.resultCache ||= ChatBuilder.initializeResultCache();
      return ChatBuilder.resultCache[rv] || `Unknown result type: <b>${rv}</b>`;
   }

   /**
    * Determines success or fail and returns result as html.
    * @param {any} rollTotal
    * @param {any} target
    * @param {any} operator
    * @returns
    */
   getBoolRollResultType(rollTotal, target, operator) {
      let success = false;

      switch (operator) {
         case 'lt':
            success = rollTotal < target;
            break;
         case 'lte':
            success = rollTotal <= target;
            break;
         case 'gt':
            success = rollTotal > target;
            break;
         case 'gte':
            success = rollTotal >= target;
            break;
         default:
            success = false; // If no valid roll type is provided, default to failure
            break;
      }

      return success ? this.RESULT_TYPE.PASSED : this.RESULT_TYPE.FAILED;
   }

   /**
    * Returns a chatMessageData object for creating a chat message.
    * @param {Object} obj - An object containing data for the ChatMessage.
    * @param {string[]} obj.rolls - An array of roll.render(). Supercedes data.roll if present.
    * @param {string} obj.flavor - Chat flavor text. Supercedes this.data.caller.name if present.
    */
   getChatMessageData(obj) {
      const chatMessageData = {
         ...obj,
         user: game.user.id,
         type: obj.type ?? CONST.CHAT_MESSAGE_STYLES.OTHER,
      };

      // Adds chat flavor property if specified, otherwise the caller's name.
      const hasFlavor = Object.prototype.hasOwnProperty.call(chatMessageData, 'flavor');
      if (hasFlavor === false) {
         chatMessageData.flavor = this.data.caller?.name;
      }

      const { roll } = this.data;
      // If there was a roll involved in the chat message...
      if (obj.rolls ?? roll) {
         const rollData = {}; // Empty for now. 

         if (!obj.rolls) rollData.rolls = Array.isArray(roll) ? roll : [roll];
         Object.assign(chatMessageData, rollData);

         // Decide roll mode (public, gm only,...)
         const rollMode = obj.rollMode ?? obj.resp?.rollMode ?? game.settings.get('core', 'rollMode');
         ChatMessage.applyRollMode(chatMessageData, rollMode);
      }

      return chatMessageData;
   }

   /**
    * Abstract method to generate chat message.
    * @abstract
    * @throws {Error} if unimplemented.
    */
   async createChatMessage() {
      const className = this.constructor.name;
      throw new Error(`${className}.createChatMessage() is unimplemented.`);
   }

   /**
    * Generates a message to send to chat.
    * Contents of this.data.options overrides chatMessageData, if present.
    * @async
    * @param {Object} chatMessageData - object to pass to ChatMessage.create()
    */
   async render(chatMessageData) {
      const obj = { ...chatMessageData, ...this.data.options };
      await ChatMessage.create(obj);
   }

   /**
    * @static
    * @return {string[]} List of GM ids on the game.
    */
   static get getGMs() {
      return game.users.filter((u) => u.isGM).map((u) => u.id);
   }

   /**
    * Extracts the sum of the dice rolled from a Roll object,
    * ignoring any constants or other terms.
    * @param {Roll} roll - The Roll object containing the dice and other terms.
    * @returns {number} The sum of the dice rolled.
    */
   static getDiceSum(roll) {
      let sum = 0;
      for (let i = 0; i < roll.terms.length; i++) {
         for (let j = 0; j < roll.terms[i]?.results?.length; j++) {
            sum += roll.terms[i].results[j].result;
         }
      }
      return sum;
   }
}