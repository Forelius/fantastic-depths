import { EffectManager } from "/systems/fantastic-depths/module/sys/EffectManager.mjs";
import { FDItemSheetV2 } from "./FDItemSheetV2.mjs";
import { ConditionMixin } from "/systems/fantastic-depths/module/sheets/mixins/ConditionMixin.mjs";
import { SpecialAbilityMixin } from "/systems/fantastic-depths/module/sheets/mixins/SpecialAbilityMixin.mjs";
import { SpellMixin } from "/systems/fantastic-depths/module/sheets/mixins/SpellMixin.mjs";
import { DragDropMixin } from "/systems/fantastic-depths/module/sheets/mixins/DragDropMixin.mjs";

export class GearItemSheet extends ConditionMixin(SpellMixin(SpecialAbilityMixin(DragDropMixin(FDItemSheetV2)))) {
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
      let droppedItem = await Item.implementation.fromDropData(data);
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
      const damageTypes = []
      damageTypes.push({ value: "", text: game.i18n.localize("None") });
      damageTypes.push(...CONFIG.FADE.DamageTypes.map((type) => {
         return { value: type, text: game.i18n.localize(`FADE.DamageTypes.types.${type}`) }
      }));
      return damageTypes.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});
   }

   /**
   * Prepare an array of form header tabs.
   * @returns {Record<string, Partial<ApplicationTab>>}
   */
   #getTabs() {
      const group = "primary";
      // Default tab for first time it's rendered this session
      if (!this.tabGroups[group]) this.tabGroups[group] = "description";
      const tabs = {
         description: { id: "description", group, label: "FADE.tabs.description", cssClass: "item" }
      };
      if (game.user.isGM) {
         tabs.attributes = { id: "attributes", group, label: "FADE.tabs.attributes", cssClass: "item" };
         tabs.specialAbilities = { id: "specialAbilities", group, label: "FADE.SpecialAbility.plural" };
         tabs.effects = { id: "effects", group, label: "FADE.tabs.effects", cssClass: "item" };
         tabs.gmOnly = { id: "gmOnly", group, label: "FADE.tabs.gmOnly", cssClass: "item" };
      }
      for (const v of Object.values(tabs)) {
         v.active = this.tabGroups[v.group] === v.id;
         v.cssClass = v.active ? "active" : "";
      }
      return tabs;
   }
}