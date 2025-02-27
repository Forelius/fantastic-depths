import { EffectManager } from '../sys/EffectManager.mjs';
import { fadeItemSheet } from './fadeItemSheet.mjs'; 

/**
 * Sheet class for ArmorItem.
 */
export class ArmorItemSheet extends fadeItemSheet {
   /**
    * Get the default options for the MasteryDefinitionItem sheet.
    */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         classes: ['fantastic-depths', 'sheet', 'item'],
         template: "systems/fantastic-depths/templates/item/ArmorItemSheet.hbs",
         width: 540,
         height: 340,
         resizable: true,
         tabs: [
            {
               navSelector: '.sheet-tabs',
               contentSelector: '.sheet-body',
               initial: 'attributes',
            },
         ],
      });
   }

   /**
    * Prepare data to be used in the Handlebars template.
    */
   async getData(options) {
      const context = await super.getData(options);
     
      context.isBasicEnc = game.settings.get(game.system.id, "encumbrance") === "basic";
      if (context.isBasicEnc === true) {
         let encOptions = [];
         encOptions.push({ text: game.i18n.localize('FADE.none'), value: "none" });
         encOptions.push({ text: game.i18n.localize('FADE.Armor.armorWeight.choices.light'), value: "light" });
         encOptions.push({ text: game.i18n.localize('FADE.Armor.armorWeight.choices.heavy'), value: "heavy" });
         context.encOptions = encOptions;
      }

      // Prepare active effects for easier access
      context.effects = EffectManager.prepareActiveEffectCategories(this.item.effects);

      return context;
   }
}
