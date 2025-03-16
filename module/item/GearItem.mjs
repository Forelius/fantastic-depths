import { DialogFactory } from '../dialog/DialogFactory.mjs';
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
    * Handle clickable rolls. This is the default handler and subclasses override. If a subclass 
    * does not override this message the result is a chat message with the item description.
    * @param {dataset} event The data- tag values from the clicked element
    * @private
    */
   async roll(dataset) {
      // Initialize chat data.
      const rollMode = game.settings.get('core', 'rollMode');
      let isUsing = false;

      if (this.system.isUsable === true) {
         if ((await this.#tryUseUsage(true)) === true) {
            const dialogResp = await DialogFactory({
               dialog: "yesno",
               title: game.i18n.localize('FADE.dialog.useItem.title'),
               content: game.i18n.localize('FADE.dialog.useItem.content'),
               yesLabel: game.i18n.localize('FADE.dialog.useItem.yesLabel'),
               noLabel: game.i18n.localize('FADE.dialog.spellcast.noLabel'),
               defaultChoice: "yes"
            }, this.actor);
            if (dialogResp?.resp?.result === true) {
               isUsing = true;
               await this.#tryUseUsage();
            }
         }
      }

      const chatData = {
         caller: this,
         context: this.actor,
         rollMode
      };

      const builder = new ChatFactory(CHAT_TYPE.GENERIC_ROLL, chatData, { isUsing });
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

   async getDamageRoll(resp) {
      const isHeal = this.system.healFormula?.length > 0;
      let evaluatedRoll = await this.getEvaluatedRoll(isHeal ? this.system.healFormula : this.system.dmgFormula);
      let formula = evaluatedRoll?.formula;
      let digest = [];
      let modifier = 0;
      let hasDamage = true;
      const type = isHeal ? "heal" : (this.system.damageType == '' ? 'physical' : this.system.damageType);

      if (resp?.mod && resp?.mod !== 0) {
         formula = formula ? `${formula}+${resp.mod}` : `${resp.mod}`;
         modifier += resp.mod;
         digest.push(game.i18n.format('FADE.Chat.rollMods.manual', { mod: resp.mod }));
      }

      if (modifier <= 0 && (evaluatedRoll == null || evaluatedRoll?.total <= 0)) {
         hasDamage = false;
      }

      return {
         formula,
         type,
         digest,
         hasDamage
      };
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
}