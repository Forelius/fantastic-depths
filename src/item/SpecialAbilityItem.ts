import { FDItem, DamageRollResult, createDamageRollResult } from "./FDItem.js";
import { DialogFactory } from "../dialog/DialogFactory.js";
import { ChatFactory, CHAT_TYPE } from "../chat/ChatFactory.js";
import { TagManager } from "../sys/TagManager.js";

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

   get hasTargets() {
      const noTargets = ["save", "explore"];
      return noTargets.includes(this.system.category);
   }

   getDamageRoll(resp): DamageRollResult {
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

      return hasDamage ? createDamageRollResult({
         damageFormula,
         damageType,
         digest,
         hasDamage
      }) : null;
   }

   /**
   * Handle clickable rolls.
   * @param {any} event The originating click event
   */
   async roll(dataset, dialogResp = null, event = null) {
      let result = null;
      const { instigator, instigatorActor } = await this.getInstigator(dataset);
      const itemSystem = this.system;
      const actionItem = dataset.actionuuid ? foundry.utils.deepClone(await fromUuid(dataset.actionuuid)) : null;
      let canProceed = true;
      const hasRoll = itemSystem.rollFormula != null && itemSystem.rollFormula != "" && itemSystem.target != null && itemSystem.target != "";
      const rollData = this.getRollData();
      rollData.level = dataset.level;
      const ctrlKey = event?.ctrlKey ?? false;
      const showResult = this._getShowResult(event);
      let roll = null;
      const digest = [];

      if (await this._tryUseChargeThenUsage(true, actionItem) === false) {
         canProceed = false;
      } else if (hasRoll === true) {
         // Retrieve roll data.
         dataset.dialog = "generic";
         dataset.rollmode = itemSystem.rollMode;
         dataset.formula = itemSystem.rollFormula;
         dataset.label = this.name;

         if (dialogResp) {
            //dialogResp.rolling = true;
         } else if (ctrlKey === true) {
            dialogResp = {
               rolling: true,
               mod: 0,
               formula: itemSystem.rollFormula,
               editFormula: game.user.isGM
            };
         } else {
            dialogResp = await DialogFactory(dataset, instigator);
            if (dialogResp) {
               dialogResp.rolling = true;
            }
         }

         if (dialogResp?.rolling === true) {
            dialogResp.formula = dialogResp?.formula?.length > 0 ? dialogResp.formula : itemSystem.rollFormula;
            let abilityMod = itemSystem.abilityMod?.length > 0 ? instigatorActor.system.abilities[itemSystem.abilityMod].mod : 0;
            if (abilityMod != 0) {
               digest.push(game.i18n.format("FADE.Chat.rollMods.abilityScoreMod", { mod: abilityMod }));
               // If this is a roll under, then the ability score modifier should subtract from the roll.
               if (itemSystem.operator == "lt" || itemSystem.operator == "lte" || itemSystem.operator == "<" || itemSystem.operator == "<=") {
                  abilityMod = -abilityMod;
               }
            }
            const itemMod = (Number(dataset.mod) || 0);
            if (itemMod != 0) {
               digest.push(game.i18n.format("FADE.Chat.rollMods.itemMod", { mod: itemMod }));
            }
            const manualMod = (Number(dialogResp.mod) || 0);
            if (manualMod != 0) {
               digest.push(game.i18n.format("FADE.Chat.rollMods.manual", { mod: manualMod }));
            }
            dialogResp.mod = itemMod + manualMod + abilityMod;
            rollData.formula = Number(dialogResp?.mod) != 0 ? `${dialogResp?.formula}+@mod` : `${dialogResp?.formula}`;
            const rollContext = { ...rollData, ...dialogResp || {} };
            roll = await new Roll(rollData.formula, rollContext);
         } else {
            canProceed = false;
         }
      }

      if (canProceed === true) {
         canProceed = await this._tryUseChargeThenUsage(false, actionItem);
      }

      if (canProceed === true) {
         const chatData = {
            caller: this,
            resp: dialogResp,
            context: instigator,
            roll,
            digest
         };
         const builder = new ChatFactory(CHAT_TYPE.SPECIAL_ABILITY, chatData, { showResult });
         result = builder.createChatMessage();
      }

      return result;
   }

   async getInlineDescription() {
      const description = await super.getInlineDescription();
      const summary = this.targetSummary?.length > 0 ? `<p>${this.targetSummary}</p>` : "";
      return `${summary}${description}`;
   }
}