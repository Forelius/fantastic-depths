/**
 * Sheet class for MasteryDefinitionItem.
 */
export class MasteryDefinitionSheet extends ItemSheet {
   /**
    * Get the default options for the MasteryDefinitionItem sheet.
    */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         classes: ["fantastic-depths", "item", "weapon-mastery-item"],
         template: "systems/fantastic-depths/templates/item/MasteryDefinitionSheet.hbs",
         width: 400,
         height: 400,
         resizable: true
      });
   }

   /**
    * Prepare data to be used in the Handlebars template.
    */
   async getData(options) {
      const context = await super.getData(options);
      const itemData = context.data;

      context.system = itemData.system;
      context.config = CONFIG.FADE;
      context.isGM = game.user.isGM;
      // Weapon types
      const types = [];
      types.push({ value: null, text: game.i18n.localize('None') });
      types.push(...CONFIG.FADE.WeaponTypes.map((type) => {
         return { value: type, text: game.i18n.localize(`FADE.Mastery.weaponTypes.${type}.long`) }
      }));
      types.push({ value: "wr", text: game.i18n.localize('FADE.Actor.Wrestling.abbr') });
      context.weaponTypes = types.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});

      return context;
   }
}
