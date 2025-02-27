import { EffectManager } from '../sys/EffectManager.mjs';

/**
 * Sheet class for SpellItem.
 */
export class SpellItemSheet extends ItemSheet {
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
      const saveItems = game.items.filter(item => item.type === 'specialAbility' && item.system.category === 'save')
         .sort((a, b) => a.system.shortName.localeCompare(b.system.shortName));
      saves.push(...saveItems.map((save) => {
         return { value: save.system.customSaveCode, text: save.system.shortName }
      }));
      context.savingThrows = saves.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});

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
         // Tags
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
