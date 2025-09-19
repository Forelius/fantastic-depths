import { DialogFactory } from '/systems/fantastic-depths/module/dialog/DialogFactory.mjs';
import { ChatFactory, CHAT_TYPE } from '/systems/fantastic-depths/module/chat/ChatFactory.mjs';
import { FDItem } from '/systems/fantastic-depths/module/item/FDItem.mjs';
import { TagManager } from '/systems/fantastic-depths/module/sys/TagManager.mjs';

/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
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
    * Handle clickable rolls. This is the default handler and subclasses override. If a subclass 
    * does not override this message the result is a chat message with the item description.
    * @param {dataset} event The data- tag values from the clicked element
    * @private
    */
   async roll(dataset) {
      const owner = dataset.owneruuid ? foundry.utils.deepClone(await fromUuid(dataset.owneruuid)) : null;
      const instigator = owner || this.actor?.token || canvas.tokens.controlled?.[0];
      if (!instigator) {
         ui.notifications.warn(game.i18n.localize('FADE.notification.selectToken1'));
         return null;
      }
      // Initialize chat data.
      const rollMode = game.settings.get('core', 'rollMode');
      const chatData = {
         caller: this,
         context: instigator,
         rollMode
      };
      const builder = new ChatFactory(CHAT_TYPE.ITEM_ROLL, chatData);
      return await builder.createChatMessage();
   }

   getDamageRoll(resp) {
      const isHeal = this.system.healFormula?.length > 0;
      const evaluatedRoll = this.getEvaluatedRollSync(isHeal ? this.system.healFormula : this.system.dmgFormula);
      let damageFormula = evaluatedRoll?.formula;
      const digest = [];
      let modifier = 0;
      let hasDamage = true;
      const damageType = isHeal ? "heal" : (this.system.damageType == '' ? 'physical' : this.system.damageType);

      if (resp?.mod && resp?.mod !== 0) {
         damageFormula = damageFormula ? `${damageFormula}+${resp.mod}` : `${resp.mod}`;
         modifier += resp.mod;
         digest.push(game.i18n.format('FADE.Chat.rollMods.manual', { mod: resp.mod }));
      }

      if (modifier <= 0 && (evaluatedRoll == null || evaluatedRoll?.total <= 0)) {
         hasDamage = false;
      }

      return hasDamage ? { damageFormula, damageType, digest, hasDamage } : null;
   }
}