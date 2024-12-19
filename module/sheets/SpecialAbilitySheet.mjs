import { EffectManager } from '../sys/EffectManager.mjs';

/**
 * Sheet class for SpecialAbilityItem.
 */
export class SpecialAbilitySheet extends ItemSheet {
   /**
    * Get the default options for the SpecialAbilitylItem sheet.
    */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         classes: ['fantastic-depths', 'sheet', 'item'],
         template: "systems/fantastic-depths/templates/item/SpecialAbilitySheet.hbs",
         width: 540,
         height: 360,
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

   /** @override */
   get isEditable() {
      // Allow editing only for GM users
      return game.user.isGM;
   }

   /**
    * Prepare data to be used in the Handlebars template.
    */
   async getData(options) {
      const context = super.getData(options);
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

      // Damage types
      const dmgTypes = []
      dmgTypes.push({ value: "", text: game.i18n.localize(`FADE.none`) });
      dmgTypes.push(...CONFIG.FADE.DamageTypes.map((type) => {
         return { value: type, text: game.i18n.localize(`FADE.DamageTypes.types.${type}`) }
      }));
      context.damageTypes = dmgTypes;
      // Saving throws
      const saves = [];
      saves.push({ value: "", text: game.i18n.localize(`FADE.none`) });
      saves.push(...CONFIG.FADE.SavingThrows.map((save) => {
         return { value: save, text: game.i18n.localize(`FADE.Actor.Saves.${save}.abbr`) }
      }));
      context.savingThrows = saves;
      // Prepare roll modes select options
      context.rollModes = Object.entries(CONFIG.Dice.rollModes).reduce((acc, [key, value]) => {
         acc[key] = game.i18n.localize(value);
         return acc;
      }, {});
      // Prepare operators
      context.operators = Object.entries(CONFIG.FADE.Operators).reduce((acc, [key, value]) => {
         acc[key] = value;
         return acc;
      }, {});
      // Ability score types
      context.abilities = [];
      context.abilities.push({ value: "", text: game.i18n.localize(`FADE.none`) });
      context.abilities.push(...CONFIG.FADE.Abilities.map((key) => {
         return { value: key, text: game.i18n.localize(`FADE.Actor.Abilities.${key}.long`) }
      }));

      return context;
   }
}
