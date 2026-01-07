import { AncestryDefinitionItem } from "../../item/AncestryDefinitionItem.js";
import { DragDropMixin } from "../mixins/DragDropMixin.js";
import { EffectManager } from "../../sys/EffectManager.js";
import { FDItemSheetV2 } from "./FDItemSheetV2.js";
import { SheetTab } from "../SheetTab.js";
import { ChatFactory, CHAT_TYPE } from "../../chat/ChatFactory.js";
import { SpecialAbilitySheetService} from "./SpecialAbilitySheetService.js";

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class AncestryDefinitionSheet extends DragDropMixin(FDItemSheetV2) {
   specialAbilityService: SpecialAbilitySheetService;

   /** Base configuration: the part that never comes from a service */
   private static readonly BASE = {
      position: {
         width: 650,
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
         deleteLanguage: AncestryDefinitionSheet.#clickDeleteLanguage,
         createItem: AncestryDefinitionSheet.#onCreateChild,
         deleteItem: AncestryDefinitionSheet.#onDeleteChild,
         clickRoll: AncestryDefinitionSheet.#clickRoll,
      }
   };

   /** All services */
   private static readonly SERVICES = [
      SpecialAbilitySheetService.DEFAULT_OPTIONS,
   ];

   /** Merge everything: one line for the final value */
   static DEFAULT_OPTIONS = AncestryDefinitionSheet.SERVICES.reduce((acc, opts) =>
      foundry.utils.mergeObject(acc, opts, { recursive: true, insertKeys: true, insertValues: true, overwrite: true, inplace: false }),
      { ...AncestryDefinitionSheet.BASE } // start with a shallow copy of the base
   );

   static PARTS = {
      header: {
         template: "systems/fantastic-depths/templates/item/ancestry/header.hbs",
      },
      tabnav: {
         template: "templates/generic/tab-navigation.hbs",
      },
      description: {
         template: "systems/fantastic-depths/templates/item/shared/description.hbs",
      },
      attributes: {
         template: "systems/fantastic-depths/templates/item/ancestry/attributes.hbs",
      },
      specialAbilities: {
         template: "systems/fantastic-depths/templates/item/shared/specialAbilities.hbs",
      },
      items: {
         template: "systems/fantastic-depths/templates/item/ancestry/items.hbs",
      },
      effects: {
         template: "systems/fantastic-depths/templates/item/shared/effects.hbs",
      }
   }

   /** @override */
   tabGroups = {
      primary: "description"
   }

   constructor(options = {}) {
      super(options);
      this.specialAbilityService = new SpecialAbilitySheetService();
   }

   /** @override */
   _configureRenderOptions(options) {
      // This fills in `options.parts` with an array of ALL part keys by default
      // So we need to call `super` first
      super._configureRenderOptions(options);
      // Completely overriding the parts
      options.parts = ["header", "tabnav", "description", "attributes", "specialAbilities", "effects", "items"]
   }

   /** @override */
   async _prepareContext() {
      // Retrieve base data structure
      const context = await super._prepareContext();
      context.masterySetting = game.settings.get(game.system.id, "weaponMastery");
      context.weaponMasteryEnabled = game.settings.get(game.system.id, "weaponMastery") != "none";

      // Abilities (ability score)
      context.abilities = [...CONFIG.FADE.Abilities.map((key) => {
         return { value: key, text: game.i18n.localize(`FADE.Actor.Abilities.${key}.long`) }
      })].reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});

      // Prepare active effects for easier access
      context.effects = EffectManager.preparePassiveEffects(this.item.effects);
      context.hideLevel = true;

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
         description: new SheetTab("description", group, "FADE.tabs.description", "item"),
         attributes: new SheetTab("attributes", group, "FADE.tabs.attributes", "item"),
         specialAbilities: new SheetTab("specialAbilities", group, "FADE.SpecialAbility.plural", "item"),
         items: new SheetTab("items", group, "FADE.items"),
         effects: new SheetTab("effects", group, "FADE.tabs.effects", "item"),
      }
      for (const v of Object.values(tabs) as SheetTab[]) {
         v.active = this.tabGroups[v.group] === v.id;
         v.cssClass = v.active ? "active" : "";
      }
      return tabs;
   }

   /**
     * Actions performed after any render of the Application.
     * Post-render steps are not awaited by the render process.
     * @param {ApplicationRenderContext} context      Prepared context data
     * @param {RenderOptions} options                 Provided render options
     * @protected
     */
   _onRender(context, options) {
      super._onRender(context, options);
      if (this.isEditable) {
         const inputField = this.element.querySelector(`input[data-action="addLanguage"]`);
         inputField?.addEventListener("keypress", (event) => {
            if (event.key === "Enter") { // Check if the Enter key is pressed
               const value = event.currentTarget.value; // Get the value of the input
               this.item.languageManager.pushTag(value); // Push the value to the language manager
            }
         });
      }
   }

   async _onDrop(event) {
      if (!this.item.isOwner) return false;
      super._onDrop(event);
      const data = TextEditor.getDragEventData(event);
      const droppedItem = await Item.implementation.fromDropData(data);
      // If the dropped item is a weapon mastery definition item...
      if (AncestryDefinitionItem.ValidItemTypes.includes(droppedItem.type)) {
         this.item.createItem(droppedItem.name, droppedItem.type);
      } else if (droppedItem?.type === "specialAbility") {
         await this.specialAbilityService.onDropSpecialAbilityItem(this.item, droppedItem);
      }
   }

   /**
    * Handle clickable rolls.
    * @param {Event} event   The originating click event
    * @protected
    */
   static async #clickRoll(this: FDItemSheetV2, event): Promise<void> {
      event.preventDefault();
      event.stopPropagation();

      const elem = event.target;
      const dataset = elem.dataset;
      const formula = dataset.formula;
      const chatType = CHAT_TYPE.GENERIC_ROLL;;

      const rollContext = { ...this.item.getRollData() };
      const rolled = await new Roll(formula, rollContext).evaluate();
      const chatData = {
         caller: this.item,
         context: this.item,
         mdata: dataset,
         roll: rolled
      };
      const builder = new ChatFactory(chatType, chatData, { showResult: true });
      await builder.createChatMessage();
   }

   /**
   * Handle creating a new child object using initial data defined in the HTML dataset
   * @param {Event} event The originating click event
   * @private
   */
   static async #onCreateChild(this: FDItemSheetV2, event) {
      event.preventDefault();
      const type = event.target.dataset.type ?? event.target.parentElement.dataset.type;
      if (type === "class") {
         this.item.createClass();
      } else if (type === "item") {
         await this.item.createItem();
      }
      this.render();
   }

   static async #onDeleteChild(this: FDItemSheetV2, event) {
      event.preventDefault();
      const type = event.target.dataset.type ?? event.target.parentElement.dataset.type;
      const index = parseInt((event.target.dataset.index ?? event.target.parentElement.dataset.index));

      if (type === "class") {
         const items = this.item.system.classes;
         if (items.length > index) {
            items.splice(index, 1);
            await this.item.update({ "system.classes": items });
         }
      } else if (type === "item") {
         const items = this.item.system.ancestryItems;
         if (items.length > index) {
            items.splice(index, 1);
            await this.item.update({ "system.ancestryItems": items });
         }
      }
      this.render();
   }

   static #clickDeleteLanguage(this: FDItemSheetV2, event) {
      const tag = event.target.closest(".tag").dataset.tag;
      this.item.languageManager.popTag(tag);
   }
}