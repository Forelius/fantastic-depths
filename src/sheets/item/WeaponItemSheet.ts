import { EffectManager } from "../../sys/EffectManager.js";
import { FDItemSheetV2 } from "./FDItemSheetV2.js";
import { VsGroupModMixin } from "../mixins/VsGroupModMixin.js";
import { ConditionMixin } from "../mixins/ConditionMixin.js";
import { SpecialAbilityMixin } from "../mixins/SpecialAbilityMixin.js";
import { SpellMixin } from "../mixins/SpellMixin.js";
import { DragDropMixin } from "../mixins/DragDropMixin.js";

/**
 * Sheet class for WeaponItem.
 */
// @ts-ignore
export class WeaponItemSheet extends ConditionMixin(SpellMixin(SpecialAbilityMixin(DragDropMixin(VsGroupModMixin(FDItemSheetV2))))) {
   /**
   * Get the default options for the sheet.
   */
   static DEFAULT_OPTIONS = {
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
         await this.onDropSpellItem(droppedItem);
      } else if (droppedItem?.type === "specialAbility") {
         await this.onDropSpecialAbilityItem(droppedItem);
      } else if (droppedItem?.type === "condition") {
         await this.onDropConditionItem(droppedItem);
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
   * @returns {Record<string, Partial<any>>}
   */
   #getTabs() {
      const group = "primary";
      // Default tab for first time it"s rendered this session
      if (!this.tabGroups[group]) this.tabGroups[group] = "description";

      const tabs: any = {
         description: { id: "description", group, label: "FADE.tabs.description" }
      }
      if (game.user.isGM) {
         tabs.attributes = { id: "attributes", group, label: "FADE.tabs.attributes" };
         tabs.specialAbilities = { id: "specialAbilities", group, label: "FADE.SpecialAbility.plural" };
         tabs.effects = { id: "effects", group, label: "FADE.tabs.effects" };
         tabs.gmOnly = { id: "gmOnly", group, label: "FADE.tabs.gmOnly" };
      }

      for (const tab of Object.values(tabs) as any) {
         tab.active = this.tabGroups[tab.group] === tab.id;
         tab.cssClass = tab.active ? "active" : "";
      }

      return tabs;
   }
}