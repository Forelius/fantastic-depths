import { ChatFactory, CHAT_TYPE } from '../chat/ChatFactory.js';
import { FDItem } from './FDItem.js';
import { TagManager } from '../sys/TagManager.js';

/**
 * Extend the basic Item with some very simple modifications.
 * @extends {FDItem}
 */
export class GearItem extends FDItem {
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

   get isContained() {
      return this.system.containerId?.length > 0;
   }

   /** A getter for dynamically calculating the total weight of this item, including contained items. */
   get totalEnc() {
      let result = 0;
      if (this.system.container === true) {
         result = this.containedItems?.reduce((sum, ritem) => { return sum + ritem.totalEnc }, 0) || 0;
      }
      let weight = this.system.weight ?? 0;
      if (this.system.equipped) {
         weight = this.system.weightEquipped ?? 0;
      }
      const quantity = this.system.quantity > 0 ? this.system.quantity : 0;
      result += weight * quantity;
      return result;
   }

   get isDropped() {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      let current = this;
      let result = false;
      while (current) {
         if (current.system.isDropped) {
            result = true;
            current = null;
         } else if (this.actor && current.system.containerId) {
            current = this.actor.items.get(current.system.containerId);
         } else {
            current = null;
         }
      }
      return result;
   }

   get isUsable() {
      return this.chargesMax > 0 || this.chargesMax === null;
   }

   /** @protected */
   prepareDerivedData() {
      super.prepareDerivedData();
      if (this.system.quantity !== undefined) {
         const qty = this.system.quantity > 0 ? this.system.quantity : 0;
         this.system.totalWeight = Math.round((this.system.weight * qty) * 100) / 100;
         this.system.totalCost = Math.round((this.system.cost * qty) * 100) / 100;
      }
      // This can't be in data model, because name is a property of Item.
      this.system.unidentifiedName = this.system.unidentifiedName ?? this.name;
   }

   /**
    * Handle clickable rolls. This is the default handler and subclasses override. If a subclass 
    * does not override this message the result is a chat message with the item description.
    * @param {any} dataset The data- tag values from the clicked element
    */
   async roll(dataset) {
      const { instigator } = await this.getInstigator(dataset);
      // Initialize chat data.
      const rollMode = game.settings.get('core', 'rollMode');
      const chatData = {
         caller: this,
         context: instigator, // actor or token
         rollMode
      };
      const builder = new ChatFactory(CHAT_TYPE.ITEM_ROLL, chatData);
      return await builder.createChatMessage();
   }
}