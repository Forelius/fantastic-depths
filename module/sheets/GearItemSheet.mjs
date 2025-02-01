import { fadeItemSheet } from './fadeItemSheet.mjs';

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
               initial: 'attributes',
            },
         ],
      });
   }

   /* -------------------------------------------- */
   /** @override */
   async getData() {
      // Retrieve base data structure.
      const context = await super.getData();

      if (this.item.type === 'light') {
         const lightTypes = [];
         //lightTypes.push({ value: null, text: game.i18n.localize('None') });
         lightTypes.push(...CONFIG.FADE.LightTypes.map((type) => {
            return { value: type, text: game.i18n.localize(`FADE.Item.light.lightTypes.${type}`) }
         }));
         context.lightTypes = lightTypes.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});
         context.animationTypes = CONFIG.Canvas.lightAnimations;
         context.isCustom = this.item.system.light.type === 'custom';
      }

      return context;
   }
 }