import { fadeFinder } from '/systems/fantastic-depths/module/utils/finder.mjs';
import { EffectManager } from '../sys/EffectManager.mjs';
import { fadeItemSheet } from './fadeItemSheet.mjs';

/**
 * Sheet class for WeaponItem.
 */
export class WeaponItemSheet extends fadeItemSheet {
   /**
   * Get the default options for the MasteryDefinitionItem sheet.
   */
   static DEFAULT_OPTIONS = {
      position: {
         width: 540,
         height: "auto",
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
         template: "systems/fantastic-depths/templates/item/weapon/header.hbs",
      },
      tabnav: {
         template: "templates/generic/tab-navigation.hbs",
      },
      description: {
         template: "systems/fantastic-depths/templates/item/shared/description.hbs",
      },
      attributes: {
         template: "systems/fantastic-depths/templates/item/weapon/attributes.hbs",
      },
      effects: {
         template: "systems/fantastic-depths/templates/item/shared/effects.hbs",
      },
      gmOnly: {
         template: "systems/fantastic-depths/templates/item/weapon/gmOnly.hbs",
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
      options.parts = ['header', 'tabnav', 'description']

      if (game.user.isGM) {
         options.parts.push('attributes');
         options.parts.push('effects');
         options.parts.push('gmOnly');
      }
   }

   /**
    * Prepare data to be used in the Handlebars template.
    */
   async _prepareContext(options) {
      const context = await super._prepareContext(options);
      context.usesAmmo = this.item.system.ammoType?.length > 0;

      // Weapon types
      const weaponTypes = [];
      weaponTypes.push({ text: game.i18n.localize('FADE.Mastery.weaponTypes.monster.long'), value: 'monster' });
      weaponTypes.push({ text: game.i18n.localize('FADE.Mastery.weaponTypes.handheld.long'), value: 'handheld' });
      weaponTypes.push({ text: game.i18n.localize('FADE.Mastery.weaponTypes.all.long'), value: 'all' });
      context.weaponTypes = weaponTypes.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});
      // Damage types
      const damageTypes = [];
      damageTypes.push({ text: game.i18n.localize('FADE.DamageTypes.types.physical'), value: 'physical' });
      damageTypes.push({ text: game.i18n.localize('FADE.DamageTypes.types.breath'), value: 'breath' });
      damageTypes.push({ text: game.i18n.localize('FADE.DamageTypes.types.fire'), value: 'fire' });
      damageTypes.push({ text: game.i18n.localize('FADE.DamageTypes.types.frost'), value: 'frost' });
      damageTypes.push({ text: game.i18n.localize('FADE.DamageTypes.types.poison'), value: 'poison' });
      context.damageTypes = damageTypes.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});
      // TODO: Magic damage type  indicates that a different set of parameters is passed to getDamageRoll.
      // This is not a good design, but not addressing it at the moment, so remove this option.
      //context.damageTypes.push({ text: game.i18n.localize('FADE.DamageTypes.types.magic'), value: 'magic' });
      // Weapon sizes
      const weaponSizes = [];
      weaponSizes.push({ text: game.i18n.localize('FADE.none'), value: null });
      weaponSizes.push({ text: game.i18n.localize('FADE.Actor.sizes.S'), value: 'S' });
      weaponSizes.push({ text: game.i18n.localize('FADE.Actor.sizes.M'), value: 'M' });
      weaponSizes.push({ text: game.i18n.localize('FADE.Actor.sizes.L'), value: 'L' });
      context.weaponSizes = weaponSizes.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});
      // Weapon grips/modes
      const weaponGrips = [];
      weaponGrips.push({ text: game.i18n.localize('FADE.none'), value: null });
      weaponGrips.push({ text: game.i18n.localize('FADE.Weapon.grip.oneAbbr'), value: '1H' });
      weaponGrips.push({ text: game.i18n.localize('FADE.Weapon.grip.twoAbbr'), value: '2H' });
      context.weaponGrips = weaponGrips.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});
      // Saving throws
      const saves = [];
      saves.push({ value: "", text: game.i18n.localize('None') });
      const saveItems = (await fadeFinder.getSavingThrows()).sort((a, b) => a.system.shortName.localeCompare(b.system.shortName));
      saves.push(...saveItems.map((save) => {
         return { value: save.system.customSaveCode, text: save.system.shortName }
      }));
      context.savingThrows = saves.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});

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
      const tabs = {
         description: { id: 'description', group: 'primary', label: 'FADE.tabs.description', cssClass: 'item', active: true }
      }
      if (game.user.isGM) {
         tabs.attributes = { id: 'attributes', group: 'primary', label: 'FADE.tabs.attributes', cssClass: 'item' };
         tabs.effects = { id: 'effects', group: 'primary', label: 'FADE.tabs.effects', cssClass: 'item' };
         tabs.gmOnly = { id: 'gmOnly', group: 'primary', label: 'FADE.tabs.gmOnly', cssClass: 'item' };
      }

      for (const v of Object.values(tabs)) {
         v.active = this.tabGroups[v.group] === v.id;
         v.cssClass = v.active ? "active" : "";
      }
      return tabs;
   }
}
