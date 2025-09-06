import { FDItem } from "./FDItem.mjs";
import { DialogFactory } from "../dialog/DialogFactory.mjs";
import { ChatFactory, CHAT_TYPE } from "../chat/ChatFactory.mjs";
import { TagManager } from "../sys/TagManager.mjs";

export class SpecialAbilityItem extends FDItem {
   constructor(data, context) {
      /** Default behavior, just call super() and do all the default Item inits */
      super(data, context);
      this.tagManager = new TagManager(this); // Initialize TagManager
   }

   get targetSummary() {
      let summary = "";
      if (this.system.rollFormula?.length > 0 && this.system.target?.length > 0) {
         summary = `${CONFIG.FADE.Operators[this.system.operator]} ${this.system.target}`;
      }
      return summary;
   }

   getDamageRoll(resp) {
      const isHeal = this.system.healFormula?.length > 0;
      const evaluatedRoll = this.getEvaluatedRollSync(isHeal ? this.system.healFormula : this.system.dmgFormula);
      let damageFormula = evaluatedRoll?.formula;
      const digest = [];
      let modifier = 0;
      let hasDamage = true;
      let damageType = null;

      if (resp?.mod && resp?.mod !== 0) {
         damageFormula = damageFormula ? `${damageFormula}+${resp.mod}` : `${resp.mod}`;
         modifier += resp.mod;
         digest.push(game.i18n.format("FADE.Chat.rollMods.manual", { mod: resp.mod }));
      }

      if (modifier <= 0 && (evaluatedRoll == null || evaluatedRoll?.total <= 0)) {
         hasDamage = false;
      }

      if (hasDamage) {
         damageType = isHeal ? "heal" : (this.system.damageType == "" ? "physical" : this.system.damageType);
      }      

      return hasDamage ? { damageFormula, damageType, digest, hasDamage } : null;
   }

   /**
   * Handle clickable rolls.
   * @param {Event} event The originating click event
   * @private
   */
   async roll(dataset, dialogResp = null, event = null) {
      let result = null;
      const systemData = this.system;
      const owner = dataset.owneruuid ? foundry.utils.deepClone(await fromUuid(dataset.owneruuid)) : null;
      const instigator = owner || this.actor?.token || this.actor || canvas.tokens.controlled?.[0];
      let canProceed = true;
      const hasRoll = systemData.rollFormula != null && systemData.rollFormula != "" && systemData.target != null && systemData.target != "";
      const rollData = this.getRollData();
      rollData.level = dataset.level;
      const ctrlKey = event?.ctrlKey ?? false;
      const showResult = this._getShowResult(event);

      if (instigator) {
         //let rolled = null;
         let roll = null;
         if (await this.#tryUseUsage(true) === false) {
            canProceed = false;
         } else if (hasRoll === true) {
            // Retrieve roll data.
            dataset.dialog = "generic";
            dataset.rollmode = systemData.rollMode;
            dataset.formula = systemData.rollFormula;
            dataset.label = this.name;

            if (dialogResp) {
               dialogResp.rolling === true
            } else if (ctrlKey === true) {
               dialogResp = {
                  rolling: true,
                  mod: (Number(dataset.mod) || 0),
                  formula: systemData.rollFormula,
                  editFormula: game.user.isGM
               };
            } else {
               dialogResp = await DialogFactory(dataset, instigator);
               if (dialogResp) {
                  dialogResp.rolling = true;
                  dialogResp.mod = Number(dialogResp.mod) + (Number(dataset.mod) || 0);
               }
            }

            if (dialogResp?.rolling === true) {
               dialogResp.formula = dialogResp?.formula?.length > 0 ? dialogResp.formula : systemData.rollFormula;
               if (systemData.operator == "lt" || systemData.operator == "lte" || systemData.operator == "<" || systemData.operator == "<=") {
                  dialogResp.mod -= systemData.abilityMod?.length > 0 ? instigator.system.abilities[systemData.abilityMod].mod : 0;
               } else if (systemData.operator == "gt" || systemData.operator == "gte" || systemData.operator == ">" || systemData.operator == ">=") {
                  dialogResp.mod += systemData.abilityMod?.length > 0 ? instigator.system.abilities[systemData.abilityMod].mod : 0;
               }
            } else {
               canProceed = false;
            }

            rollData.formula = Number(dialogResp?.mod) != 0 ? `${dialogResp?.formula}+@mod` : `${dialogResp?.formula}`;
            const rollContext = { ...rollData, ...dialogResp || {} };
            roll = await new Roll(rollData.formula, rollContext);
         }

         if (canProceed === true) {
            canProceed = await this.#tryUseUsage();
         }

         if (canProceed === true) {
            const chatData = {
               caller: this,
               resp: dialogResp,
               context: instigator,
               roll
            };
            const builder = new ChatFactory(CHAT_TYPE.SPECIAL_ABILITY, chatData, { showResult });
            result = builder.createChatMessage();
         }
      }

      return result;
   }

   async getInlineDescription() {
      const description = await super.getInlineDescription();
      const summary = this.targetSummary?.length > 0 ? `<p>${this.targetSummary}</p>` : "";
      return `${summary}${description}`;
   }

   /**
    * Determines if any uses are available and if so decrements quantity by one
    * @private
    * @param {any} getOnly If true, does not use, just gets.
    * @returns True if quantity is above zero.
    */
   async #tryUseUsage(getOnly = false) {
      let hasUse = this.system.quantity > 0;

      if (getOnly !== true) {
         // Deduct 1 if not infinite and not zero
         if (hasUse === true && this.system.quantityMax !== null && this.system.quantityMax > 0) {
            const newQuantity = Math.max(0, this.system.quantity - 1);
            await this.update({ "system.quantity": newQuantity });
         }
      }
      // If there are no usages remaining, show a UI notification
      if (hasUse === false) {
         const message = game.i18n.format("FADE.notification.zeroQuantity", { itemName: this.name });
         ui.notifications.warn(message);
         ChatMessage.create({ content: message, speaker: { alias: this.actor.name, } });
      }

      return hasUse;
   }
}