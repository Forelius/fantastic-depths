import { FDItemSheetV2 } from './FDItemSheetV2.js';

/**
 * Sheet class for MasteryDefinitionItem.
 */
export class MasteryDefinitionSheet extends FDItemSheetV2 {
   /**
 * Get the default options for the sheet.
 */
   static DEFAULT_OPTIONS = {
      window: {
         resizable: true,
         minimizable: false,
         contentClasses: ["scroll-body"]
      },
      classes: ['fantastic-depths', 'sheet', 'item'],
      position: {
         width: 540,
         height: 500
      },
      form: {
         submitOnChange: true
      }
   };

   static PARTS = {
      header: {
         template: "systems/fantastic-depths/templates/item/MasteryDefinitionSheet.hbs"
      }
   }

   /**
    * Prepare data to be used in the Handlebars template.
    */
   async _prepareContext(options) {
      const context = await super._prepareContext(options);

      context.item = this.item;
      context.system = this.item.system;
      context.config = CONFIG.FADE;
      context.isGM = game.user.isGM;

      // Weapon types
      const types = [];
      types.push({ value: null, text: game.i18n.localize('None') });
      types.push(...CONFIG.FADE.WeaponTypes.map((type) => {
         return { value: type, text: game.i18n.localize(`FADE.Mastery.weaponTypes.${type}.long`) }
      }));
      types.push({ value: "wr", text: game.i18n.localize('FADE.Mastery.weaponTypes.wr.long') });
      context.weaponTypes = types.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});

      return context;
   }
}

