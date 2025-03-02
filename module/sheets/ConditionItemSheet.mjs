import { EffectManager } from '../sys/EffectManager.mjs';
import { fadeItemSheet } from './fadeItemSheet.mjs'; 

/**
 * Sheet class for ConditionItem.
 */
export class ConditionItemSheet extends fadeItemSheet {
   /**
    * Get the default options for the SkillItem sheet.
    */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         classes: ['fantastic-depths', 'sheet', 'item'],
         template: "systems/fantastic-depths/templates/item/ConditionItemSheet.hbs",
         width: 540,
         height: 360,
         resizable: true,
         tabs: [
            {
               navSelector: '.sheet-tabs',
               contentSelector: '.sheet-body',
               initial: 'description'
            },
         ],
      });
   }

   /**
    * Prepare data to be used in the Handlebars template.
    */
   async getData(options) {
      const context = await super.getData(options);
      context.effects = EffectManager.prepareActiveEffectCategories(this.item.effects);
      return context;
   }
}
