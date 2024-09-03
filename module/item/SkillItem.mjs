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
   }

   /** @override */
   prepareData() {
      super.prepareData();
   }

   /** @override */
   getRollData() {
      const data = super.getRollData();
      return data;
   }

   /**
 * Handle clickable rolls.
 * @param {Event} event The originating click event
 * @private
 */
   async roll(dataset) {
      const item = this;
      const systemData = this.system;

      // Initialize chat data.
      const speaker = ChatMessage.getSpeaker({ actor: this.actor });
      const label = `[${item.type}] ${item.name}`;

      console.log("SkillItem.roll", label, item, dataset);

      // If there's no roll data, send a chat message.
      // Retrieve roll data.
      const rollData = this.getRollData();
      dataset.dialog = "generic";
      dataset.pass = "lte";
      let dialogResp = null;
      try {
         dialogResp = await DialogFactory(dataset, this.actor);
         let levelMod = systemData.level > 1 ? `-${systemData.level}` : '';
         rollData.formula = dialogResp.resp.mod != 0 ? `1d20${levelMod}-@mod` : `1d20${levelMod}`;
         console.log("roll", rollData);
      }
      // If close button is pressed
      catch (error) {
         // Like Weird Al says, eat it
      }

      let result = null;
      if (dialogResp !== null) {
         const rollContext = { ...rollData, ...dialogResp?.resp || {} };
         let rolled = await new Roll(rollData.formula, rollContext).evaluate();
         const chatData = {
            dialogResp: dialogResp,
            caller: this,
            context: this.actor,
            mdata: dataset,
            roll: rolled,
         };
         const builder = new ChatFactory(CHAT_TYPE.GENERIC_ROLL, chatData);
         result = builder.createChatMessage();
      }

      return result;
   }
}