import { fadeItemSheet } from "./fadeItemSheet.mjs";

/**
 * Sheet class for WeaponMasteryItem.
 */
export class WeaponMasterySheet extends ItemSheet {
   /**
    * Get the default options for the WeaponMasteryItem sheet.
    */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         classes: ["fantastic-depths", "item", "weapon-mastery-item"],
         template: "systems/fantastic-depths/templates/item/weapon-mastery-sheet.hbs",
         width: 400,
         height: 400,
         resizable: true
      });
   }

   ///** @override */
   //get template() {
   //   const path = 'systems/fantastic-depths/templates/item';
   //   return `${path}/weapon-mastery-sheet.hbs`;
   //}

   /**
    * Prepare data to be used in the Handlebars template.
    */
   getData(options) {
      const context = super.getData(options);
      const itemData = context.data;

      context.system = itemData.system;
      context.config = CONFIG.FADE;
      context.isGM = game.user.isGM;

      const types = [];
      types.push({ value: null, text: game.i18n.localize(`FADE.none`) });
      types.push(...CONFIG.FADE.WeaponTypes.map((type) => {
         return { value: type, text: game.i18n.localize(`FADE.Mastery.weaponTypes.${type}.long`) }
      }));
      context.weaponTypes = types;

      return context;
   }
}
