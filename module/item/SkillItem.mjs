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
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
      const systemData = this.system;
      if (this.actor) {
         systemData.rollTarget = this.actor.system.abilities[systemData.ability].value;
      }
   }

   /**
   * Handle clickable rolls.
   * @override
   * @param {Event} event The originating click event
   * @private
   */
   async roll(dataset) {
      const item = this;
      const systemData = this.system;
      const ownerData = this.actor.system;

      // Retrieve roll data.
      const rollData = this.getRollData();

      // Show the dialog for roll modifier
      let dialogResp = null;
      try {
         dialogResp = await DialogFactory(dataset, this.actor);
         let levelMod = systemData.level > 1 ? `-${systemData.level}` : '';
         rollData.formula = dialogResp.resp.mod != 0 ? `1d20${levelMod}-@mod` : `1d20${levelMod}`;
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

         // Show the chat message
         dataset.pass = "lte"; // this is a less than or equal to roll
         dataset.target = systemData.rollTarget;
         const localizeAbility = game.i18n.localize(`FADE.Actor.Abilities.${systemData.ability}.long`);
         dataset.desc = `${localizeAbility} (${ownerData.abilities[systemData.ability].value})`
         const chatData = {
            dialogResp: dialogResp,
            caller: this.actor, // the skill item
            context: this.actor, // the skill item owner
            mdata: dataset,
            roll: rolled,
         };
         const builder = new ChatFactory(CHAT_TYPE.SKILL_ROLL, chatData);
         result = builder.createChatMessage();
      }

      return result;
   }
}