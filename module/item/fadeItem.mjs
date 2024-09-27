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
         mastery: "icons/svg/combat.svg",
         item: "icons/svg/item-bag.svg",
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
         this.system.totalWeight = Math.round((this.system.weight * this.system.quantity) * 100) /100;
         this.system.totalCost = Math.round((this.system.cost * this.system.quantity) * 100) / 100;
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
      if (this.actor !== null) {
         // If present, add the actor's roll data
         rollData.actor = this.actor.getRollData();
      }

      return rollData;
   }

   /**
    * Handle clickable rolls.
    * @param {dataset} event The data- tag values from the clicked element
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

      if (cardType !== null) {
         const rollContext = { ...this.actor.getRollData(), ...dialogResp?.resp || {} };
         let rolled = await new Roll(formula, rollContext).evaluate();
         const chatData = {
            dialogResp: dialogResp,
            caller: item,
            context: this.actor,
            mdata: dataset,
            roll: rolled,
         };
         const builder = new ChatFactory(cardType, chatData);
         return builder.createChatMessage();
      }
   }

   pushTag(value) {
      const systemData = this.system;
      systemData.tags = systemData.tags || [];

      const trimmedValue = value.trim();
      if (!systemData.tags.includes(trimmedValue)) {
         systemData.tags.push(trimmedValue);
      }

      // Check if "light" tag is being added and initialize the system.light property
      if (trimmedValue === "light" && !systemData.light) {
         systemData.light = {};
         systemData.light.duration = 6;
         systemData.light.radius = 30;
         systemData.light.fuel = "none";
         systemData.light.type = "torch";
         this.update({ "system.light": systemData.light }); // Update light separately
      }

      // Update the tags separately
      return this.update({ "system.tags": systemData.tags });
   }

   popTag(value) {
      const systemData = this.system;
      systemData.tags = systemData.tags || [];

      const index = systemData.tags.indexOf(value);
      if (index > -1) {
         systemData.tags.splice(index, 1);
      }

      // Check if "light" tag is being removed and clear the system.light property
      if (value === "light") {
         systemData.light = null; // Or {}, depending on your needs
         this.update({ "system.light": systemData.light }); // Update light separately
      }

      // Update the tags separately
      return this.update({ "system.tags": systemData.tags });
   }
}
