import { ChatFactory, CHAT_TYPE } from '../chat/ChatFactory.mjs';
import { TagManager } from '../sys/TagManager.mjs';

/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class fadeItem extends Item {
   constructor(data, context) {
      super(data, context);
      this.tagManager = new TagManager(this); // Initialize TagManager
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
         class: `${fdPath}/class.webp`,
         weaponMastery: "icons/svg/combat.svg",
      };
   }

   // Override the create method to assign default icons if not provided
   static async create(data, context = {}) {
      if (data.img === undefined) {
         data.img = this.defaultIcons[data.type] || "icons/svg/item-bag.svg"; // Fallback icon
      }
      return super.create(data, context);
   }

   /**
   * A getter for dynamically calculating the contained items.
   * This data is not stored in the database.
   */
   get contained() {
      return this.parent?.items.filter(item => item.system.containerId === this.id) || [];
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
    * Handle clickable rolls. This is the default handler and subclasses override. If a subclass 
    * does not override this message the result is a chat message with the item description.
    * @param {dataset} event The data- tag values from the clicked element
    * @private
    */
   async roll(dataset) {
      // Initialize chat data.
      //const speaker = ChatMessage.getSpeaker({ actor: this.actor });
      const rollMode = await game.settings.get('core', 'rollMode');
      const chatData = {         
         caller: this,
         context: this.actor,
         rollMode 
      };
      const builder = new ChatFactory(CHAT_TYPE.GENERIC_ROLL, chatData);
      return await builder.createChatMessage();

   //   // If there's no roll data, send a chat message with the item description.
   //   if (dataset?.test === null || dataset?.test === undefined) {
   //      ChatMessage.create({
   //         speaker: speaker,
   //         rollMode: rollMode,
   //         flavor: `${item.name}`,
   //         content: item.system.description ?? '',
   //      });
   //   }
   }

   async getEvaluatedRoll(formula, options = { minimize: true }) {
      let result = null;
      if (formula !== null && formula !== "") {
         const rollData = this.getRollData();
         try {
            let roll = new Roll(formula, rollData);
            await roll.evaluate(options);
            result = roll;
         }
         catch (error) {
            console.error(`Invalid roll formula for ${this.name}. Formula='${formula}''. Owner=${this.parent?.name}`, error);
         }
      }
      return result;
   }

   async getEvaluatedRollFormula(formula) {
      return await this.getEvaluatedRoll(formula)?.formula;
   }
}