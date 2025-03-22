import { EffectManager } from '../sys/EffectManager.mjs';
import { fadeItemSheet } from './fadeItemSheet.mjs';
import { fadeFinder } from '/systems/fantastic-depths/module/utils/finder.mjs';

export class GearItemSheet extends fadeItemSheet {
   /** @override */
   static get defaultOptions() {
      const path = 'systems/fantastic-depths/templates/item';
      return foundry.utils.mergeObject(super.defaultOptions, {
         classes: ['fantastic-depths', 'sheet', 'item'],
         template: `${path}/GearItemSheet.hbs`,
         width: 520,
         height: 320,
         tabs: [
            {
               navSelector: '.sheet-tabs',
               contentSelector: '.sheet-body',
               initial: 'description',
            },
         ],
      });
   }

   /* -------------------------------------------- */
   /** @override */
   async getData() {
      // Retrieve base data structure.
      const context = await super.getData();
      const turnDuration = game.settings.get(game.system.id, "turnDurationSec") ?? 10 * 60;
      if (this.item.type === 'light') {
         const lightTypes = [];
         //lightTypes.push({ value: null, text: game.i18n.localize('None') });
         lightTypes.push(...CONFIG.FADE.LightTypes.map((type) => {
            return { value: type, text: game.i18n.localize(`FADE.Item.light.lightTypes.${type}`) }
         }));
         context.lightTypes = lightTypes.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});
         context.animationTypes = CONFIG.Canvas.lightAnimations;
         const lightData = this.item.system.light;
         context.isCustom = lightData.type === 'custom';
         const turnsRemaining = (lightData.secondsRemain / turnDuration);
         const stTurnsRemaining = (lightData.secondsRemain > 0 || this.item.system.light.enabled) ? (turnsRemaining).toFixed(1) : '-';
         context.turnsRemaining = `${stTurnsRemaining}`;
      }

      // Damage types
      const damageTypes = []
      damageTypes.push({ value: "", text: game.i18n.localize('None') });
      damageTypes.push(...CONFIG.FADE.DamageTypes.map((type) => {
         return { value: type, text: game.i18n.localize(`FADE.DamageTypes.types.${type}`) }
      }));
      context.damageTypes = damageTypes.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});
      // Saving throws
      const saves = [];
      saves.push({ value: "", text: game.i18n.localize('None') });
      const saveItems = (await fadeFinder.getSavingThrows())?.sort((a, b) => a.system.shortName.localeCompare(b.system.shortName));
      saves.push(...saveItems.map((save) => {
         return { value: save.system.customSaveCode, text: save.system.shortName }
      }));
      context.savingThrows = saves.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});

      // Prepare active effects for easier access
      context.effects = EffectManager.prepareActiveEffectCategories(this.item.effects);

      return context;
   }
}