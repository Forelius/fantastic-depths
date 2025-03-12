import { EffectManager } from '../sys/EffectManager.mjs';
import { fadeItemSheet } from './fadeItemSheet.mjs';
import { ChatFactory, CHAT_TYPE } from '../chat/ChatFactory.mjs';

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class SpeciesItemSheet extends fadeItemSheet {
   /** @override */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         classes: ['fantastic-depths', 'sheet', 'item'],
         width: 500,
         height: 400,
         tabs: [
            {
               navSelector: '.sheet-tabs',
               contentSelector: '.sheet-body',
               initial: 'description',
            },
         ],
      });
   }

   /** @override */
   get template() {
      const path = 'systems/fantastic-depths/templates/item';
      return `${path}/SpeciesItemSheet.hbs`;
   }

   /** @override */
   async getData() {
      // Retrieve base data structure
      const context = await super.getData();
      const itemData = context.data;
      // Abilities
      context.abilities = [...CONFIG.FADE.Abilities.map((key) => {
         return { value: key, text: game.i18n.localize(`FADE.Actor.Abilities.${key}.long`) }
      })].reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});

      // Prepare active effects for easier access
      context.effects = EffectManager.preparePassiveEffects(this.item.effects);

      return context;
   }

   /** @override
    * We do not call fadeItemSheet activateListeners from this sheet.
    */
   activateListeners(html) {
      super.activateListeners(html);
      // Everything below here is only needed if the sheet is editable
      if (!this.isEditable) return;

      // Everything below here is only needed if the sheet is editable
      // Languages
      html.find('input[data-action="add-language"]').keypress((ev) => {
         if (ev.which === 13) {
            const value = $(ev.currentTarget).val();
            this.object.languageManager.pushTag(value);
         }
      });
      html.find(".language-delete").click((ev) => {
         const value = ev.currentTarget.parentElement.dataset.tag;
         this.object.languageManager.popTag(value);
      });

      // Add Inventory Item
      html.on('click', '.item-create', async (event) => { await this.#onCreateChild(event) });
      // Delete Inventory Item
      html.on('click', '.item-delete', async (event) => { await this.#onDeleteChild(event) });

      html.on('click', '.rollable', this._onRoll.bind(this));
   }

   /**
    * Handle clickable rolls.
    * @param {Event} event   The originating click event
    * @protected
    */
   async _onRoll(event) {
      event.preventDefault();
      event.stopPropagation();

      const elem = event.currentTarget;
      const dataset = elem.dataset;
      let formula = dataset.formula;
      let chatType = CHAT_TYPE.GENERIC_ROLL;;

      const rollContext = { ...this.item.getRollData() };
      const rolled = await new Roll(formula, rollContext).evaluate();
      const chatData = {
         caller: this.item,
         context: this.item,
         mdata: dataset,
         roll: rolled,
      };
      const builder = new ChatFactory(chatType, chatData);
      return builder.createChatMessage();
   }

   /**
   * @override
   * @param {any} event
   * @param {any} data
   * @returns
   */
   async _onDropItem(event, data) {
      const droppedItem = await Item.implementation.fromDropData(data);
      console.debug(droppedItem, event, data)
      // If the dropped item is a weapon mastery definition item...
      if (droppedItem.type === 'specialAbility') {

      }
   }

   /**
   * Handle creating a new child object using initial data defined in the HTML dataset
   * @param {Event} event The originating click event
   * @private
   */
   async #onCreateChild(event) {
      event.preventDefault();
      const header = event.currentTarget;
      const type = header.dataset.type;
      if (type === 'specialAbility') {
         this.item.createSpecialAbility();
      } else if (type === 'class') {
         this.item.createClass();
      }
      this.render();
   }

   async #onDeleteChild(event) {
      event.preventDefault();
      const type = event.currentTarget.dataset.type;
      const index = parseInt(event.currentTarget.dataset.index);

      if (type === 'specialAbility') {
         const items = this.item.system.specialAbilities;
         if (items.length > index) {
            items.splice(index, 1);
            await this.item.update({ "system.specialAbilities": items });
         }
      } else if (type === 'class') {
         const items = this.item.system.classes;
         if (items.length > index) {
            items.splice(index, 1);
            await this.item.update({ "system.classes": items });
         }
      }
      this.render();
   }
}