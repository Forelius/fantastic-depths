import { FDItem } from './FDItem.mjs';
import { DialogFactory } from '../dialog/DialogFactory.mjs';
import { ChatFactory, CHAT_TYPE } from '../chat/ChatFactory.mjs';

export class SkillItem extends FDItem {
   constructor(data, context) {
      /** Default behavior, just call super() and do all the default Item inits */
      super(data, context);
   }

   get hasTargets() {
      return true;
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
      const systemData = this.system;
      systemData.ability = systemData.ability !== undefined ? systemData.ability : "str";
      systemData.level = systemData.level !== undefined ? systemData.level : 1;
      systemData.rollMode = systemData.rollMode !== undefined ? systemData.rollMode : "publicroll";
      systemData.healFormula = systemData.healFormula || null;
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
      const systemData = this.system;
      if (this.actor) {
         systemData.rollTarget = this.actor.system.abilities[systemData.ability].total;
      }
   }

   getDamageRoll() {
      const isHeal = this.system.healFormula?.length > 0;
      let damageFormula = null;
      let modifier = 0;
      let hasDamage = true; // Has heals or damage

      if (isHeal) {
         damageFormula = this.getEvaluatedRollSync(this.system.healFormula)?.formula;
      }

      if (modifier <= 0 && (damageFormula == null || damageFormula?.total <= 0)) {
         hasDamage = false;
      }

      return hasDamage ? { damageFormula, damageType: isHeal ? "heal" : null, digest: [], hasDamage: isHeal === true } : null;
   }

   /**
   * Handle clickable rolls.
   * @override
   * @param {Event} event The originating click event
   * @private
   */
   async roll(dataset, dialogResp = null, event = null) {
      const owner = dataset.owneruuid ? foundry.utils.deepClone(await fromUuid(dataset.owneruuid)) : null;
      const instigator = owner || this.actor?.currentActiveToken || canvas.tokens.controlled?.[0]?.document;
      if (!instigator) {
         ui.notifications.warn(game.i18n.localize('FADE.notification.noTokenAssoc'));
         return null;
      }
      const systemData = this.system;
      const digest = [];
      dataset = {
         rollType: 'item',
         label: this.name,
         dialog: 'generic',
         test: 'skill'
      };
      // Retrieve roll data.
      const rollData = this.getRollData();
      const ctrlKey = event?.ctrlKey ?? false;
      let levelMod = Math.max(0, systemData.level - 1) + (systemData.level > 0 ? systemData.skillBonus : systemData.skillPenalty);
      const bonusOperator = systemData.operator === 'lte' ? '-' : '+';
      dataset.formula = levelMod !== 0 ? `${systemData.rollFormula}${bonusOperator}${levelMod}` : systemData.rollFormula;
      let rolling = true;

      if (ctrlKey === true) {
         dialogResp = {
            mod: 0,
            formula: dataset.formula,
            editFormula: game.user.isGM
         };
         rollData.formula = dataset.formula;
      } else {
         // Show the dialog for roll modifier
         dialogResp = await DialogFactory(dataset, this.actor);
         rolling = dialogResp != null;
         rollData.formula = dialogResp?.formula?.length > 0 ? dialogResp.formula : dataset.formula;
         if (Number(dialogResp?.mod) != 0) {
            rollData.formula = `${rollData.formula}+@mod`;
         }
      }

      let result = null;
      if (rolling === true) {
         // Roll
         const rollContext = { ...rollData, ...dialogResp || {} };
         const targetRoll = await new Roll(systemData.targetFormula, rollContext).evaluate();
         let rolled = await new Roll(rollData.formula, rollContext).evaluate();

         // Show the chat message
         dataset.pass = systemData.operator; // this is a less than or equal to roll
         dataset.target = targetRoll.total; // systemData.rollTarget;
         dataset.rollmode = systemData.rollMode;
         dataset.autofail = systemData.autoFail;
         dataset.autosuccess = systemData.autoSuccess;
         const abilityName = game.i18n.localize(`FADE.Actor.Abilities.${systemData.ability}.long`);
         dataset.desc = `${localizeAbility} (${CONFIG.FADE.Operators[systemData.operator]}${dataset.target})`;
         const chatData = {
            caller: this, // the skill item
            context: instigator, // the skill item owner
            mdata: dataset,
            roll: rolled,
            digest
         };
         const showResult = this._getShowResult(event);
         const builder = new ChatFactory(CHAT_TYPE.SKILL_ROLL, chatData, { showResult });
         result = builder.createChatMessage();
      }

      return result;
   }
}