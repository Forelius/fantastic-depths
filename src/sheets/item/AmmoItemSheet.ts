import { FDItemSheetV2 } from "./FDItemSheetV2.js";
import { SheetTab } from "../SheetTab.js";
import { VsGroupModMixin } from "../mixins/VsGroupModMixin.js";
import { fadeFinder } from "../../utils/finder.js";

/**
 * Sheet class for AmmoItem.
 */
export class AmmoItemSheet extends VsGroupModMixin(FDItemSheetV2) {
   /**
   * Get the default options for the sheet.
   */
   static DEFAULT_OPTIONS = {
      position: {
         width: 570,
         height: 400,
      },
      window: {
         resizable: true,
         minimizable: false,
         contentClasses: ["scroll-body"]
      },
      classes: ["fantastic-depths", "sheet", "item"],
      form: {
         submitOnChange: true
      }
   };

   static PARTS = {
      header: {
         template: "systems/fantastic-depths/templates/item/ammo/header.hbs",
      },
      tabnav: {
         template: "templates/generic/tab-navigation.hbs",
      },
      description: {
         template: "systems/fantastic-depths/templates/item/shared/description.hbs",
      },
      attributes: {
         template: "systems/fantastic-depths/templates/item/ammo/attributes.hbs",
      },
      gmOnly: {
         template: "systems/fantastic-depths/templates/item/ammo/gmOnly.hbs",
      }
   };

   /** @override */
   tabGroups = {
      primary: "description"
   };

   /** @override */
   _configureRenderOptions(options) {
      // This fills in `options.parts` with an array of ALL part keys by default
      // So we need to call `super` first
      super._configureRenderOptions(options);
      // Completely overriding the parts
      options.parts = ["header", "tabnav", "description"]

      if (game.user.isGM) {
         options.parts.push("attributes");
         //options.parts.push("effects");
         options.parts.push("gmOnly");
      }
   }

   /**
   * Prepare data to be used in the Handlebars template.
   */
   async _prepareContext(options) {
      const context = await super._prepareContext(options);

      // Damage types
      const damageTypes = []
      damageTypes.push({ value: "", text: game.i18n.localize("None") });
      damageTypes.push(...CONFIG.FADE.DamageTypes.map((type) => {
         return { value: type, text: game.i18n.localize(`FADE.DamageTypes.types.${type}`) }
      }));
      context.damageTypes = damageTypes.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});
      // Saving throws
      const saves = [];
      saves.push({ value: "", text: game.i18n.localize("None") });
      const saveItems = (await fadeFinder.getSavingThrows())?.sort((a, b) => a.system.shortName.localeCompare(b.system.shortName)) ?? [];
      saves.push(...saveItems.map((save) => {
         return { value: save.system.customSaveCode, text: save.system.shortName }
      }));
      context.savingThrows = saves.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});

      // Prepare the tabs.
      context.tabs = this.#getTabs();

      return context;
   }

   /**
   * Prepare an array of form header tabs.
   * @returns {Record<string, SheetTab>}
   */
   #getTabs(): Record<string, SheetTab> {
      const group = "primary";
      // Default tab for first time it's rendered this session
      if (!this.tabGroups[group]) this.tabGroups[group] = "description";
      const tabs: Record<string, SheetTab> = {
         description: new SheetTab("description", group, "FADE.tabs.description", "item")
      };
      if (game.user.isGM) {
         tabs.attributes = new SheetTab("attributes", group, "FADE.tabs.attributes", "item");
         tabs.gmOnly = new SheetTab("gmOnly", group, "FADE.tabs.gmOnly", "item");
      }
      for (const v of Object.values(tabs) as SheetTab[]) {
         v.active = this.tabGroups[v.group] === v.id;
         v.cssClass = v.active ? "active" : "";
      }
      return tabs;
   }
}