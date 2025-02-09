import { fadeItem } from './fadeItem.mjs';
import { DialogFactory } from '../dialog/DialogFactory.mjs';
import { ChatFactory, CHAT_TYPE } from '../chat/ChatFactory.mjs';

export class SpecialAbilityItem extends fadeItem {
   constructor(data, context) {
      /** Default behavior, just call super() and do all the default Item inits */
      super(data, context);
   }

   async getDamageRoll(resp) {
      const isHeal = this.system.healFormula?.length > 0;
      let evaluatedRoll = await this.getEvaluatedRoll(isHeal ? this.system.healFormula : this.system.dmgFormula);
      let formula = evaluatedRoll?.formula;
      let digest = [];
      let modifier = 0;
      let hasDamage = true;

      if (resp?.mod && resp?.mod !== 0) {
         formula = formula ? `${formula}+${resp.mod}` : `${resp.mod}`;
         modifier += resp.mod;
         digest.push(game.i18n.format('FADE.Chat.rollMods.manual', { mod: resp.mod }));
      }

      if (modifier <= 0 && (evaluatedRoll == null || evaluatedRoll?.total <= 0)) {
         hasDamage = false;
      }

      return {
         formula,
         type: isHeal ? "heal" : this.system.damageType,
         digest,
         hasDamage
      };
   }

   /**
   * Handle clickable rolls.
   * @param {Event} event The originating click event
   * @private
   */
   async roll(dataset) {
      let result = null;
      const systemData = this.system;
      const ownerTokenOrActor = this.actor || canvas.tokens.controlled?.[0];
      let canProceed = true;
      const hasRoll = systemData.rollFormula != null && systemData.rollFormula != "" && systemData.target != null && systemData.target != "";
      const rollData = this.getRollData();

      let rolled = null;
      let dialogResp = null
      if (hasRoll === true) {
         try {
            // Retrieve roll data.
            dataset.dialog = "generic";
            dataset.rollmode = systemData.rollMode;
            dialogResp = await DialogFactory(dataset, this.actor);
            if (dialogResp?.resp?.rolling === true) {
               if (systemData.operator == "lt" || systemData.operator == "lte" || systemData.operator == "<" || systemData.operator == "<=") {
                  dialogResp.resp.mod -= systemData.abilityMod?.length > 0 ? this.actor.system.abilities[systemData.abilityMod].mod : 0;
               } else if (systemData.operator == "gt" || systemData.operator == "gte" || systemData.operator == ">" || systemData.operator == ">=") {
                  dialogResp.resp.mod += systemData.abilityMod?.length > 0 ? this.actor.system.abilities[systemData.abilityMod].mod : 0;
               }
               rollData.formula = dialogResp.resp.mod != 0 ? `${systemData.rollFormula}+@mod` : `${systemData.rollFormula}`;
               const rollContext = { ...rollData, ...dialogResp?.resp || {} };
               rolled = await new Roll(rollData.formula, rollContext).evaluate();
            } else {
               canProceed = false;
            }
         } catch (error) {
            // Close button pressed or other error
            canProceed = false;
         }
      }

      if (canProceed === true) {
         const chatData = {
            rollData,
            caller: this,
            resp: dialogResp?.resp,
            context: ownerTokenOrActor,
            roll: rolled,
         };
         const builder = new ChatFactory(CHAT_TYPE.SPECIAL_ABILITY, chatData);
         result = builder.createChatMessage();
      }

      return result;
   }
}