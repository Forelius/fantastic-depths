import { EffectManager } from "../../sys/EffectManager.js";
import { FDItemSheetV2 } from "./FDItemSheetV2.js";
import { SheetTab } from "../SheetTab.js";
import { DragDropMixin } from "../mixins/DragDropMixin.js";
import { ConditionSheetService } from "./ConditionSheetService.js";
import { SpellSheetService } from "./SpellSheetService.js";
import { SpecialAbilitySheetService } from "./SpecialAbilitySheetService.js";

export class GearItemSheet extends DragDropMixin(FDItemSheetV2) {
   specialAbilityService: SpecialAbilitySheetService;
   conditionService: ConditionSheetService;
   spellService: SpellSheetService;

   /** Base configuration: the part that never comes from a service */
   private static readonly BASE = {
      position: { width: 600, height: 400 },
      window: {
         resizable: true,
         minimizable: false,
         contentClasses: ["scroll-body"]
      },
      classes: ["fantastic-depths", "sheet", "item"],
      form: { submitOnChange: true }
   };

   /** All services */
   private static readonly SERVICES = [
      ConditionSheetService.DEFAULT_OPTIONS,
      SpecialAbilitySheetService.DEFAULT_OPTIONS,
      SpellSheetService.DEFAULT_OPTIONS
   ];

   /** Merge everything: one line for the final value */
   static DEFAULT_OPTIONS = GearItemSheet.SERVICES.reduce((acc, opts) =>
      foundry.utils.mergeObject(acc, opts, { recursive: true, insertKeys: true, insertValues: true, overwrite: true, inplace: false }),
      { ...GearItemSheet.BASE } // start with a shallow copy of the base
   );

   static PARTS = {
      header: {
         template: "systems/fantastic-depths/templates/item/gear/header.hbs",
      },
      tabnav: {
         template: "templates/generic/tab-navigation.hbs",
      },
      description: {
         template: "systems/fantastic-depths/templates/item/shared/description.hbs",
      },
      attributes: {
         template: "systems/fantastic-depths/templates/item/gear/attributes.hbs",
      },
      specialAbilities: {
         template: "systems/fantastic-depths/templates/item/shared/specAbilitiesAndSpells.hbs",
      },
      effects: {
         template: "systems/fantastic-depths/templates/item/shared/conditionswd.hbs",
      },
      gmOnly: {
         template: "systems/fantastic-depths/templates/item/shared/gmOnlyCharge.hbs",
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

      const turnDuration = game.settings.get(game.system.id, "turnDurationSec") ?? 10 * 60;
      if (this.item.type === "light") {
         const lightTypes = [];
         //lightTypes.push({ value: null, text: game.i18n.localize("None") });
         lightTypes.push(...CONFIG.FADE.LightTypes.map((type) => {
            return { value: type, text: game.i18n.localize(`FADE.Item.light.lightTypes.${type}`) }
         }));
         context.lightTypes = lightTypes.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});
         context.animationTypes = CONFIG.Canvas.lightAnimations;
         const lightData = this.item.system.light;
         context.isCustom = lightData.type === "custom";
         const turnsRemaining = (lightData.secondsRemain / turnDuration);
         const stTurnsRemaining = (lightData.secondsRemain > 0 || this.item.system.light.enabled) ? (turnsRemaining).toFixed(1) : "-";
         context.turnsRemaining = `${stTurnsRemaining}`;
      }

      // Ability actions
      context.actions = this._getActionOptions();

      context.hideLevel = true;

      // Prepare the tabs.
      context.tabs = this.#getTabs();

      // Prepare active effects for easier access
      context.effects = EffectManager.prepareActiveEffectCategories(this.item.effects);

      return context;
   }

   async _onDrop(event) {
      if (!this.item.isOwner) return false;
      const data = TextEditor.getDragEventData(event);
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

   _getDamageTypeOptions() {
      const damageTypes = []
      damageTypes.push({ value: "", text: game.i18n.localize("None") });
      damageTypes.push(...CONFIG.FADE.DamageTypes.map((type) => {
         return { value: type, text: game.i18n.localize(`FADE.DamageTypes.types.${type}`) }
      }));
      return damageTypes.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});
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