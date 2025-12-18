import { ClassDefinitionItem } from "../../item/ClassDefinitionItem.js";
import { FDItem } from "../../item/FDItem.js";
import { fadeFinder } from "../..//utils/finder.js";
import { FDItemSheetV2 } from "./FDItemSheetV2.js";
import { DragDropMixin } from "../mixins/DragDropMixin.js";
import { SpecialAbilityMixin } from "../mixins/SpecialAbilityMixin.js";

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {FDItemSheetV2}
 */
// @ts-ignore
export class ClassDefinitionItemSheet extends SpecialAbilityMixin(DragDropMixin(FDItemSheetV2)) {
   /**
   * Get the default options for the sheet.
   */
   static DEFAULT_OPTIONS = {
      position: {
         width: 700,
         height: 500,
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
         createItem: ClassDefinitionItemSheet.#onCreateChild,
         deleteItem: ClassDefinitionItemSheet.#onDeleteChild,
      }
   }

   static PARTS = {
      header: {
         template: "systems/fantastic-depths/templates/item/classdef/header.hbs",
      },
      tabnav: {
         template: "templates/generic/tab-navigation.hbs",
      },
      levels: {
         template: "systems/fantastic-depths/templates/item/classdef/levels.hbs",
      },
      description: {
         template: "systems/fantastic-depths/templates/item/shared/description.hbs",
      },
      saves: {
         template: "systems/fantastic-depths/templates/item/classdef/saves.hbs",
      },
      primereqs: {
         template: "systems/fantastic-depths/templates/item/classdef/primereqs.hbs",
      },
      specialAbilities: {
         template: "systems/fantastic-depths/templates/item/shared/specialAbilities.hbs",
      },
      items: {
         template: "systems/fantastic-depths/templates/item/classdef/items.hbs",
      },
      spells: {
         template: "systems/fantastic-depths/templates/item/classdef/spells.hbs",
      },
   }

   tabGroups = {
      primary: "description"
   }

   async createActorClass(owner) {
      const result = await FDItem.create({
         name: this.name,
         type: "actorClass",
      }, { parent: owner });
      return result;
   }

   _configureRenderOptions(options) {
      // This fills in `options.parts` with an array of ALL part keys by default
      // So we need to call `super` first
      super._configureRenderOptions(options);
      // Completely overriding the parts
      options.parts = ["header", "tabnav", "levels", "description", "saves", "primereqs", "specialAbilities", "items"]

      if (this.item.system.maxSpellLevel > 0) {
         options.parts.push("spells");
      }
   }

   async _prepareContext() {
      // Retrieve base data structure
      const context = await super._prepareContext();

      context.masterySetting = game.settings.get(game.system.id, "weaponMastery");

      // Add the item's data for easier access
      context.isSpellcaster = this.item.system.maxSpellLevel > 0;
      // Generate spell level headers
      context.spellLevelHeaders = [];
      for (let i = this.item.system.firstSpellLevel; i <= this.item.system.maxSpellLevel; i++) {
         context.spellLevelHeaders.push(i);
      }
      // Ability score abilities
      context.abilities = [...CONFIG.FADE.Abilities.map((key) => {
         return { value: key, text: game.i18n.localize(`FADE.Actor.Abilities.${key}.long`) }
      })].reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});
      // Saving throw items
      context.saves = await fadeFinder.getSavingThrows();
      // Concat logics
      context.logics = [...CONFIG.FADE.ConcatLogic.map((key) => {
         return { value: key, text: game.i18n.localize(`FADE.concatLogic.${key}`) }
      })].reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});

      // Prepare the tabs.
      context.tabs = this.#getTabs();

      return context;
   }

   /**
    * Prepare an array of form header tabs.
    * @returns {Record<string, Partial<any>>}
    */
   #getTabs() {
      const group = "primary";
      // Default tab for first time it's rendered this session
      if (!this.tabGroups[group]) this.tabGroups[group] = "description";

      const tabs: any = {
         levels: { id: "levels", group, label: "FADE.tabs.levels" },
         description: { id: "description", group, label: "FADE.tabs.description" },
         saves: { id: "saves", group, label: "FADE.Actor.Saves.long" },
         primereqs: { id: "primereqs", group, label: "FADE.tabs.primeRequisites" },
         specialAbilities: { id: "specialAbilities", group, label: "FADE.SpecialAbility.plural" },
         items: { id: "items", group, label: "FADE.items" },
      }

      if (this.item.system.maxSpellLevel > 0) {
         tabs.spells = { id: "spells", group, label: "FADE.tabs.spells" };
      }

      for (const tab of Object.values(tabs) as any) {
         tab.active = this.tabGroups[tab.group] === tab.id;
         tab.cssClass = tab.active ? "active" : "";
      }

      return tabs;
   }

   async _onDrop(event) {
      if (!this.item.isOwner) return false;
      super._onDrop(event);
      const data = TextEditor.getDragEventData(event);
      const droppedItem = await Item.implementation.fromDropData(data);
      if (ClassDefinitionItem.ValidItemTypes.includes(droppedItem.type)) {
         this.item.createItem(droppedItem.name, droppedItem.type);
      } else if (droppedItem?.type === "specialAbility") {
         await this.onDropSpecialAbilityItem(droppedItem);
      }
   }

   /**
   * Handle creating a new child object using initial data defined in the HTML dataset
   * @this {any}
   * @param {any} event The originating click event
   */
   static async #onCreateChild(this: FDItemSheetV2, event) {
      event.preventDefault();
      const type = event.target.dataset.type ?? event.target.parentElement.dataset.type;

      if (type === "classSave") {
         await this.item.createClassSave();
      } else if (type === "primeReq") {
         await this.item.createPrimeReq();
      } else if (type === "item") {
         await this.item.createItem();
      }
   }

   /**
    * @this {any}
    * @param {any} event
    */
   static async #onDeleteChild(this: FDItemSheetV2, event) {
      event.preventDefault();
      let type;
      let index;
      if (event.target.dataset.type) {
         type = event.target.dataset.type;
         index = parseInt(event.target.dataset.index);
      } else if (event.target.parentElement.dataset.type) {
         type = event.target.parentElement.dataset.type;
         index = parseInt(event.target.parentElement.dataset.index);
      } else {
         console.error(`ClassDefinitionItemSheet.#onDeleteChild: Can"t determine item type.`, this.item);
      }

      if (type === "classSave") {
         const saves = this.item.system.saves;
         // Handle deletion of a class save
         saves.splice(index, 1);
         await this.item.update({ "system.saves": saves });
      } else if (type === "primeReq") {
         const primeReqs = this.item.system.primeReqs;
         if (primeReqs.length > index) {
            primeReqs.splice(index, 1);
            await this.item.update({ "system.primeReqs": primeReqs });
         }
      } else if (type === "item") {
         const items = [...this.item.system.classItems];
         if (items.length > index) {
            items.splice(index, 1);
            await this.item.update({ "system.classItems": items });
         }
      }
   }
}
