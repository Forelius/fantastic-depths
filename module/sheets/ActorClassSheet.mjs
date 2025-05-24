import { FDItemSheetV2 } from './FDItemSheetV2.mjs';

/**
 * Sheet class for ActorMasteryItem.
 */
export class ActorClassSheet extends FDItemSheetV2 {
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
      },
      form: {
         submitOnChange: true
      }
   };

   static PARTS = {
      header: {
         template: "systems/fantastic-depths/templates/item/ActorClassSheet.hbs"
      }     
   }

   /**
    * Prepare data to be used in the Handlebars template.
    */
   async _prepareContext(options) {
      const context = {};

      context.item = this.item;
      context.system = this.item.system;
      context.config = CONFIG.FADE;
      context.isGM = game.user.isGM;

      return context;
   }
}
