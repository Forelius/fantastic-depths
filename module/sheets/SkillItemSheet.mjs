import { fadeItemSheet } from './fadeItemSheet.mjs'; 
/**
 * Sheet class for SkillItem.
 */
export class SkillItemSheet extends fadeItemSheet {
   /**
    * Get the default options for the SkillItem sheet.
    */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         classes: ['fantastic-depths', 'sheet', 'item'],
         template: "systems/fantastic-depths/templates/item/SkillItemSheet.hbs",
         width: 540,
         height: 360,
         resizable: true,
         tabs: [
            {
               navSelector: '.sheet-tabs',
               contentSelector: '.sheet-body',
               initial: 'description'
            },
         ],
      });
   }

   /**
    * Prepare data to be used in the Handlebars template.
    */
   async getData(options) {
      const context = await super.getData(options);

      // Prepare roll modes select options
      context.rollModes = Object.entries(CONFIG.Dice.rollModes).reduce((acc, [key, value]) => {
         acc[key] = game.i18n.localize(value);
         return acc;
      }, {});
      // Abilities
      const abilities = [];
      abilities.push(...CONFIG.FADE.Abilities.map((key) => {
         return { value: key, text: game.i18n.localize(`FADE.Actor.Abilities.${key}.long`) }
      }));
      context.abilities = abilities.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});
      // Prepare operators
      context.operators = Object.entries(CONFIG.FADE.Operators).reduce((acc, [key, value]) => {
         acc[key] = value;
         return acc;
      }, {});

      return context;
   }
}
