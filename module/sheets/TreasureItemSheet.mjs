import { EffectManager } from '../sys/EffectManager.mjs';
import { fadeItemSheet } from './fadeItemSheet.mjs';

export class TreasureItemSheet extends fadeItemSheet {
   /** @override */
   static get defaultOptions() {
      const path = 'systems/fantastic-depths/templates/item';
      return foundry.utils.mergeObject(super.defaultOptions, {
         classes: ['fantastic-depths', 'sheet', 'item'],
         template: `${path}/TreasureItemSheet.hbs`,
         width: 520,
         height: 300,
         tabs: [
            {
               navSelector: '.sheet-tabs',
               contentSelector: '.sheet-body',
               initial: 'description',
            },
         ],
      });
   }

   /* -------------------------------------------- */
   /** @override */
   async getData() {
      // Retrieve base data structure.
      const context = await super.getData();
           
      // Prepare active effects for easier access
      context.effects = EffectManager.prepareActiveEffectCategories(this.item.effects);

      return context;
   }
}