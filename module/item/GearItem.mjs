import { ChatFactory, CHAT_TYPE } from '../chat/ChatFactory.mjs';
import { fadeItem } from './fadeItem.mjs';
import { TagManager } from '../sys/TagManager.mjs';

/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class GearItem extends fadeItem {
   constructor(data, context) {
      super(data, context);
      this.tagManager = new TagManager(this); // Initialize TagManager
   }

   get ownerToken() {
      //console.debug(`Get ownerToken ${this.name} (${this.actor?.name}/${this.parent.name})`);
      return this.actor ? this.actor.currentActiveToken : null;
   }

   /** A getter for dynamically calculating the contained items.
    * This data is not stored in the database. */
   get containedItems() {
      return this.parent?.items.filter(item => item.system.containerId === this.id) || [];
   }

   get totalEnc() {
      let result = 0;
      if (this.system.container === true) {
         result = this.containedItems?.reduce((sum, ritem) => { return sum + ritem.totalEnc }, 0) || 0;
      }
      const weight = this.system.weight > 0 ? this.system.weight : 0;
      const quantity = this.system.quantity > 0 ? this.system.quantity : 0;
      result += weight * quantity;
      return result;
   }

   /** @override
    * @protected */
   prepareBaseData() {
      super.prepareBaseData();
   }

   /** @override
    * @protected */
   prepareDerivedData() {
      super.prepareDerivedData();
      if (this.system.quantity !== undefined) {
         const qty = this.system.quantity > 0 ? this.system.quantity : 0;
         this.system.totalWeight = Math.round((this.system.weight * qty) * 100) / 100;
         //console.debug(`${this.actor?.name}: ${this.name} total weight: ${this.system.totalWeight} (${qty}x${this.system.weight})`);
         this.system.totalCost = Math.round((this.system.cost * qty) * 100) / 100;
      }
      // This can't be in data model, because name is a property of Item.
      this.system.unidentifiedName = this.system.unidentifiedName ?? this.name;
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
      const rollMode = game.settings.get('core', 'rollMode');
      const chatData = {
         caller: this,
         context: this.actor,
         rollMode
      };
      const builder = new ChatFactory(CHAT_TYPE.GENERIC_ROLL, chatData);
      return await builder.createChatMessage();
   }

   async getEvaluatedRoll(formula, options = { minimize: true }) {
      let result = null;
      if (formula !== null && formula !== "") {
         const rollData = this.getRollData();
         try {
            const roll = new Roll(formula, rollData);
            await roll.evaluate(options);
            result = roll;
         }
         catch (error) {
            if (game.user.isGM === true) {
               console.error(`Invalid roll formula for ${this.name}. Formula='${formula}''. Owner=${this.parent?.name}`, error);
            }
         }
      }
      return result;
   }

   async getEvaluatedRollFormula(formula) {
      return await this.getEvaluatedRoll(formula)?.formula;
   }

   async getInlineDescription() {
      let description = this.system.isIdentified === true ?
         await super.getInlineDescription()
         : await TextEditor.enrichHTML(this.system.unidentifiedDesc, {
            secrets: false,
            // Necessary in v11, can be removed in v12
            async: true,
            rollData: this.getRollData(),
            // Relative UUID resolution
            relativeTo: this.actor,
         });
      if (description?.length <= 0) {
         description = '--';
      }
      return description;
   }
}