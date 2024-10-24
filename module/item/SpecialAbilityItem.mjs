import { fadeItem } from './fadeItem.mjs';
import { DialogFactory } from '../dialog/DialogFactory.mjs';
import { ChatFactory, CHAT_TYPE } from '../chat/ChatFactory.mjs';

export class SpecialAbilityItem extends fadeItem {
   constructor(data, context) {
      /** Default behavior, just call super() and do all the default Item inits */
      super(data, context);
   }

   /**
   * Handle clickable rolls.
   * @param {Event} event The originating click event
   * @private
   */
   async roll(dataset) {
      let result = null;
      const item = this;
      const systemData = this.system;

      if (systemData.rollFormula && systemData.target) {
         // Initialize chat data.
         const speaker = ChatMessage.getSpeaker({ actor: this.actor });
         const label = `[${item.type}] ${item.name}`;

         // If there's no roll data, send a chat message.
         // Retrieve roll data.
         const rollData = this.getRollData();
         dataset.dialog = "generic";
         dataset.pass = systemData.operator;
         dataset.target = systemData.target;
         dataset.rollmode = systemData.rollMode;
         let dialogResp = null;
         try {
            dialogResp = await DialogFactory(dataset, this.actor);
            rollData.formula = dialogResp.resp.mod != 0 ? `${systemData.rollFormula}+@mod` : `${systemData.rollFormula}`;
         }
         // If close button is pressed
         catch (error) {
            // Like Weird Al says, eat it
            console.error("SpecialAbilityItem.roll():", error);
         }
         
         if (dialogResp !== null) {
            const rollContext = { ...rollData, ...dialogResp?.resp || {} };
            let rolled = await new Roll(rollData.formula, rollContext).evaluate();
            const chatData = {
               dialogResp: dialogResp,
               context: this.actor,
               mdata: dataset,
               roll: rolled,
            };
            const builder = new ChatFactory(CHAT_TYPE.GENERIC_ROLL, chatData);
            result = builder.createChatMessage();
         }
      } else {
         result = await super.roll(dataset);
      }

      return result;
   }
}