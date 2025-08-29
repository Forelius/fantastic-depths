import { ChatFactory, CHAT_TYPE } from "/systems/fantastic-depths/module/chat/ChatFactory.mjs";
import { ChatBuilder } from "/systems/fantastic-depths/module/chat/ChatBuilder.mjs";
import { DialogFactory } from "/systems/fantastic-depths/module/dialog/DialogFactory.mjs";
/** Ability checks are often implemented differently for different systems. */
export class AbilityCheck {
   get dialogTemplate() { return "systems/fantastic-depths/templates/dialog/tiered-difficulty.hbs"; }
   get chatTemplate() { return "systems/fantastic-depths/templates/chat/ability-check.hbs"; }

   async execute(data) {
      const { actor, event } = data;
      const ctrlKey = event.ctrlKey;
      const dataset = event.target.dataset;
      let dialogResp = null;
      let chatType = CHAT_TYPE.ABILITY_CHECK;
      dataset.formula = game.settings.get(game.system.id, "abilityCheckFormula");
      dataset.dialog = dataset.test;

      if (ctrlKey === false) {
         dialogResp = await DialogFactory(dataset, actor);
         if (dialogResp) {
            dialogResp.formula = dialogResp.formula?.length > 0 ? dialogResp.formula : dataset.formula;
            let mod = Number(dialogResp.mod) != 0 ? "+@mod" : "";
            let difficultyMod = dialogResp.difficulty?.length > 0 && CONFIG.FADE.DifficultyLevel[dialogResp.difficulty] != 0
               ? `+${CONFIG.FADE.DifficultyLevel[dialogResp.difficulty]}` : "";
            dataset.formula = `${dialogResp.formula}${mod}${difficultyMod}`;
         } else {
            // This will stop the process below.
            chatType = null;
         }
      } else {
         dialogResp = {
            formula: dataset.formula,
            difficulty: "medium"
         };
      }

      if (chatType !== null) {
         const rollContext = { ...actor.getRollData(), ...dialogResp || {} };
         const rolled = await new Roll(dataset.formula, rollContext).evaluate();
         const chatData = { caller: actor, context: dialogResp, mdata: dataset, roll: rolled };
         const showResult = actor._getShowResult(event);
         const builder = new ChatFactory(chatType, chatData, { showResult });
         builder.createChatMessage();
      }
   }

   getResultString(builder, options) {
      // Determine if the roll is successful based on the roll type and target number      
      const testResult = builder.getBoolRollResultType(options);
      return builder.getBoolResultHTML(testResult);
   }
}

export class TieredAbilityCheck extends AbilityCheck {
   /**
    * Returns the tier name for a given diff.
    * @param {number} diff - The difference value to evaluate.
    * @param {boolean} invert - If true, inverts the evaluation logic (success is higher diff).
    * @returns {string|null} The tier name, or null if no match.
    */
   getTieredResultName(diff, invert = false) {
      const entries = Object.entries(CONFIG.FADE.TieredResults);
      const sorted = entries.sort((a, b) => invert ? a[1] - b[1] : b[1] - a[1]);
      let result = null;
      for (const [name, threshold] of sorted) {
         if (invert ? diff <= threshold : diff >= threshold) {
            result = name;
            break;
         }
      }
      if (result === null) {
         // If nothing matched, fallback to tier with lowest threshold (last item)
         result = sorted[sorted.length - 1][0];
      }
      return result;
   }

   getResultString(builder, options) {
      const { roll, target, operator, autosuccess, autofail } = options;
      const naturalTotal = ChatBuilder.getDiceSum(roll);
      const diff = roll.total - target;
      let result = "?";

      if (autosuccess !== null && autosuccess !== undefined && naturalTotal == autosuccess) {
         result = game.i18n.localize(FADE.Chat.abilityCheck.tieredResults.criticalSuccess);
      } else if (autofail !== null && autofail !== undefined && naturalTotal == autofail) {
         result = game.i18n.localize(FADE.Chat.abilityCheck.tieredResults.criticalFail);
      } else {
         let tierName;
         switch (operator) {
            case 'lt':
            case "<":
            case 'lte':
            case "<=":
               tierName = this.getTieredResultName(diff);
               break;
            case 'gt':
            case ">":
            case 'gte':
            case ">=":
               tierName = this.getTieredResultName(diff, true);
               break;
            default:
               tierName = null;
               break;
         }

         if (tierName) {
            const key = `FADE.Chat.abilityCheck.tieredResults.${tierName}`;
            result = `${game.i18n.localize(key)}<div>Difference: ${diff}</div>`;
         } else {
            result = "?"; // or fallback string if preferred
         }
      }

      return result;
   }
}