import { EffectManager } from "../sys/EffectManager.mjs";
import { DragDropMixin } from "./mixins/DragDropMixin.mjs";
import { FDItemSheetV2 } from "./FDItemSheetV2.mjs";
import { fadeFinder } from "/systems/fantastic-depths/module/utils/finder.mjs";

/**
 * Sheet class for SpellItem.
 */
export class SpellItemSheet extends DragDropMixin(FDItemSheetV2) {
   /**
   * Get the default options for the sheet.
   */
   static DEFAULT_OPTIONS = {
      position: {
         width: 570,
         height: 450,
      },
      window: {
         resizable: true,
         minimizable: false,
         contentClasses: ["scroll-body"]
      },
      classes: ["fantastic-depths", "sheet", "item"],
      form: {
         submitOnChange: true
      },
      actions: {
         deleteItem: SpellItemSheet.#onDeleteChild,
      },
      dragDrop: [{ dragSelector: "[data-document-id]", dropSelector: "form" }],
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
         template: "systems/fantastic-depths/templates/item/spell/conditions.hbs",
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
         options.parts.push("effects");
      }
   }

   /**
    * Prepare data to be used in the Handlebars template.
    */
   async _prepareContext(options) {
      const context = await super._prepareContext(options);

      // Attack types
      const attackTypes = []
      attackTypes.push({ value: "", text: game.i18n.localize("None") });
      attackTypes.push(...CONFIG.FADE.AttackTypes.map((type) => {
         return { value: type, text: game.i18n.localize(`FADE.AttackTypes.types.${type}`) }
      }));
      context.attackTypes = attackTypes.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});
      // Damage types
      const dmgTypes = []
      dmgTypes.push({ value: "", text: game.i18n.localize("None") });
      dmgTypes.push(...CONFIG.FADE.DamageTypes.map((type) => {
         return { value: type, text: game.i18n.localize(`FADE.DamageTypes.types.${type}`) }
      }));
      context.damageTypes = dmgTypes.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});
      //Saving throws
      const saves = [];
      saves.push({ value: "", text: game.i18n.localize("None") });
      const saveItems = (await fadeFinder.getSavingThrows())?.sort((a, b) => a.system.shortName.localeCompare(b.system.shortName)) ?? [];
      saves.push(...saveItems.map((save) => {
         return { value: save.system.customSaveCode, text: save.system.shortName }
      }));
      context.savingThrows = saves.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});

      // Prepare active effects for easier access
      context.effects = EffectManager.prepareActiveEffectCategories(this.item.effects);

      context.tabs = this.#getTabs();

      return context;
   }

   async _onDrop(event) {
      if (!this.item.isOwner) return false;
      const data = TextEditor.getDragEventData(event);
      const droppedItem = await Item.implementation.fromDropData(data);
      // If the dropped item is a weapon mastery definition item...
      if (droppedItem.type === "condition") {
         // Retrieve the array
         await this.#onDropConditionItem(droppedItem);
      } else if (droppedItem.type === "class") {
         await this.#onDropClassDefItem(droppedItem);
      }
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
         description: { id: "description", group, label: "FADE.tabs.description" }
      }
      if (game.user.isGM) {
         tabs.attributes = { id: "attributes", group, label: "FADE.tabs.attributes" };
         tabs.effects = { id: "effects", group, label: "FADE.tabs.effects" };
      }
      for (const tab of Object.values(tabs)) {
         tab.active = this.tabGroups[tab.group] === tab.id;
         tab.cssClass = tab.active ? "active" : "";
      }
      return tabs;
   }

   static async #onDeleteChild(event) {
      event.preventDefault();
      const type = event.target.dataset.type ?? event.target.parentElement.dataset.type;
      const index = parseInt((event.target.dataset.index ?? event.target.parentElement.dataset.index));

      if (type === "condition") {
         const items = this.item.system.conditions;
         if (items.length > index) {
            items.splice(index, 1);
            await this.item.update({ "system.conditions": items });
         }
      } else if (type === "class") {
         const items = this.item.system.classes;
         if (items.length > index) {
            items.splice(index, 1);
            await this.item.update({ "system.classes": items });
         }
      }
      this.render();
   }

   async #onDropConditionItem(droppedItem) {
      const items = this.item.system.conditions || [];
      // Define the new data
      const newItem = {
         name: droppedItem.name,
         uuid: droppedItem.uuid
      };
      // Add the new item to the array
      items.push(newItem);
      await this.item.update({ "system.conditions": items });
   }

   async #onDropClassDefItem(droppedItem) {
      const items = this.item.system.classes || [];
      // Define the new data
      const newItem = {
         name: droppedItem.name,
         uuid: droppedItem.uuid
      };
      // Add the new item to the array
      items.push(newItem);
      await this.item.update({ "system.classes": items });
   }
}
