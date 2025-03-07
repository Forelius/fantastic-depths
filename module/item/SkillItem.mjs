import { fadeItem } from './fadeItem.mjs';
import { DialogFactory } from '../dialog/DialogFactory.mjs';
import { ChatFactory, CHAT_TYPE } from '../chat/ChatFactory.mjs';

export class SkillItem extends fadeItem {
   constructor(data, context) {
      /** Default behavior, just call super() and do all the default Item inits */
      super(data, context);
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
         systemData.rollTarget = this.actor.system.abilities[systemData.ability].value;
      }
   }

   async getDamageRoll() {
      const isHeal = this.system.healFormula?.length > 0;
      let formula = null;
      let digest = [];
      let hasDamage = false;

      if (isHeal) {
         const evaluatedRoll = await this.getEvaluatedRoll(this.system.healFormula);
         formula = evaluatedRoll?.formula;
         hasDamage = true;
      }

      return {
         formula,
         type: isHeal ? "heal" : null,
         digest,
         hasDamage
      };
   }

   /**
   * Handle clickable rolls.
   * @override
   * @param {Event} event The originating click event
   * @private
   */
   async roll() {
      const systemData = this.system;
      const roller = this.actor?.token || this.actor || canvas.tokens.controlled?.[0];
      const dataset = {
         rollType: 'item',
         label: this.name,
         dialog: 'generic',
         test: 'skill'
      };
      // Retrieve roll data.
      const rollData = this.getRollData();

      // Show the dialog for roll modifier
      let dialogResp = null;
      try {
         dialogResp = await DialogFactory(dataset, this.actor);
         const levelMod = systemData.level > 1 ? `-${systemData.level-1}` : '';
         rollData.formula = dialogResp.resp.mod != 0 ? `${systemData.rollFormula}${levelMod}-@mod` : `${systemData.rollFormula}${levelMod}`;
      }
      // If close button is pressed
      catch (error) {
         // Like Weird Al says, eat it
      }

      let result = null;
      if (dialogResp !== null) {
         // Roll
         const rollContext = { ...rollData, ...dialogResp?.resp || {} };
         let rolled = await new Roll(rollData.formula, rollContext).evaluate();
         const targetRoll = await new Roll(systemData.targetFormula, rollContext).evaluate();

         // Show the chat message
         dataset.pass = systemData.operator; // this is a less than or equal to roll
         dataset.target = targetRoll.total; // systemData.rollTarget;
         dataset.rollmode = systemData.rollMode;
         const localizeAbility = game.i18n.localize(`FADE.Actor.Abilities.${systemData.ability}.long`);
         dataset.desc = `${localizeAbility} (${CONFIG.FADE.Operators[systemData.operator]}${dataset.target})`;
         const chatData = {
            dialogResp: dialogResp,
            caller: this, // the skill item
            context: roller, // the skill item owner
            mdata: dataset,
            roll: rolled,
         };
         const builder = new ChatFactory(CHAT_TYPE.SKILL_ROLL, chatData);
         result = builder.createChatMessage();
      }

      return result;
   }
}