import { EffectManager } from '../sys/EffectManager.mjs';
/**
 * Sheet class for ActorMasteryItem.
 */
export class ActorMasterySheet extends ItemSheet {
   /**
    * Get the default options for the ActorMasteryItem sheet.
    */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         classes: ['fantastic-depths', 'sheet', 'item'],
         template: "systems/fantastic-depths/templates/item/ActorMasterySheet.hbs",
         width:540,
         height: 240,
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
      const itemData = context.data;
      // Enrich description info for display
      // Enrichment turns text like `[[/r 1d20]]` into buttons
      context.enrichedDescription = await TextEditor.enrichHTML(
         this.item.system.description,
         {
            // Whether to show secret blocks in the finished html
            secrets: this.document.isOwner,
            // Necessary in v11, can be removed in v12
            async: true,
            // Data to fill in for inline rolls
            rollData: this.item.getRollData(),
            // Relative UUID resolution
            relativeTo: this.item,
         }
      );
      context.system = itemData.system;
      context.config = CONFIG.FADE;
      context.isGM = game.user.isGM;

      // Weapon types
      const types = [];
      types.push({ value: null, text: game.i18n.localize('None') });
      types.push(...CONFIG.FADE.WeaponTypes.map((type) => {
         return { value: type, text: game.i18n.localize(`FADE.Mastery.weaponTypes.${type}.long`) }
      }));
      context.weaponTypes = types.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});
      // Mastery types
      context.masteryLevels = [...CONFIG.FADE.MasteryLevels.map((key) => {
         return { value: key, text: game.i18n.localize(`FADE.Mastery.levels.${key}`) }
      })].reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});

      // Prepare active effects for easier access
      context.effects = EffectManager.prepareActiveEffectCategories(this.item.effects);

      return context;
   }
}
