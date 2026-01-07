import { EffectManager } from "../../sys/EffectManager.js";
import { FDItemSheetV2 } from "./FDItemSheetV2.js";
import { SheetTab } from "../SheetTab.js";
import { VsGroupModMixin } from "../mixins/VsGroupModMixin.js";
import { ConditionSheetService } from "./ConditionSheetService.js";
import { SpecialAbilitySheetService } from "./SpecialAbilitySheetService.js";
import { SpellSheetService } from "./SpellSheetService.js";
import { DragDropMixin } from "../mixins/DragDropMixin.js";

/**
 * Sheet class for WeaponItem.
 */
export class WeaponItemSheet extends DragDropMixin(VsGroupModMixin(FDItemSheetV2)) {
   conditionService: ConditionSheetService;
   specialAbilityService: SpecialAbilitySheetService;
   spellService: SpellSheetService;

   /** Base configuration: the part that never comes from a service */
   private static readonly BASE = {
      position: {
         width: 600,
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
   }

   /** All services */
   private static readonly SERVICES = [
      ConditionSheetService.DEFAULT_OPTIONS,
      SpecialAbilitySheetService.DEFAULT_OPTIONS,
      SpellSheetService.DEFAULT_OPTIONS
   ];

   /** Merge everything: one line for the final value */
   static DEFAULT_OPTIONS = WeaponItemSheet.SERVICES.reduce((acc, opts) =>
      foundry.utils.mergeObject(acc, opts, { recursive: true, insertKeys: true, insertValues: true, overwrite: true, inplace: false }),
      { ...WeaponItemSheet.BASE } // start with a shallow copy of the base
   );

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
      specialAbilities: {
         template: "systems/fantastic-depths/templates/item/shared/specAbilitiesAndSpells.hbs",
      },
      effects: {
         template: "systems/fantastic-depths/templates/item/shared/conditionswd.hbs",
      },
      gmOnly: {
         template: "systems/fantastic-depths/templates/item/weapon/gmOnly.hbs",
      }
   }

   tabGroups = {
      primary: "description"
   }

   constructor(options = {}) {
      super(options);
      this.conditionService = new ConditionSheetService();
      this.specialAbilityService = new SpecialAbilitySheetService();
      this.spellService = new SpellSheetService();
   }

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
      context.tabs = this.#getTabs();
      return context;
   }

   async _preparePartContext(partId, context) {
      if (partId === "header") {
         // Damage types
         context.damageTypes = this._getDamageTypeOptions();
      } else if (partId === "attributes") {
         context.isGM = game.user.isGM;

         // Ability actions
         context.actions = this._getActionOptions();
         // Weapon types
         context.weaponTypes = this._getWeaponTypeOptions();
         // Weapon sizes
         context.weaponSizes = this._getWeaponSizeOptions();
         // Weapon grips/modes
         context.weaponGrips = this._getWeaponGripOptions();
         // Saving throws
         context.savingThrows = await this._getSavingThrowOptions();
      } else if (partId === "effects") {
         // Prepare active effects for easier access
         context.effects = EffectManager.prepareActiveEffectCategories(this.item.effects);
      }
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
      const damageTypes = [];
      damageTypes.push({ text: game.i18n.localize("FADE.DamageTypes.types.physical"), value: "physical" });
      damageTypes.push({ text: game.i18n.localize("FADE.DamageTypes.types.breath"), value: "breath" });
      damageTypes.push({ text: game.i18n.localize("FADE.DamageTypes.types.fire"), value: "fire" });
      damageTypes.push({ text: game.i18n.localize("FADE.DamageTypes.types.frost"), value: "frost" });
      damageTypes.push({ text: game.i18n.localize("FADE.DamageTypes.types.poison"), value: "poison" });
      damageTypes.push({ text: game.i18n.localize("FADE.DamageTypes.types.corrosive"), value: "corrosive" });
      damageTypes.push({ text: game.i18n.localize("FADE.DamageTypes.types.piercing"), value: "piercing" });
      return damageTypes.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});
   }

   _getWeaponTypeOptions() {
      const weaponTypes = [];
      weaponTypes.push({ text: game.i18n.localize("FADE.Mastery.weaponTypes.monster.long"), value: "monster" });
      weaponTypes.push({ text: game.i18n.localize("FADE.Mastery.weaponTypes.handheld.long"), value: "handheld" });
      weaponTypes.push({ text: game.i18n.localize("FADE.Mastery.weaponTypes.all.long"), value: "all" });
      weaponTypes.push({ text: game.i18n.localize("FADE.Mastery.weaponTypes.siege.long"), value: "siege" });
      return weaponTypes.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});
   }

   _getWeaponSizeOptions() {
      const weaponSizes = [];
      weaponSizes.push({ text: game.i18n.localize("FADE.none"), value: null });
      weaponSizes.push({ text: game.i18n.localize("FADE.Actor.sizes.S"), value: "S" });
      weaponSizes.push({ text: game.i18n.localize("FADE.Actor.sizes.M"), value: "M" });
      weaponSizes.push({ text: game.i18n.localize("FADE.Actor.sizes.L"), value: "L" });
      return weaponSizes.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});
   }

   _getWeaponGripOptions() {
      const weaponGrips = [];
      weaponGrips.push({ text: game.i18n.localize("FADE.none"), value: null });
      weaponGrips.push({ text: game.i18n.localize("FADE.Weapon.grip.oneAbbr"), value: "1H" });
      weaponGrips.push({ text: game.i18n.localize("FADE.Weapon.grip.twoAbbr"), value: "2H" });
      return weaponGrips.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});
   }

   /**
   * Prepare an array of form header tabs.
   * @returns {Record<string, SheetTab>}
   */
   #getTabs(): Record<string, SheetTab> {
      const group = "primary";
      // Default tab for first time it"s rendered this session
      if (!this.tabGroups[group]) this.tabGroups[group] = "description";

      const tabs: Record<string, SheetTab>  = {
         description: new SheetTab("description", group, "FADE.tabs.description")
      }
      if (game.user.isGM) {
         tabs.attributes = new SheetTab("attributes", group, "FADE.tabs.attributes");
         tabs.specialAbilities = new SheetTab("specialAbilities", group, "FADE.SpecialAbility.plural");
         tabs.effects = new SheetTab("effects", group, "FADE.tabs.effects");
         tabs.gmOnly = new SheetTab("gmOnly", group, "FADE.tabs.gmOnly");
      }

      for (const tab of Object.values(tabs) as SheetTab[]) {
         tab.active = this.tabGroups[tab.group] === tab.id;
         tab.cssClass = tab.active ? "active" : "";
      }

      return tabs;
   }
}