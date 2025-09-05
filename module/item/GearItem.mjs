import { DialogFactory } from '../dialog/DialogFactory.mjs';
import { ChatFactory, CHAT_TYPE } from '../chat/ChatFactory.mjs';
import { FDItem } from './FDItem.mjs';
import { TagManager } from '../sys/TagManager.mjs';

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
      // Initialize chat data.
      const rollMode = game.settings.get('core', 'rollMode');
      let isUsing = false;
      let isCanceled = false;

      if (this.system.isUsable === true && this.system.isIdentified === true) {
         // If this item has a quantity and either has charges or doesn't use charges...
         if ((await this.#tryUseUsage(true)) === true
            && (this.#usesCharge() === false || await this.#tryUseCharge(true))) {
            const dialogResp = await DialogFactory({
               dialog: "yesno",
               title: game.i18n.localize('FADE.dialog.useItem.title'),
               content: game.i18n.localize('FADE.dialog.useItem.content'),
               yesLabel: game.i18n.localize('FADE.dialog.useItem.yesLabel'),
               noLabel: game.i18n.localize('FADE.dialog.spellcast.noLabel'),
               defaultChoice: "yes"
            }, this.actor);
            if (dialogResp?.resp == null) {
               isCanceled = true;
            }
            else if (dialogResp?.resp?.result === true) {
               isUsing = true;
               if (this.#usesCharge()) {
                  await this.#tryUseCharge();
               } else {
                  await this.#tryUseUsage();
               }
            }
         }
      }

      if (isCanceled === false) {
         const chatData = {
            caller: this,
            context: this.actor,
            rollMode
         };
         const { conditions, durationMsgs } = await this._getConditionsForChat();
         const builder = new ChatFactory(CHAT_TYPE.ITEM_ROLL, chatData, { isUsing, conditions, durationMsgs });
         return await builder.createChatMessage();
      }
   }

   async getInlineDescription() {
      // TODO: Remove after v12 support.
      const textEditorImp = foundry?.applications?.ux?.TextEditor?.implementation ? foundry.applications.ux.TextEditor.implementation : TextEditor;

      let description = this.system.isIdentified === true ?
         await super.getInlineDescription()
         : await textEditorImp.enrichHTML(this.system.unidentifiedDesc, {
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

      return { damageFormula, damageType, digest, hasDamage };
   }

   /**
    * Determines if any uses are available and if so decrements quantity by one
    * @private
    * @param {any} getOnly If true, does not use, just gets.
    * @returns True if quantity is above zero.
    */
   async #tryUseUsage(getOnly = false) {
      let hasUse = this.system.quantity > 0;

      if (getOnly !== true) {
         // Deduct 1 if not infinite and not zero
         if (hasUse === true && this.system.quantityMax !== null) {
            const newQuantity = Math.max(0, this.system.quantity - 1);
            await this.update({ "system.quantity": newQuantity });
         }
      }
      // If there are no usages remaining, show a UI notification
      if (hasUse === false) {
         const message = game.i18n.format('FADE.notification.zeroQuantity', { itemName: this.name });
         ui.notifications.warn(message);
         ChatMessage.create({ content: message, speaker: { alias: this.actor.name, } });
      }

      return hasUse;
   }

   /**
    * Determines if any charges are available and if so decrements charges by one
    * @private
    * @param {any} getOnly If true, does not use, just gets.
    * @returns True if quantity is above zero.
    */
   async #tryUseCharge(getOnly = false) {
      let hasCharge = this.system.charges > 0;

      if (getOnly !== true) {
         // Deduct 1 if not infinite and not zero
         if (hasCharge === true && this.system.chargesMax !== null) {
            const newCharges = Math.max(0, this.system.charges - 1);
            await this.update({ "system.charges": newCharges });
         }
      }
      // If there are no charges remaining, show a UI notification
      if (hasCharge === false) {
         const message = game.i18n.format('FADE.notification.zeroQuantity', { itemName: this.name });
         ui.notifications.warn(message);
         ChatMessage.create({ content: message, speaker: { alias: this.actor.name, } });
      }

      return hasCharge;
   }

   #usesCharge() {
      // Item uses charges if there are any charges or if charges max is greater than zero or charges max is infinite.
      return this.system.charges > 1 || this.system.chargesMax > 0 || this.system.chargesMax === null;
   }
}