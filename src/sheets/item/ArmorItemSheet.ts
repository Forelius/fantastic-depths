import { EffectManager } from "../../sys/EffectManager.js";
import { FDItemSheetV2 } from "./FDItemSheetV2.js";
import { SheetTab } from "../SheetTab.js";
import { DragDropMixin } from "../mixins/DragDropMixin.js";
import { ConditionSheetService } from "./ConditionSheetService.js";
import { SpecialAbilitySheetService } from "./SpecialAbilitySheetService.js";
import { SpellSheetService } from "./SpellSheetService.js";

/**
 * Sheet class for ArmorItem.
 */
export class ArmorItemSheet extends DragDropMixin(FDItemSheetV2) {
   conditionService: ConditionSheetService;
   specialAbilityService: SpecialAbilitySheetService;
   spellService: SpellSheetService;

   /** Base configuration: the part that never comes from a service */
   private static readonly BASE = {
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

   /** All services */
   private static readonly SERVICES = [
      ConditionSheetService.DEFAULT_OPTIONS,
      SpecialAbilitySheetService.DEFAULT_OPTIONS,
      SpellSheetService.DEFAULT_OPTIONS
   ];

   /** Merge everything: one line for the final value */
   static DEFAULT_OPTIONS = ArmorItemSheet.SERVICES.reduce((acc, opts) =>
      foundry.utils.mergeObject(acc, opts, { recursive: true, insertKeys: true, insertValues: true, overwrite: true, inplace: false }),
      { ...ArmorItemSheet.BASE } // start with a shallow copy of the base
   );

   static PARTS = {
      header: {
         template: "systems/fantastic-depths/templates/item/armor/header.hbs",
      },
      tabnav: {
         template: "templates/generic/tab-navigation.hbs",
      },
      description: {
         template: "systems/fantastic-depths/templates/item/shared/description.hbs",
      },
      attributes: {
         template: "systems/fantastic-depths/templates/item/armor/attributes.hbs",
      },
      specialAbilities: {
         template: "systems/fantastic-depths/templates/item/shared/specAbilitiesAndSpells.hbs",
      },
      effects: {
         template: "systems/fantastic-depths/templates/item/shared/effects.hbs",
      },
      gmOnly: {
         template: "systems/fantastic-depths/templates/item/armor/gmOnly.hbs",
      }
   }

   /** @override */
   tabGroups = {
      primary: "description"
   }
   constructor(options = {}) {
      super(options);
      this.conditionService = new ConditionSheetService();
      this.specialAbilityService = new SpecialAbilitySheetService();
      this.spellService = new SpellSheetService();
   }

   /** @override */
   _configureRenderOptions(options) {
      // This fills in `options.parts` with an array of ALL part keys by default
      // So we need to call `super` first
      super._configureRenderOptions(options);
      // Completely overriding the parts
      options.parts = ["header", "tabnav", "description"]

      if (game.user.isGM) {
         options.parts.push("attributes");
         options.parts.push("specialAbilities");
         options.parts.push("effects");
         options.parts.push("gmOnly");
      }
   }

   /**
    * Prepare data to be used in the Handlebars template.
    */
   async _prepareContext(options) {
      const context = await super._prepareContext(options);

      context.isBasicEnc = game.settings.get(game.system.id, "encumbrance") === "basic";
      if (context.isBasicEnc === true) {
         const encOptions = [];
         encOptions.push({ text: game.i18n.localize("FADE.none"), value: "none" });
         encOptions.push({ text: game.i18n.localize("FADE.Armor.armorWeight.choices.light"), value: "light" });
         encOptions.push({ text: game.i18n.localize("FADE.Armor.armorWeight.choices.heavy"), value: "heavy" });
         context.encOptions = encOptions;
      }

      // Ability actions
      context.actions = this._getActionOptions();

      // Prepare the tabs.
      context.tabs = this.#getTabs();

      // Prepare active effects for easier access
      context.effects = EffectManager.prepareActiveEffectCategories(this.item.effects);

      return context;
   }

   async _onDrop(event) {
      if (!this.item.isOwner) return false;
      const TextEditorImpl = foundry?.applications?.ux?.TextEditor?.implementation ?? TextEditor;
      const data = TextEditorImpl.getDragEventData(event);
      const droppedItem = await Item.implementation.fromDropData(data);
      // If the dropped item is a spell item...
      if (droppedItem?.type === "spell") {
         await this.spellService.onDropSpellItem(this.item, droppedItem);
      } else if (droppedItem?.type === "specialAbility") {
         await this.specialAbilityService.onDropSpecialAbilityItem(this.item, droppedItem);
      } else if (droppedItem?.type === "condition") {
         await this.conditionService.onDropConditionItem(this.item, droppedItem);
      }
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
         tabs.specialAbilities = new SheetTab("specialAbilities", group, "FADE.SpecialAbility.plural");
         tabs.effects = new SheetTab("effects", group, "FADE.tabs.effects", "item");
         tabs.gmOnly = new SheetTab("gmOnly", group, "FADE.tabs.gmOnly", "item");
      }

      for (const v of Object.values(tabs) as SheetTab[]) {
         v.active = this.tabGroups[v.group] === v.id;
         v.cssClass = v.active ? "active" : "";
      }
      return tabs;
   }
}