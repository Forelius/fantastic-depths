import { fadeFinder } from "../utils/finder.js";

/**
* Enumeration for chat result codes.
* @enum {Symbol}
*/
const RESULT_TYPE = {
   NONE: Symbol("result_none"),
   FAILED: Symbol("result_failed"),
   PASSED: Symbol("result_passed")
};

// ------------------------------------------------------------
// 1??  Define the shape of the static side
// ------------------------------------------------------------
interface ChatBuilderStatic {
   /** The template that the subclass supplies */
   template: string;          // change the type if you use a function, etc.
}

/**
 * Chat card builder.
 * @class
 * @abstract
 */
export abstract class ChatBuilder {
   /** Instance members */
   protected readonly RESULT_TYPE = RESULT_TYPE;
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   protected readonly data: Record<string, any>;
   protected readonly template: string;

   /**
    * Creates an instance of ChatBuilder.
    * @constructor
    * @throws {Error} - If instantiated directly.
    * @param {Object} dataset - The dataset object for the builder.
    * @param {FDActorBase} dataset.caller - The actor the chat pertains to.
    * @param {FDItem} dataset.context - The item the chat pertains to.
    * @param {Roll} dataset.roll - A dice roll the chat pertains to.
    * @param {Object} dataset.resp - Data polled from the user from an Application.
    * @param {Object[]} dataset.batch - Bulk object data for batch processing.
    * @param {Object} dataset.mdata - Details for chat card enrichment.
    * @param {Object} dataset.options - Options passed directly to ChatMessage.create().
    * @param {Object} dataset.digest - A roll digest consisting of an array of strings.
    * @prop {string} template - Path to hbs template. Must be defined by subclasses.
    */
   constructor(...args) {
      const [dataset, options] = args;
      // `new.target` is the concrete subclass constructor at runtime.
      const ctor = new.target as typeof ChatBuilder & ChatBuilderStatic;

      // Now we can safely read the static `template` property.
      this.template = ctor.template;
      this.data = { ...dataset, options };
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
         [RESULT_TYPE.FAILED]: `<div class="roll-fail">${game.i18n.localize("FADE.Chat.fail")}</div>`,
         [RESULT_TYPE.PASSED]: `<div class="roll-success">${game.i18n.localize("FADE.Chat.pass")}</div>`,
      };
      return this.resultCache;
   }

   /**
    * Returns HTML for a given RESULT_TYPE.
    * @param {Symbol} rv - Result symbol of type RESULT_TYPE.
    * @returns {string} HTML string for result type.
    */
   getBoolResultHTML(rv) {
      //if (!rv || rv === RESULT_TYPE.NONE) return false;
      ChatBuilder.resultCache ||= ChatBuilder.initializeResultCache();
      return ChatBuilder.resultCache[rv] || `Unknown result type: <b>${rv}</b>`;
   }

   /**
    * Determines success or fail and returns result as html.
    * @returns
    */
   getBoolRollResultType(options) {
      const { roll, target, operator, autofail, autosuccess } = options;
      const rollTotal = roll.total;
      const naturalTotal = ChatBuilder.getDiceSum(roll);
      let result = false;

      switch (operator) {
         case "lt":
         case "<":
            result = (rollTotal < target || ((autosuccess !== null || autosuccess !== undefined) && naturalTotal === parseInt(autosuccess)))
               && ((autofail === null || autofail === undefined) || naturalTotal !== parseInt(autofail));
            break;
         case "lte":
         case "<=":
            result = (rollTotal <= target || ((autosuccess !== null || autosuccess !== undefined) && naturalTotal === parseInt(autosuccess)))
               && ((autofail === null || autofail === undefined) || naturalTotal !== parseInt(autofail));
            break;
         case "gt":
         case ">":
            result = (rollTotal > target || ((autosuccess !== null || autosuccess !== undefined) && naturalTotal === parseInt(autosuccess)))
               && ((autofail === null || autofail === undefined) || naturalTotal !== parseInt(autofail));
            break;
         case "gte":
         case ">=":
            result = (rollTotal >= target || ((autosuccess !== null || autosuccess !== undefined) && naturalTotal === parseInt(autosuccess)))
               && ((autofail === null || autofail === undefined) || naturalTotal !== parseInt(autofail));
            break;
         default:
            result = false; // If no valid roll type is provided, default to failure
            break;
      }

      return result ? this.RESULT_TYPE.PASSED : this.RESULT_TYPE.FAILED;
   }

   /**
    * Returns a chatMessageData object for creating a chat message.
    * @param {any} obj - An object containing data for the ChatMessage.
    * obj.rolls - An array of roll.render(). Supercedes data.roll if present.
    * obj.flavor - Chat flavor text. Supercedes this.data.caller.name if present.
    */
   getChatMessageData(obj) {
      const chatMessageData = {
         ...obj,
         author: game.user.id,
         type: obj.type ?? (CONST.CHAT_MESSAGE_STYLES?.OTHER ?? CONST.CHAT_MESSAGE_TYPES.OTHER),
      };

      // Manipulated the dom to place digest info in roll's tooltip
      chatMessageData.content = this.moveDigest(chatMessageData.content);

      const { roll } = this.data;
      // If there was a roll involved in the chat message...
      if (obj.rolls ?? roll) {
         const rollsData = { rolls: null }; // Empty for now. 
         if (!obj.rolls) rollsData.rolls = Array.isArray(roll) ? roll : [roll];
         Object.assign(chatMessageData, rollsData);

         // Decide roll mode (public, gm only,...)
         const rollMode = obj.rollMode ?? obj.resp?.rollMode ?? game.settings.get("core", "rollMode");
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

   static getModifierSum(roll) {
      let sum = 0;
      for (let i = 0; i < roll.terms.length; i++) {
         if (roll.terms[i].faces === undefined && roll.terms[i].number !== undefined) {
            sum += roll.terms[i].number;
         }
      }
      return sum;
   }

   /**
    * Move digest info to roll collapsible dice-tooltip area
    * @param {any} content
    * @returns
    */
   moveDigest(content) {
      // Create a temporary DOM element to manipulate the HTML content
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = content;
      tempDiv.classList = "digest";
      // Find the 'digest' div and 'dice-tooltip' div
      const digestDiv = tempDiv.querySelector(`div[name="digest"]`);
      const tooltipDiv = tempDiv.querySelector(".tooltip-part");
      // Move the 'digest' div inside the 'dice-tooltip' div
      if (digestDiv && tooltipDiv) {
         tooltipDiv.insertAdjacentElement("afterend", digestDiv);
      }
      // Convert the updated DOM back to a string and assign it to 'content'
      content = tempDiv.innerHTML;
      return content;
   }

   _getDamageHealRolls(dmgHealRoll) {
      let damageRoll;
      let healRoll;
      if (dmgHealRoll?.damageFormula?.length > 0) {
         damageRoll = dmgHealRoll.damageType === "heal" ? undefined : dmgHealRoll;
         healRoll = dmgHealRoll.damageType === "heal" ? dmgHealRoll : undefined;
      }
      return { damageRoll, healRoll };
   }

   async _getActionsForChat(actionItem, owner, options = { saves: null, attacks: null, abilities: null }) {
      const isIdentified = actionItem?.system.isIdentified ?? false;
      // Merge default options with provided options
      options = { ...{ attacks: true, abilities: true, saves: true }, ...options };
      const actions = [];
      if (actionItem) {
         const itemActions = actionItem.getActionsForChat(owner, options);
         if (itemActions?.length > 0) {
            actions.push(...itemActions);
         }

         if (options.saves === true && actionItem.system.savingThrow?.length > 0) {
            const save = await fadeFinder.getSavingThrow(actionItem.system.savingThrow);
            actions.push({
               type: "save",
               owneruuid: owner.uuid,
               itemuuid: save.uuid,
               actionuuid: actionItem.uuid, // this is the owning item's uuid
               shortName: save?.system.shortName,
               customSaveCode: save?.system.customSaveCode,
            });
         }
         if (options.attacks === true) {
            if (actionItem.canAttack === true) {
               actions.push({
                  type: "melee",
                  owneruuid: owner.uuid,
                  itemuuid: actionItem.uuid,
                  actionuuid: actionItem.uuid, // this is the owning item's uuid
                  itemName: game.i18n.localize("FADE.Chat.actions.attack"),
               })
            }
            if (actionItem.canMelee === true) {
               actions.push({
                  type: "melee",
                  owneruuid: owner.uuid,
                  itemuuid: actionItem.uuid,
                  actionuuid: actionItem.uuid, // this is the owning item's uuid
                  itemName: game.i18n.localize("FADE.Chat.actions.melee"),
               })
            }
            if (actionItem.canShoot === true) {
               actions.push({
                  type: "shoot",
                  owneruuid: owner.uuid,
                  itemuuid: actionItem.uuid,
                  actionuuid: actionItem.uuid, // this is the owning item's uuid
                  itemName: game.i18n.localize("FADE.Chat.actions.shoot"),
               })
            }
            if (actionItem.canThrow === true) {
               actions.push({
                  type: "throw",
                  owneruuid: owner.uuid,
                  itemuuid: actionItem.uuid,
                  actionuuid: actionItem.uuid, // this is the owning item's uuid
                  itemName: game.i18n.localize("FADE.Chat.actions.throw"),
               })
            }
         }
         // Special abilities and spells
         if (options.abilities === true) {
            for (const ability of [...actionItem.system.specialAbilities || []]) {
               let sourceItem = await fromUuid(ability.uuid);
               if (sourceItem && (isIdentified || ability.action === "consume")) {
                  sourceItem = foundry.utils.deepClone(sourceItem);
                  actions.push({
                     type: sourceItem.system.category,
                     owneruuid: owner.uuid,
                     itemuuid: ability.uuid,
                     actionuuid: actionItem.uuid, // this is the owning item's uuid
                     itemName: isIdentified === false ? "???" : ability.name,
                     // This is the modifier entered for this special ability entry.
                     // Remember: This is a contained special ability, not the special ability item itself.
                     mod: ability.mod,
                     action: ability.action
                  });
               }
            }
            for (const spell of [...actionItem.system.spells || []]) {
               let sourceItem = await fromUuid(spell.uuid);
               if (sourceItem && (isIdentified || spell.action === "consume")) {
                  sourceItem = foundry.utils.deepClone(sourceItem);
                  actions.push({
                     type: "spell",
                     owneruuid: owner.uuid,
                     itemuuid: spell.uuid,
                     actionuuid: actionItem.uuid, // this is the owning item's uuid
                     itemName: isIdentified === false ? "???" : spell.name,
                     castAs: spell.castAs,
                     action: spell.action
                  });
               }
            }
         }
      }
      return actions;
   }

   async _getConditionsForChat(item, hideDuration = false) {
      const conditions = foundry.utils.deepClone(item.system.conditions);
      const durationMsgs = [];
      for (const condition of conditions) {
         const durationResult = await this._getConditionDurationResult(condition, item);
         condition.duration = durationResult?.durationSec ?? condition.duration;
         if (hideDuration === true) {
            condition.durationText = durationResult.text;
         } else {
            durationMsgs.push(durationResult.text);
         }
      }
      return { conditions, durationMsgs };
   }

   async _getConditionDurationResult(condition, item) {
      const result = {
         text: (condition.durationFormula !== "" && condition.durationFormula !== null) ?
            `${condition.name} ${game.i18n.localize("FADE.Spell.duration")}: ${condition.durationFormula} ${game.i18n.localize("FADE.rounds")}`
            : "",
         durationSec: null
      };
      if (condition.durationFormula !== "" && condition.durationFormula !== null) {
         const rollData = condition.getRollData ? condition.getRollData() : item.getRollData();
         const rollEval = await new Roll(condition.durationFormula, rollData).evaluate();
         result.text = `${result.text} (${rollEval.total} ${game.i18n.localize("FADE.rounds")})`;
         const roundSeconds = game.settings.get(game.system.id, "roundDurationSec") ?? 10;
         result.durationSec = rollEval.total * roundSeconds;
      }
      return result;
   }
}