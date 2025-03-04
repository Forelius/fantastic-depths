import { fadeActorSheet } from './fadeActorSheet.mjs';

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class CharacterSheet2 extends fadeActorSheet {
   /** @override */
   static get defaultOptions() {
      const path = 'systems/fantastic-depths/templates/actor';
      return foundry.utils.mergeObject(super.defaultOptions, {
         classes: ['fantastic-depths', 'sheet', 'actor'],
         template: `${path}/CharacterSheet2.hbs`,
         width: 650,
         height: 540,
         tabs: [
            {
               navSelector: '.sheet-tabs',
               contentSelector: '.sheet-body',
               initial: 'abilities'
            },
         ],
      });
   }

   /** @override */
   async getData() {
      // Retrieve the data structure from the base sheet. You can inspect or log
      // the context variable to see the structure, but some key properties for
      // sheets are the actor object, the data object, whether or not it's
      // editable, the items array, and the effects array.
      const context = await super.getData();
      const equippedWeapons = [];
      // Iterate through items, allocating to arrays
      for (let item of context.items) {
         item.img = item.img || Item.DEFAULT_ICON;
         if (item.type === 'weapon' && item.system.equipped === true) {
            equippedWeapons.push(item);
         }
      }
      context.equippedWeapons = equippedWeapons;
      return context;
   }
}