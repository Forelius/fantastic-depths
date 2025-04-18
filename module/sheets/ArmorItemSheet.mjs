import { EffectManager } from '../sys/EffectManager.mjs';
import { fadeItemSheet } from './fadeItemSheet.mjs';

/**
 * Sheet class for ArmorItem.
 */
export class ArmorItemSheet extends fadeItemSheet {
   /**
    * Get the default options for the MasteryDefinitionItem sheet.
    */
   static DEFAULT_OPTIONS = {
      position: {
         width: 540,
         height: 340,
      },
      window: {
         resizable: true,
         minimizable: false
      },
      classes: ['fantastic-depths', 'sheet', 'item'],
      form: {
         submitOnChange: true
      },
      tabs: [
         {
            navSelector: '.sheet-tabs',
            contentSelector: '.sheet-body',
            initial: 'description'
         },
      ],
   }

   static PARTS = {
      header: {
         template: "systems/fantastic-depths/templates/item/armor/header.hbs",
      },
      tabnav: {
         template: "templates/generic/tab-navigation.hbs"
      },
      body: {
         template: "systems/fantastic-depths/templates/item/armor/body.hbs",
      }
   }

   /**
    * Prepare data to be used in the Handlebars template.
    */
   async _prepareContext(options) {
      const context = await super._prepareContext(options);

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
