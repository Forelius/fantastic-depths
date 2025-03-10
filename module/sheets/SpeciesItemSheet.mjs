import { EffectManager } from '../sys/EffectManager.mjs';
import { fadeItemSheet } from './fadeItemSheet.mjs';

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class SpeciesItemSheet extends fadeItemSheet {
   /** @override */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         classes: ['fantastic-depths', 'sheet', 'item'],
         width: 650,
         height: 480,
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
      context.effects = EffectManager.prepareActiveEffectCategories(this.item.effects);

      return context;
   }

   /** @override */
   activateListeners(html) {
      super.activateListeners(html);

      // Everything below here is only needed if the sheet is editable
      if (!this.isEditable) return;

      // Add Inventory Item
      html.on('click', '.item-create', async (event) => { await this.#onCreateChild(event) });

      // Delete Inventory Item
      html.on('click', '.item-delete', async (event) => { await this.#onDeleteChild(event) });
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
      //if (type === 'classSave') {
      //   this.item.createClassSave();
      //} else if (type === 'primeReq') {
      //   this.item.createPrimeReq();
      //} else if (type === 'classAbility') {
      //   this.item.createClassAbility();
      //}
      this.render();
   }

   async #onDeleteChild(event) {
      event.preventDefault();
      const type = event.currentTarget.dataset.type;
      const index = parseInt(event.currentTarget.dataset.index);

      //if (type === 'classSave') {
      //   const saves = this.item.system.saves;
      //   // Handle deletion of a class save
      //   saves.splice(index, 1);
      //   await this.item.update({ "system.saves": saves });
      //} else if (type === 'primeReq') {
      //   const primeReqs = this.item.system.primeReqs;
      //   if (primeReqs.length > index) {
      //      primeReqs.splice(index, 1);
      //      await this.item.update({ "system.primeReqs": primeReqs });
      //   }
      //} else if (type === 'classAbility') {
      //   const classAbilities = this.item.system.classAbilities;
      //   if (classAbilities.length > index) {
      //      classAbilities.splice(index, 1);
      //      await this.item.update({ "system.classAbilities": classAbilities });
      //   }
      //}
      this.render();
   }
}