import { EffectManager } from '../sys/EffectManager.mjs';

/**
 * Sheet class for WeaponItem.
 */
export class WeaponItemSheet extends ItemSheet {
   /**
    * Get the default options for the WeaponItem sheet.
    */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         classes: ['fantastic-depths', 'sheet', 'item'],
         template: "systems/fantastic-depths/templates/item/WeaponItemSheet.hbs",
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
      context.usesAmmo = itemData.system.ammoType?.length > 0;
      // Prepare active effects for easier access
      context.effects = EffectManager.prepareActiveEffectCategories(this.item.effects);

      //context.showAttributes = this.item.system.canRanged || game.user.isGM;

      // Weapon types
      let weaponTypes = null;
      weaponTypes = [];
      weaponTypes.push({ text: game.i18n.localize('FADE.Mastery.weaponTypes.monster.long'), value: 'monster' });
      weaponTypes.push({ text: game.i18n.localize('FADE.Mastery.weaponTypes.handheld.long'), value: 'handheld' });
      weaponTypes.push({ text: game.i18n.localize('FADE.Mastery.weaponTypes.all.long'), value: 'all' });
      context.weaponTypes = weaponTypes.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});

      let damageTypes = [];
      damageTypes.push({ text: game.i18n.localize('FADE.DamageTypes.types.physical'), value: 'physical' });
      damageTypes.push({ text: game.i18n.localize('FADE.DamageTypes.types.breath'), value: 'breath' });
      damageTypes.push({ text: game.i18n.localize('FADE.DamageTypes.types.fire'), value: 'fire' });
      damageTypes.push({ text: game.i18n.localize('FADE.DamageTypes.types.frost'), value: 'frost' });
      damageTypes.push({ text: game.i18n.localize('FADE.DamageTypes.types.poison'), value: 'poison' });
      context.damageTypes = damageTypes.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});
      // TODO: Magic damage type  indicates that a different set of parameters is passed to getDamageRoll.
      // This is not a good design, but not addressing it at the moment, so remove this option.
      //context.damageTypes.push({ text: game.i18n.localize('FADE.DamageTypes.types.magic'), value: 'magic' });

      // Saving throws
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
         html.on('click', '.effect-control', (ev) =>
            EffectManager.onManageActiveEffect(ev, this.item)
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
