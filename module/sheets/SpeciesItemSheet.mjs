import { DragDropMixin } from './mixins/DragDropMixin.mjs';
import { EffectManager } from '../sys/EffectManager.mjs';
import { fadeItemSheet } from './fadeItemSheet.mjs';
import { ChatFactory, CHAT_TYPE } from '../chat/ChatFactory.mjs';

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class SpeciesItemSheet extends DragDropMixin(fadeItemSheet) {
   static ValidItemTypes = ['item', 'weapon', 'armor'];

   /**
   * Get the default options for the sheet.
   */
   static DEFAULT_OPTIONS = {
      position: {
         width: 580,
         height: 'auto',
      },
      window: {
         resizable: true,
         minimizable: false,
         contentClasses: ["scroll-body"]
      },
      classes: ['fantastic-depths', 'sheet', 'item'],
      form: {
         submitOnChange: true
      },
      actions: {
         deleteLanguage: SpeciesItemSheet.#clickDeleteLanguage,
         createItem: SpeciesItemSheet.#onCreateChild,
         deleteItem: SpeciesItemSheet.#onDeleteChild,
         clickRoll: SpeciesItemSheet.#clickRoll,
      },
      dragDrop: [{ dragSelector: "[data-document-id]", dropSelector: "form" }],
   }

   static PARTS = {
      header: {
         template: "systems/fantastic-depths/templates/item/species/header.hbs",
      },
      tabnav: {
         template: "templates/generic/tab-navigation.hbs",
      },
      description: {
         template: "systems/fantastic-depths/templates/item/shared/description.hbs",
      },
      attributes: {
         template: "systems/fantastic-depths/templates/item/species/attributes.hbs",
      },
      abilities: {
         template: "systems/fantastic-depths/templates/item/classdef/abilities.hbs",
      },
      effects: {
         template: "systems/fantastic-depths/templates/item/shared/effects.hbs",
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
      options.parts = ['header', 'tabnav', 'description', 'attributes', 'abilities', 'effects']
   }

   /** @override */
   async _prepareContext() {
      // Retrieve base data structure
      const context = await super._prepareContext();

      // Abilities
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
   * @returns {Record<string, Partial<ApplicationTab>>}
   */
   #getTabs() {
      const group = 'primary';
      // Default tab for first time it's rendered this session
      if (!this.tabGroups[group]) this.tabGroups[group] = 'description';
      const tabs = {
         description: { id: 'description', group, label: 'FADE.tabs.description', cssClass: 'item' },
         attributes: { id: 'attributes', group, label: 'FADE.tabs.attributes', cssClass: 'item' },
         abilities: { id: 'abilities', group, label: 'FADE.tabs.abilities', cssClass: 'item' },
         effects: { id: 'effects', group, label: 'FADE.tabs.effects', cssClass: 'item' }
      }
      for (const v of Object.values(tabs)) {
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
      if (this.isEditable) {
         const inputField = this.element.querySelector('input[data-action="addLanguage"]');
         inputField?.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') { // Check if the Enter key is pressed
               const value = event.currentTarget.value; // Get the value of the input
               this.item.languageManager.pushTag(value); // Push the value to the language manager
            }
         });
      }
   }

   async _onDrop(event) {
      if (!this.item.isOwner) return false;
      const data = TextEditor.getDragEventData(event);
      const droppedItem = await Item.implementation.fromDropData(data);

      // If the dropped item is a weapon mastery definition item...
      if (droppedItem.type === 'specialAbility') {
         if (droppedItem.system.category === 'save') {
         } else {
            this.item.createClassAbility(droppedItem.name, droppedItem.system.classKey);
         }
      }
      //   else if (SpeciesDefinitionItem.ValidItemTypes.includes(droppedItem.type)) {
      //      this.item.createClassItem(droppedItem.name, droppedItem.type);
      //   }
   }

   /**
    * Handle clickable rolls.
    * @param {Event} event   The originating click event
    * @protected
    */
   static async #clickRoll(event) {
      event.preventDefault();
      event.stopPropagation();

      const elem = event.target;
      const dataset = elem.dataset;
      let formula = dataset.formula;
      let chatType = CHAT_TYPE.GENERIC_ROLL;;

      const rollContext = { ...this.item.getRollData() };
      const rolled = await new Roll(formula, rollContext).evaluate();
      const chatData = {
         caller: this.item,
         context: this.item,
         mdata: dataset,
         roll: rolled
      };
      const builder = new ChatFactory(chatType, chatData, { showResult: true });
      return builder.createChatMessage();
   }

   /**
   * Handle creating a new child object using initial data defined in the HTML dataset
   * @param {Event} event The originating click event
   * @private
   */
   static async #onCreateChild(event) {
      event.preventDefault();
      const type = event.target.dataset.type ?? event.target.parentElement.dataset.type;
      if (type === 'specialAbility') {
         this.item.createSpecialAbility();
      } else if (type === 'class') {
         this.item.createClass();
      }
      this.render();
   }

   static async #onDeleteChild(event) {
      event.preventDefault();
      const type = event.target.dataset.type ?? event.target.parentElement.dataset.type;
      const index = parseInt((event.target.dataset.index ?? event.target.parentElement.dataset.index));

      if (type === 'specialAbility') {
         const items = this.item.system.specialAbilities;
         if (items.length > index) {
            items.splice(index, 1);
            await this.item.update({ "system.specialAbilities": items });
         }
      } else if (type === 'class') {
         const items = this.item.system.classes;
         if (items.length > index) {
            items.splice(index, 1);
            await this.item.update({ "system.classes": items });
         }
      }
      this.render();
   }

   static #clickDeleteLanguage(event) {
      const value = event.target.dataset.tag ?? event.target.parentElement.dataset.tag;
      this.item.languageManager.popTag(value);
   }
}