import { ChatFactory, CHAT_TYPE } from '../chat/ChatFactory.mjs';

/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class FDItem extends Item {
   constructor(data, context) {
      super(data, context);
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

   get canMelee() { return this.system.canMelee === true }
   get canShoot() { return this.system.canRanged === true && (this.system.ammoType?.length ?? 0) > 0 }
   get canThrow() { return this.system.canRanged === true && (this.system.ammoType?.length ?? 0) === 0 }

   /** @override
    * @protected */
   prepareBaseData() {
      super.prepareBaseData();
      if (this.type === 'treasure') {
         this.system.quantityMax = 0;
      }
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
         light: "icons/sundries/lights/lantern-iron-lit-yellow.webp",
         condition: "icons/svg/paralysis.svg"
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

   async getInlineDescription() {
      // TODO: Remove after v12 support.
      const textEditorImp = foundry?.applications?.ux?.TextEditor?.implementation ? foundry.applications.ux.TextEditor.implementation : TextEditor;

      let description = await textEditorImp.enrichHTML(this.system.description, {
         // Whether to show secret blocks in the finished html
         secrets: false,
         // Necessary in v11, can be removed in v12
         async: true,
         // Data to fill in for inline rolls
         rollData: this.getRollData(),
         // Relative UUID resolution
         relativeTo: this.actor,
      });
      if (description?.length <= 0) {
         description = '--';
      }
      return description;
   }

   /**
    * Handle clickable rolls. This is the default handler and subclasses override. If a subclass 
    * does not override this message the result is a chat message with the item description.
    * @public
    * @param {dataset} dataset The data- tag values from the clicked element
    * @param {object} owner (Optional) Owner of the item. This could be a compendium item referenced as sub-item.
    */
   async roll(dataset, owner) {
      // Initialize chat data.
      //const speaker = ChatMessage.getSpeaker({ actor: this.actor });
      const rollMode = game.settings.get('core', 'rollMode');
      const chatData = {
         caller: this,
         context: this.actor || owner,
         rollMode
      };
      const builder = new ChatFactory(CHAT_TYPE.GENERIC_ROLL, chatData);
      return await builder.createChatMessage();
   }

   /**
    * Evaluates a roll formula asynchronously into a numerical value.
    * @param {any} formula The roll formula
    * @param {any} options The Roll.evaluate options. Default minimize=true will generate lowest possible value.
    * @returns If the formula and options are valid, an evaluated roll object.
    */
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

   /**
    * Evaluates a roll formula synchronously into a numerical value.
    * @param {any} formula The roll formula
    * @param {any} options The Roll.evaluate options. Default minimize=true will generate lowest possible value.
    * @returns If the formula and options are valid, an evaluated roll object.
    */
   getEvaluatedRollSync(formula, options = { minimize: true }) {
      let result = null;
      if (formula !== null && formula !== "") {
         const rollData = this.getRollData();
         try {
            const roll = new Roll(formula, rollData);
            roll.evaluateSync(options);
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

   getEvaluatedRollFormulaSync(formula) {
      return this.getEvaluatedRollSync(formula)?.formula;
   }

   /**
    * Process all item active effects that are not set to transfer to the owning actor.
    * @protected
    */
   _processNonTransferActiveEffects() {
      const data = this.system;

      // Apply Active Effects only if transfer is false
      const changes = this.effects
         .filter(effect => !effect.disabled && effect.transfer === false) // Only local effects
         .flatMap(effect => effect.changes);

      // Process changes
      for (const change of changes) {
         if (change.key.startsWith("system.")) {
            const path = change.key.slice(7); // Strip "system." prefix
            const currentValue = foundry.utils.getProperty(data, path);
            const newValue = this._applyEffectChange(change.mode, currentValue, change.value);
            foundry.utils.setProperty(data, path, newValue);
         }
      }
   }

   /**
    * Helper method to process Active Effect changes.
    * @protected
    * @param {any} mode A valid CONST.ACTIVE_EFFECT_MODES value.
    * @param {any} currentValue The property's current value/
    * @param {any} changeValue The value specified in the effect change data.
    * @returns
    */
   _applyEffectChange(mode, currentValue, changeValue) {
      const value = Number(changeValue) || 0;
      switch (mode) {
         case CONST.ACTIVE_EFFECT_MODES.ADD:
            return (currentValue || 0) + value;
         case CONST.ACTIVE_EFFECT_MODES.MULTIPLY:
            return (currentValue || 1) * value;
         case CONST.ACTIVE_EFFECT_MODES.OVERRIDE:
            return value;
         case CONST.ACTIVE_EFFECT_MODES.DOWNGRADE:
            return Math.min(currentValue || Infinity, value); // Set to the lower value
         case CONST.ACTIVE_EFFECT_MODES.UPGRADE:
            return Math.max(currentValue || -Infinity, value); // Set to the higher value
         default:
            console.warn(`Unsupported Active Effect mode: ${mode}`);
            return currentValue;
      }
   }

   /**
    * Determines if a roll on an item should show a success/fail result message.
    * @protected
    * @param {any} event
    * @returns True if the results should be shown, otherwise false.
    */
   _getShowResult(event) {
      let result = this.system.showResult ?? true;
      const shiftKey = event?.originalEvent?.shiftKey ?? false;
      if (game.user.isGM === true) {
         result = shiftKey === false && result === true;
      }
      return result;
   }

   /**
    * Some items may have charges and quantity uses both. if the item has the charges property then
    * charges are used, otherwise quantity is used.
    * @param {any} getOnly If true, does not use, just gets.
    * @param {any} actionItem The item that owns this item, or null.
    */
   async _tryUseChargeThenUsage(getOnly = false, actionItem) {
      let result = false;
      let item = actionItem || this;
      if (item.system.charges !== undefined) {
         result = await this._tryUseCharge(getOnly, actionItem);
      } else {
         result = await this._tryUseUsage(getOnly, actionItem);
      }
      return result;
   }

   /**
    * Determines if any charges are available and if so decrements charges by one
    * @private
    * @param {any} getOnly If true, does not use, just gets.
    * @param {object} actionItem The item that owns this item, or null.
    * @returns True if quantity is above zero.
    */
   async _tryUseCharge(getOnly = false, actionItem) {
      let item = actionItem || this;
      let hasCharge = item.system.charges > 0;

      if (getOnly !== true) {
         // Deduct 1 if not infinite and not zero
         if (hasCharge === true && item.system.chargesMax !== null) {
            const newCharges = Math.max(0, item.system.charges - 1);
            await item.update({ "system.charges": newCharges });
         }
      }
      // If there are no charges remaining, show a UI notification
      if (hasCharge === false) {
         const message = game.i18n.format('FADE.notification.zeroQuantity', { itemName: item.name });
         ui.notifications.warn(message);
         ChatMessage.create({ content: message, speaker: { alias: item.actor.name, } });
      }

      return hasCharge;
   }

   /**
    * Determines if any uses are available and if so decrements quantity by one
    * @private
    * @param {any} getOnly If true, does not use, just gets.
    * @param {object} actionItem The item that owns this item, or null.
    * @returns True if quantity is above zero.
    */
   async _tryUseUsage(getOnly = false, actionItem) {
      let item = actionItem || this;
      let hasUse = item.system.quantity > 0;

      if (getOnly === false) {
         // Deduct 1 if not infinite and not zero
         if (hasUse === true && item.system.quantityMax !== null) {
            const newQuantity = Math.max(0, item.system.quantity - 1);
            await item.update({ "system.quantity": newQuantity });
         }
      }
      // If there are no usages remaining, show a UI notification
      if (hasUse === false) {
         const message = game.i18n.format('FADE.notification.zeroQuantity', { itemName: item.name });
         ui.notifications.warn(message);
         ChatMessage.create({ content: message, speaker: { alias: item.actor.name } });
      }

      return hasUse;
   }
}