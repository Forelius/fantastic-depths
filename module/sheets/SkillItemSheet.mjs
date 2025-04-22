import { EffectManager } from '../sys/EffectManager.mjs';
import { FDItemSheetV2 } from './FDItemSheetV2.mjs';
/**
 * Sheet class for SkillItem.
 */
export class SkillItemSheet extends FDItemSheetV2 {
   /**
   * Get the default options for the sheet.
   */
   static DEFAULT_OPTIONS = {
      position: {
         width: 580,
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
         template: "systems/fantastic-depths/templates/item/skill/header.hbs",
      },
      tabnav: {
         template: "templates/generic/tab-navigation.hbs",
      },
      description: {
         template: "systems/fantastic-depths/templates/item/shared/description.hbs",
      },
      attributes: {
         template: "systems/fantastic-depths/templates/item/skill/attributes.hbs",
      },
      effects: {
         template: "systems/fantastic-depths/templates/item/shared/effects.hbs",
      }
   }

   /** @override */
   tabGroups = {
      primary: "description"
   }

   /** @override */
   _configureRenderOptions(options) {
      // This fills in `options.parts` with an array of ALL part keys by default
      // So we need to call `super` first
      super._configureRenderOptions(options);
      // Completely overriding the parts
      options.parts = ['header', 'tabnav', 'description', 'attributes']

      if (game.user.isGM) {
         options.parts.push('effects');
      }
   }

   /**
    * Prepare data to be used in the Handlebars template.
    */
   async _prepareContext(options) {
      const context = await super._prepareContext(options);

      // Prepare roll modes select options
      context.rollModes = Object.entries(CONFIG.Dice.rollModes).reduce((acc, [key, value]) => {
         acc[key] = game.i18n.localize(value.label ?? value);
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

      // Prepare the tabs.
      context.tabs = this.#getTabs();

      // Prepare active effects for easier access
      context.effects = EffectManager.prepareActiveEffectCategories(this.item.effects);

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
         description: { id: 'description', group, label: 'FADE.tabs.description', cssClass: 'item' },
         attributes: { id: 'attributes', group, label: 'FADE.tabs.attributes', cssClass: 'item' }
      }
      if (game.user.isGM) {
         tabs.effects = { id: 'effects', group, label: 'FADE.tabs.effects', cssClass: 'item' };
      }
      for (const v of Object.values(tabs)) {
         v.active = this.tabGroups[v.group] === v.id;
         v.cssClass = v.active ? "active" : "";
      }
      return tabs;
   }
}
