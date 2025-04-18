const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;
import { EffectManager } from '../sys/EffectManager.mjs';
/**
 * Sheet class for ActorMasteryItem.
 */
export class ActorMasterySheet extends HandlebarsApplicationMixin(ItemSheetV2) {
   /**
    * Get the default options for the ActorMasteryItem sheet.
    */
   static DEFAULT_OPTIONS = {
      window: {
         resizable: true,
         minimizable: false
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
         template: "systems/fantastic-depths/templates/item/ActorMasterySheet.hbs"
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

      // Weapon types
      const types = [];
      types.push({ value: null, text: game.i18n.localize('None') });
      types.push(...CONFIG.FADE.WeaponTypes.map((type) => {
         return { value: type, text: game.i18n.localize(`FADE.Mastery.weaponTypes.${type}.long`) }
      }));
      types.push({ value: "wr", text: game.i18n.localize('FADE.Mastery.weaponTypes.wr.long') });
      context.weaponTypes = types.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});

      // Mastery types
      context.masteryLevels = [...CONFIG.FADE.MasteryLevels.map((key) => {
         return { value: key, text: game.i18n.localize(`FADE.Mastery.levels.${key}`) }
      })].reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});

      return context;
   }
}
