/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class ClassItemSheet extends ItemSheet {
   /** @override */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         classes: ['fantastic-depths', 'sheet', 'item'],
         width: 600,
         height: 480,
         tabs: [
            {
               navSelector: '.sheet-tabs',
               contentSelector: '.sheet-body',
               initial: 'levels',
            },
         ],
      });
   }

   /** @override */
   get isEditable() {
      // Allow editing only for GM users
      return game.user.isGM;
   }

   /** @override */
   get template() {
      const path = 'systems/fantastic-depths/templates/item';
      return `${path}/class-sheet.hbs`;
   }

   /** @override */
   getData() {
      // Retrieve base data structure
      const context = super.getData();
      const itemData = context.data;

      // Add the item's data for easier access
      context.system = itemData.system;
      context.flags = itemData.flags;

      // Generate spell level headers
      context.spellLevelHeaders = [];
      for (let i = 1; i <= itemData.system.maxSpellLevel; i++) {
         context.spellLevelHeaders.push(`Spell Level ${i}`);
      }

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

      // Listener for maxLevel changes
      html.find('input[name="system.maxLevel"]').on('change', (event) => {
         const newMaxLevel = parseInt(event.target.value);
         if (isNaN(newMaxLevel) || newMaxLevel < 1) {
            ui.notifications.error("Invalid Max Level");
         } else { this.#synchronizeLevelsAndSpells(newMaxLevel, this.item.system.maxSpellLevel); }         
      });

      // Listener for maxSpellLevel changes
      html.find('input[name="system.maxSpellLevel"]').on('change', (event) => {
         const newMaxSpellLevel = parseInt(event.target.value);
         if (isNaN(newMaxSpellLevel) || newMaxSpellLevel < 0) {
            ui.notifications.error("Invalid Max Spell Level");
         } else { this.#synchronizeLevelsAndSpells(this.item.system.maxLevel, newMaxSpellLevel); }
      });
   }

   /**
    * Synchronize `levels` and `spells` with the current maxLevel and maxSpellLevel.
    * @param {number} maxLevel - The maximum level.
    * @param {number} maxSpellLevel - The maximum spell level.
    * @private
    */
   async #synchronizeLevelsAndSpells(maxLevel, maxSpellLevel) {
      // Deep clone the existing levels and spells to work with them safely
      let levels = foundry.utils.deepClone(this.item.system.levels) || [];
      let spells = foundry.utils.deepClone(this.item.system.spells) || [];

      // Adjust levels array to match maxLevel
      if (levels.length < maxLevel) {
         for (let i = levels.length; i < maxLevel; i++) {
            levels.push({
               level: i + 1,
               xp: 0,
               thac0: 20,
               hd: "1d8",
               hdcon: false,
               title: "",
               femaleTitle: "",
               attackRank: ""
            });
         }
      } else if (levels.length > maxLevel) {
         levels = levels.slice(0, maxLevel);
      }

      // Create a new array for spells to ensure reactivity
      let newSpells = [];

      // Adjust spells array to match maxLevel and maxSpellLevel
      for (let i = 0; i < maxLevel; i++) {
         if (i < spells.length) {
            // Adjust the existing spell level array
            let spellLevels = spells[i];
            if (spellLevels.length < maxSpellLevel) {
               spellLevels = spellLevels.concat(Array(maxSpellLevel - spellLevels.length).fill(0));
            } else if (spellLevels.length > maxSpellLevel) {
               spellLevels = spellLevels.slice(0, maxSpellLevel);
            }
            newSpells.push(spellLevels);
         } else {
            // Add new spell levels with all zeros if beyond the existing spells length
            newSpells.push(Array(maxSpellLevel).fill(0));
         }
      }

      // Update the item with new levels and spells
      await this.item.update({
         "system.levels": levels,
         "system.spells": newSpells,
         "system.maxLevel": maxLevel,
         "system.maxSpellLevel": maxSpellLevel
      });
      await this.render(true);
   }

   /**
   * Handle creating a new child object using initial data defined in the HTML dataset
   * @param {Event} event The originating click event
   * @private
   */
   async #onCreateChild(event) {
      event.preventDefault();
      const header = event.currentTarget;
      // Get the type of item to create.
      const type = header.dataset.type;
      console.debug(`ClasItemSheet._onCreateChild: ${type}`);
      if (type === 'classSave') {
         this.#createClassSave();
      } else if (type === 'primeReq') {
         this.#createPrimeReq();
      }
   }

   async #onDeleteChild(event) {
      event.preventDefault();
      const type = event.currentTarget.dataset.type;
      const index = parseInt(event.currentTarget.dataset.index);

      if (type === 'classSave') {
         // Handle deletion of a class save
         const saves = foundry.utils.deepClone(this.item.system.saves) || [];
         if (saves.length > index) {
            saves.splice(index, 1);
            await this.item.update({ "system.saves": saves });
         }
      } else if (type === 'primeReq') {
         const primeReqs = foundry.utils.deepClone(this.item.system.primeReqs) || [];
         if (primeReqs.length > index) {
            primeReqs.splice(index, 1);
            await this.item.update({ "system.primeReqs": primeReqs });
            this.render();
         }
      }
      this.render();
   }

   async #createClassSave() {
      // Retrieve the saves array from the item's data
      const saves = foundry.utils.deepClone(this.item.system.saves) || [];

      // Find the current highest level in the saves array
      const maxLevel = saves.length > 0 ? Math.max(...saves.map(s => s.level)) : 0;

      // Define the new save data
      const newSaveData = {
         level: maxLevel + 1, // Increment the level by 1
         death: 14,           // Default save values (customize as needed)
         wand: 12,
         paralysis: 13,
         breath: 15,
         spell: 16
      };

      // Update the item's saves data
      saves.push(newSaveData);
      await this.item.update({ "system.saves": saves });

      // Re-render the sheet to display the new save
      this.render();
   }
   async #createPrimeReq() {
      // Retrieve the primeReqs array
      const primeReqs = foundry.utils.deepClone(this.item.system.primeReqs) || [];

      // Define the new primeReq data
      const newPrimeReqData = {
         ability: "",    // Default ability, empty string
         xpBonus5: 0,    // Default XP bonus of 0%
         xpBonus10: 0    // Default XP bonus of 0%
      };

      // Add the new primeReq to the array
      primeReqs.push(newPrimeReqData);
      await this.item.update({ "system.primeReqs": primeReqs });

      // Re-render the sheet to display the new primeReq
      this.render();
   }
}