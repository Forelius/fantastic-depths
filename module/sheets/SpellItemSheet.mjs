import { EffectManager } from '../sys/EffectManager.mjs';
import { fadeItemSheet } from './fadeItemSheet.mjs';
import { fadeFinder } from '/systems/fantastic-depths/module/utils/finder.mjs';

/**
 * Sheet class for SpellItem.
 */
export class SpellItemSheet extends fadeItemSheet {
   /**
    * Get the default options for the SpellItem sheet.
    */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         classes: ['fantastic-depths', 'sheet', 'item'],
         template: "systems/fantastic-depths/templates/item/SpellItemSheet.hbs",
         width: 540,
         height: 360,
         resizable: true,
         tabs: [
            {
               navSelector: '.sheet-tabs',
               contentSelector: '.sheet-body',
               initial: 'description',
            },
         ],
      });
   }

   /**
    * Prepare data to be used in the Handlebars template.
    */
   async getData(options) {
      const context = await super.getData(options);

      // Prepare active effects for easier access
      context.effects = EffectManager.prepareActiveEffectCategories(this.item.effects);

      // Attack types
      const attackTypes = []
      attackTypes.push({ value: "", text: game.i18n.localize('None') });
      attackTypes.push(...CONFIG.FADE.AttackTypes.map((type) => {
         return { value: type, text: game.i18n.localize(`FADE.AttackTypes.types.${type}`) }
      }));
      context.attackTypes = attackTypes.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});
      // Damage types
      const dmgTypes = []
      dmgTypes.push({ value: "", text: game.i18n.localize('None') });
      dmgTypes.push(...CONFIG.FADE.DamageTypes.map((type) => {
         return { value: type, text: game.i18n.localize(`FADE.DamageTypes.types.${type}`) }
      }));
      context.damageTypes = dmgTypes.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});
      //Saving throws
      const saves = [];
      saves.push({ value: "", text: game.i18n.localize('None') });
      const saveItems = (await fadeFinder.getSavingThrows())?.sort((a, b) => a.system.shortName.localeCompare(b.system.shortName)) ?? [];
      saves.push(...saveItems.map((save) => {
         return { value: save.system.customSaveCode, text: save.system.shortName }
      }));
      context.savingThrows = saves.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});

      return context;
   }
}
