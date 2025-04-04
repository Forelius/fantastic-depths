import { fadeFinder } from '/systems/fantastic-depths/module/utils/finder.mjs';
import { fadeItemSheet } from './fadeItemSheet.mjs';
/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class ClassDefinitionItemSheet extends fadeItemSheet {
   /** @override */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         classes: ['fantastic-depths', 'sheet', 'item'],
         width: 650,
         height: 480,
         dragDrop: [
            { dragSelector: "[data-document-id]", dropSelector: "form" }
         ],
         tabs: [
            {
               navSelector: '.sheet-tabs',
               contentSelector: '.sheet-body',
               initial: 'description',
            },
         ],
      });
   }

   /** @override */
   get template() {
      const path = 'systems/fantastic-depths/templates/item';
      return `${path}/ClassDefinitionItemSheet.hbs`;
   }

   /** @override */
   async getData() {
      // Retrieve base data structure
      const context = await super.getData();
      const itemData = context.data;

      // Add the item's data for easier access
      //context.flags = itemData.flags;
      context.isSpellcaster = itemData.system.maxSpellLevel > 0;
      // Generate spell level headers
      context.spellLevelHeaders = [];
      for (let i = 1; i <= itemData.system.maxSpellLevel; i++) {
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

   /** @inheritdoc */
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
      } else if (type === 'classAbility') {
         const classAbilities = this.item.system.classAbilities;
         if (classAbilities.length > index) {
            classAbilities.splice(index, 1);
            await this.item.update({ "system.classAbilities": classAbilities });
         }
      }
      this.render();
   }
}