import { ClassDefinitionItem } from '/systems/fantastic-depths/module/item/ClassDefinitionItem.mjs';
import { fadeFinder } from '/systems/fantastic-depths/module/utils/finder.mjs';
import { fadeItemSheet } from './fadeItemSheet.mjs';
import { DragDropMixin } from './mixins/DragDropMixin.mjs';

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class ClassDefinitionItemSheet extends DragDropMixin(fadeItemSheet) {
   /**
   * Get the default options for the sheet.
   */
   static DEFAULT_OPTIONS = {
      position: {
         top: 150,
         width: 650,
         height: 500,
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
      dragDrop: [{ dragSelector: "[data-document-id]", dropSelector: "form" }],
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
      abilities: {
         template: "systems/fantastic-depths/templates/item/classdef/abilities.hbs",
      },
      items: {
         template: "systems/fantastic-depths/templates/item/classdef/items.hbs",
      },
      spells: {
         template: "systems/fantastic-depths/templates/item/classdef/spells.hbs",
      },
   }

   /** @override */
   tabGroups = {
      primary: { id: "description" }
   }

   /** @override */
   _configureRenderOptions(options) {
      // This fills in `options.parts` with an array of ALL part keys by default
      // So we need to call `super` first
      super._configureRenderOptions(options);
      // Completely overriding the parts
      options.parts = ['header', 'tabnav', 'levels', 'description', 'saves', 'primereqs', 'abilities', 'items']

      if (this.item.system.maxSpellLevel > 0) {
         options.parts.push('spells');
      }
   }

   /** @override */
   async _prepareContext() {
      // Retrieve base data structure
      const context = await super._prepareContext();

      // Add the item's data for easier access
      //context.flags = this.item.flags;
      context.isSpellcaster = this.item.system.maxSpellLevel > 0;
      // Generate spell level headers
      context.spellLevelHeaders = [];
      for (let i = 1; i <= this.item.system.maxSpellLevel; i++) {
         context.spellLevelHeaders.push(game.i18n.format(`FADE.Spell.SpellLVL`, { level: i }));
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

   /** @override */
   activateListeners(html) {
      super.activateListeners(html);

      // Everything below here is only needed if the sheet is editable
      if (!this.isEditable) return;

      // Add Inventory Item
      html.on('click', '.item-create', async (event) => { await this.#onCreateChild(event) });

      // Delete Inventory Item
      html.on('click', '.item-delete', async (event) => { await this.#onDeleteChild(event) });
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
      } else if (ClassDefinitionItem.ValidItemTypes.includes(droppedItem.type)) {
         this.item.createClassItem(droppedItem.name, droppedItem.type);
      }
   }

   /**
   * Handle creating a new child object using initial data defined in the HTML dataset
   * @param {Event} event The originating click event
   * @private
   */
   async #onCreateChild(event) {
      event.preventDefault();
      const header = event.currentTarget;
      const type = header.dataset.type;

      if (type === 'classSave') {
         this.item.createClassSave();
      } else if (type === 'primeReq') {
         this.item.createPrimeReq();
      } else if (type === 'classAbility') {
         this.item.createClassAbility();
      } else if (ClassDefinitionItem.ValidItemTypes.includes(type)) {
         this.item.createClassItem();
      }
      this.render();
   }

   async #onDeleteChild(event) {
      event.preventDefault();
      const type = event.currentTarget.dataset.type;
      const index = parseInt(event.currentTarget.dataset.index);

      if (type === 'classSave') {
         const saves = this.item.system.saves;
         // Handle deletion of a class save
         saves.splice(index, 1);
         await this.item.update({ "system.saves": saves });
      } else if (type === 'primeReq') {
         const primeReqs = this.item.system.primeReqs;
         if (primeReqs.length > index) {
            primeReqs.splice(index, 1);
            await this.item.update({ "system.primeReqs": primeReqs });
         }
      } else if (type === 'specialAbility') {
         const specialAbilities = this.item.system.specialAbilities;
         if (specialAbilities.length > index) {
            specialAbilities.splice(index, 1);
            await this.item.update({ "system.specialAbilities": specialAbilities });
         }
      } else if (type === 'item') {
         const items = this.item.system.classItems;
         if (items.length > index) {
            items.splice(index, 1);
            await this.item.update({ "system.classItems": items });
         }
      }
      this.render();
   }

   /**
   * Prepare an array of form header tabs.
   * @returns {Record<string, Partial<ApplicationTab>>}
   */
   #getTabs() {
      const tabs = {
         levels: { id: 'levels', group: 'primary', label: 'FADE.tabs.levels' },
         description: { id: 'description', group: 'primary', label: 'FADE.tabs.description' },
         saves: { id: 'saves', group: 'primary', label: 'FADE.Actor.Saves.long' },
         primereqs: { id: 'primereqs', group: 'primary', label: 'FADE.tabs.primeRequisites' },
         abilities: { id: 'abilities', group: 'primary', label: 'FADE.SpecialAbility.plural' },
         items: { id: 'items', group: 'primary', label: 'FADE.items' },
      }

      if (this.item.system.maxSpellLevel > 0) {
         tabs.spells = { id: 'spells', group: 'primary', label: 'FADE.tabs.spells' };
      }

      for (const v of Object.values(tabs)) {
         v.active = this.tabGroups[v.group] === v.id;
         v.cssClass = v.active ? "active" : "";
      }

      return tabs;
   }
}