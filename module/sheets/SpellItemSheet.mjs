import { EffectManager } from '../sys/EffectManager.mjs';
import { FDItemSheetV2 } from './FDItemSheetV2.mjs';
import { fadeFinder } from '/systems/fantastic-depths/module/utils/finder.mjs';

/**
 * Sheet class for SpellItem.
 */
export class SpellItemSheet extends FDItemSheetV2 {
   /**
   * Get the default options for the sheet.
   */
   static DEFAULT_OPTIONS = {
      position: {
         width: 570,
         height: 'auto',
      },
      window: {
         resizable: true,
         minimizable: false,
         contentClasses: ["scroll-body"]
      },
      classes: ['fantastic-depths', 'sheet', 'item'],
      form: {
         submitOnChange: true
      }
   }

   static PARTS = {
      header: {
         template: "systems/fantastic-depths/templates/item/spell/header.hbs",
      },
      tabnav: {
         template: "templates/generic/tab-navigation.hbs",
      },
      description: {
         template: "systems/fantastic-depths/templates/item/shared/description.hbs",
      },
      attributes: {
         template: "systems/fantastic-depths/templates/item/spell/attributes.hbs",
      },
      effects: {
         template: "systems/fantastic-depths/templates/item/shared/effects.hbs",
      }
   }

   /** @override */
   tabGroups = {
      primary: "description"
   }

   /**
    * Prepare data to be used in the Handlebars template.
    */
   async _prepareContext(options) {
      const context = await super._prepareContext(options);

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

      context.tabs = this.#getTabs();

      return context;
   }

   /**
   * Prepare an array of form header tabs.
   * @returns {Record<string, Partial<ApplicationTab>>}
   */
   #getTabs() {
      const group = 'primary';
      // Default tab for first time it's rendered this session
      if (!this.tabGroups[group]) this.tabGroups[group] = 'description';
      const tabs = {
         description: { id: 'description', group, label: 'FADE.tabs.description' }
      }
      if (game.user.isGM) {
         tabs.attributes = { id: 'attributes', group, label: 'FADE.tabs.attributes' };
         tabs.effects = { id: 'effects', group, label: 'FADE.tabs.effects' };
      }
      for (const tab of Object.values(tabs)) {
         tab.active = this.tabGroups[tab.group] === tab.id;
         tab.cssClass = tab.active ? "active" : "";
      }
      return tabs;
   }
}
