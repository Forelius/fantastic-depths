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

      // Prepare active effects for easier access
      context.effects = EffectManager.prepareActiveEffectCategories(this.item.effects);

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
      const saveItems = game.items.filter(item => item.type === 'specialAbility' && item.system.category === 'save')
         .sort((a, b) => a.system.shortName.localeCompare(b.system.shortName));
      saves.push(...saveItems.map((save) => {
         return { value: save.system.customSaveCode, text: save.system.shortName }
      }));
      context.savingThrows = saves.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});
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
      let abilities = [];
      abilities.push({ value: "", text: game.i18n.localize('None') });
      abilities.push(...CONFIG.FADE.Abilities.map((key) => {
         return { value: key, text: game.i18n.localize(`FADE.Actor.Abilities.${key}.long`) }
      }).sort((a, b) => a.text.localeCompare(b.text)));
      context.abilities = abilities.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});
      // Categories
      const categories = []
      categories.push({ value: "", text: game.i18n.localize('None') });
      categories.push(...CONFIG.FADE.SpecialAbilityCategories.map((type) => {
         return { value: type, text: game.i18n.localize(`FADE.SpecialAbility.categories.${type}`) }
      }).sort((a, b) => a.text.localeCompare(b.text)));
      context.categories = categories.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});;
      // Combat Maneuvers
      const combatManeuvers = [];
      combatManeuvers.push({ value: null, text: game.i18n.localize('None') });
      combatManeuvers.push(...Object.entries(CONFIG.FADE.CombatManeuvers)
         .filter(action => action[1].classes?.length > 0)
         .map((action) => {
            return { value: action[0], text: game.i18n.localize(`FADE.combat.maneuvers.${action[0]}.name`) }
         }).sort((a, b) => a.text.localeCompare(b.text)));
      context.combatManeuvers = combatManeuvers.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});;

      return context;
   }

   /** @override */
   activateListeners(html) {
      super.activateListeners(html);

      // Everything below here is only needed if the sheet is editable
      if (this.isEditable) {
         // Active Effect management
         html.on('click', '.effect-control', async (ev) =>
            await EffectManager.onManageActiveEffect(ev, this.item)
         );
         html.find('input[data-action="add-tag"]').keypress((ev) => {
            if (ev.which === 13) {
               const value = $(ev.currentTarget).val();
               this.object.tagManager.pushTag(value);
            }
         });
         html.find(".tag-delete").click((ev) => {
            const value = ev.currentTarget.parentElement.dataset.tag;
            this.object.tagManager.popTag(value);
         });
      }
   }
}
