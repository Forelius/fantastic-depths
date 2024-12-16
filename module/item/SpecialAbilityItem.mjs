import { fadeItem } from './fadeItem.mjs';
import { DialogFactory } from '../dialog/DialogFactory.mjs';
import { ChatFactory, CHAT_TYPE } from '../chat/ChatFactory.mjs';

export class SpecialAbilityItem extends fadeItem {
   constructor(data, context) {
      /** Default behavior, just call super() and do all the default Item inits */
      super(data, context);
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
      const systemData = this.system;
      systemData.rollMode = systemData.rollMode !== undefined ? systemData.rollMode : "publicroll";
      systemData.dmgFormula = systemData.dmgFormula || null;
      systemData.healFormula = systemData.healFormula || null;
      systemData.savingThrow = systemData.savingThrow || "";
      systemData.damageType = systemData.damageType || "";
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
         damageType: isHeal ? "heal" : "physical",
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
      const ownerTokenOrActor = canvas.tokens.controlled?.[0] || this.actor;
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
            rollData.formula = dialogResp.resp.mod != 0 ? `${systemData.rollFormula}+@mod` : `${systemData.rollFormula}`;

            if (dialogResp?.resp?.rolling === true) {
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