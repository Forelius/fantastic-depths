import { fadeItem } from './fadeItem.mjs';
import { DialogFactory } from '../dialog/DialogFactory.mjs';
import { ChatFactory, CHAT_TYPE } from '../chat/ChatFactory.mjs';

export class SpecialAbilityItem extends fadeItem {
   constructor(data, context) {
      /** Default behavior, just call super() and do all the default Item inits */
      super(data, context);
   }

   get targetSummary() {
      let summary = '';
      if (this.system.rollFormula?.length > 0 && this.system.target?.length > 0) {
         summary = `${CONFIG.FADE.Operators[this.system.operator]} ${this.system.target}`;
      }
      return summary;
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
   async roll(dataset, dialogResp = null) {
      let result = null;
      const systemData = this.system;
      const instigator = this.actor?.token || this.actor || canvas.tokens.controlled?.[0];
      let canProceed = true;
      const hasRoll = systemData.rollFormula != null && systemData.rollFormula != "" && systemData.target != null && systemData.target != "";
      const rollData = this.getRollData();

      let rolled = null;
      if (hasRoll === true) {
         try {
            // Retrieve roll data.
            dataset.dialog = "generic";
            dataset.rollmode = systemData.rollMode;
            if (dialogResp) {
               dialogResp.rolling === true
            }
            else {
               const dialog = await DialogFactory(dataset, this.actor);
               dialogResp = dialog?.resp;
            }

            if (dialogResp.rolling === true) {
               if (systemData.operator == "lt" || systemData.operator == "lte" || systemData.operator == "<" || systemData.operator == "<=") {
                  dialogResp.mod -= systemData.abilityMod?.length > 0 ? this.actor.system.abilities[systemData.abilityMod].mod : 0;
               } else if (systemData.operator == "gt" || systemData.operator == "gte" || systemData.operator == ">" || systemData.operator == ">=") {
                  dialogResp.mod += systemData.abilityMod?.length > 0 ? this.actor.system.abilities[systemData.abilityMod].mod : 0;
               }
            } else {
               canProceed = false;
            }
            rollData.formula = dialogResp?.mod != 0 ? `${systemData.rollFormula}+@mod` : `${systemData.rollFormula}`;
            const rollContext = { ...rollData, ...dialogResp || {} };
            rolled = await new Roll(rollData.formula, rollContext).evaluate();
         } catch (error) {
            // Close button pressed or other error
            console.warn(error);
            canProceed = false;
         }
      }

      if (canProceed === true) {
         const chatData = {
            caller: this,
            resp: dialogResp,
            context: instigator,
            roll: rolled,
         };
         const builder = new ChatFactory(CHAT_TYPE.SPECIAL_ABILITY, chatData);
         result = builder.createChatMessage();
      }

      return result;
   }

   async getInlineDescription() {
      const description = await super.getInlineDescription();
      //desc.replace(/(<p)/igm, '<div').replace(/<\/p>/igm, '</div>')
      const summary = this.targetSummary?.length > 0 ? `<p>${this.targetSummary}</p>` : '';
      return `${summary}${description}`;
   }

   static getSavingThrow(saveCode) {
      return game.items.find(item => item.type === 'specialAbility' && item.system.category === 'save' && item.system.customSaveCode === saveCode)?.name;
   }
}