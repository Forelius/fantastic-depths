import { DialogFactory } from '../dialog/DialogFactory.mjs';
import { ChatFactory, CHAT_TYPE } from '../chat/ChatFactory.mjs';

/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class fadeItem extends Item {
   constructor(data, context) {
      super(data, context);
   }

   // Define default icons for various item types using core data paths
   static get defaultIcons() {
      const fdPath = `systems/fantastic-depths/assets/img/item`;
      return {
         spell: `${fdPath}/spell.png`,
         specialAbility: `${fdPath}/specialAbility.png`,
         skill: `${fdPath}/skill.png`,
         armor: `${fdPath}/armor.png`,
         weapon: "icons/svg/sword.svg",
         item: "icons/svg/bag.svg",
         container: "icons/svg/chest.svg",
      };
   }

   // Override the create method to assign default icons if not provided
   static async create(data, context = {}) {
      if (data.img === undefined) {
         data.img = this.defaultIcons[data.type] || "icons/svg/item-bag.svg"; // Fallback icon
      }
      return super.create(data, context);
   }

   /** @override */
   prepareDerivedData() {      
      super.prepareDerivedData();
      if (this.type === "item") {
         this.system.totalWeight = this.system.weight * this.system.quantity;
      }
   }

   /**
    * Augment the basic Item data model with additional dynamic data.
    * @override */
   prepareData() {
      // As with the actor class, items are documents that can have their data
      // preparation methods overridden(such as prepareBaseData()).
      super.prepareData();
      //console.log("Item prepareData:", this.name, this?.parent, this?.actor);
   }

   /**
    * Prepare a data object which defines the data schema used by dice roll commands against this Item
    * @override
    */
   getRollData() {
      // Starts off by populating the roll data with a shallow copy of `this.system`
      const rollData = { ...this.system };

      // Quit early if there's no parent actor
      if (!this.actor) return rollData;

      // If present, add the actor's roll data
      rollData.actor = this.actor.getRollData();

      return rollData;
   }

   /**
    * Handle clickable rolls.
    * @param {Event} event The originating click event
    * @private
    */
   async roll(dataset) {
      const item = this;

      // Initialize chat data.
      const speaker = ChatMessage.getSpeaker({ actor: this.actor });
      const rollMode = game.settings.get('core', 'rollMode');
      const label = `[${item.type}] ${item.name}`;
      let formula = dataset.formula;
      let cardType = null;
      let dialogResp;
      //console.log("fadeItem.roll", label, item, dataset);

      // If there's no roll data, send a chat message.
      if (dataset.test === null || dataset.test === undefined) {
         ChatMessage.create({
            speaker: speaker,
            rollMode: rollMode,
            flavor: label,
            content: item.system.description ?? '',
         });
      }
      // Otherwise, create a roll and send a chat message from it.
      else if (dataset.test === 'attack') {
         formula = "1d20";
         dataset.dialog = dataset.test;
         cardType = CHAT_TYPE.GENERIC_ROLL;
         try {
            dialogResp = await DialogFactory(dataset, this.actor);
            formula = dialogResp.resp.mod != 0 ? `${formula}+@mod` : formula;
         }
         // If close button is pressed
         catch (error) {
            cardType = null;
         }
      }

      if (cardType !== null) {
         const rollContext = { ...this.actor.getRollData(), ...dialogResp?.resp || {} };
         let rolled = await new Roll(formula, rollContext).evaluate();
         const chatData = {
            dialogResp: dialogResp,
            caller: this,
            context: this.actor,
            mdata: dataset,
            roll: rolled,
         };
         const builder = new ChatFactory(cardType, chatData);
         return builder.createChatMessage();
      }
   }

   pushTag(value) {
      // Ensure the system data exists and initialize tags array if it doesn't exist
      const systemData = this.system;
      systemData.tags = systemData.tags || [];

      // Clean up the value and log the operation
      const trimmedValue = value;

      // Add the trimmed value to the tags array
      systemData.tags.push(trimmedValue);

      // Persist the updated data to Foundry's database
      return this.update({ "system.tags": systemData.tags });
   }

   popTag(value) {
      const systemData = this.system;

      // Ensure tags exist and are an array
      if (!systemData.tags || !Array.isArray(systemData.tags)) return;

      // Filter out the tag that matches the value (case-sensitive)
      const updatedTags = systemData.tags.filter(tag => tag !== value.trim());

      // Update the item's tags and persist the change
      return this.update({ "system.tags": updatedTags });
   }
}
