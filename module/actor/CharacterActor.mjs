﻿import Formatter from '../utils/Formatter.mjs';
import { fadeActor } from './fadeActor.mjs';
import { ClassItem } from "../item/ClassItem.mjs";
import { SpeciesItem } from "../item/SpeciesItem.mjs";
import { DialogFactory } from '../dialog/DialogFactory.mjs';
import { fadeFinder } from '/systems/fantastic-depths/module/utils/finder.mjs';

export class CharacterActor extends fadeActor {

   constructor(data, context) {
      /** Default behavior, just call super() and do all the default Item inits */
      super(data, context);
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
      this._prepareClassInfo();
   }

   /**
    * Intercept updateActor method call to log changes.
    * @override
    * @param {any} updateData
    * @param {any} options
    * @param {any} userId
    */
   async onUpdateActor(updateData, options, userId) {
      super.onUpdateActor(updateData, options, userId)
      const isLoggingEnabled = game.settings.get(game.system.id, "logCharacterChanges");
      const user = await game.users.get(userId);
      // Only proceed if logging is enabled and the update is by a player
      if (isLoggingEnabled && game.user.isGM) {
         // Get the old actor data before changes
         const oldActorData = updateData;
         // Log changes between the old and new data
         this.logActorChanges(updateData, oldActorData, user, "property");
      }
      // Class or level updated.
      if (this.id) {
         if (updateData.system?.details?.class !== undefined || updateData.system?.details?.level !== undefined) {
            await this._updateLevelClass();
         }
         if (updateData.system?.details?.species !== undefined) {
            await this._updateSpecies();
         }
      }
   }

   /**
    * get changes and send to GM
    * @param {any} updateData
    * @param {any} oldData - The old state of the actor before the update
    * @param {any} user
    * @param {any} parentKey
    * @returns
    */
   logActorChanges(updateData, oldData, user, type, parentKey = '') {
      if (this.testUserPermission(game.user, "OWNER") === false) return;

      let changes = [];
      const ignore = ["_stats", "_id", "flags"];

      if (type === "property") {
         for (let key in updateData) {
            const fullKey = parentKey ? `${parentKey}.${key}` : key;

            if (ignore.includes(fullKey) === false) {
               const oldValue = foundry.utils.getProperty(oldData, fullKey);
               const newValue = foundry.utils.getProperty(updateData, key);
               if (typeof newValue === 'object' && newValue !== null && !Array.isArray(newValue)) {
                  // Recursively log changes for nested objects
                  this.logActorChanges(newValue, oldData, user, type, fullKey);
               } else if (oldValue) {
                  changes.push({ field: fullKey, oldValue: oldValue, newValue: newValue });
               }
            }
         }
      } else {
         changes.push(updateData);
      }

      if (changes.length > 0) {
         this._sendChangeMessageToGM(changes, user, type);
      }

      return changes;  // This allows recursion to accumulate changes
   }

   /**
    * Helper function to send a change message to the GM
    * @param {any} changes
    * @param {any} user
    * @param {any} type
    */
   _sendChangeMessageToGM(changes, user, type) {
      let changeDescs = null;
      if (type === "property") {
         changeDescs = changes.map(change => {
            return `${change.field}: <strong>${change.newValue}</strong>`;
         }).join("<br>");
      } else if (type === "addItem") {
         const item = changes[0];
         changeDescs = `Added ${item.type}: ${item.name}`;
      } else if (type === "deleteItem") {
         const item = changes[0];
         changeDescs = `Removed ${item.type}: ${item.name}`;
      }

      if (changeDescs) {
         // Create a chat message only visible to the GM
         ChatMessage.create({
            user: game.user.id,
            content: `<p>Player ${user.name} updated ${this.name}:</p><p>${changeDescs}</p>`,
            whisper: ChatMessage.getWhisperRecipients("GM"), // Whisper to all active GMs
         });
      }
   }

   /**
    * Prepares all derived class-related data when the class name is recognized.
    * Does not prepare saving throws or class special abilities which are done separately in onUpdateActor.
    * @protected
    */
   async _prepareClassInfo() {
      if (this.testUserPermission(game.user, "OWNER") === false) return;
      if (game.user.isGM === false) return;

      // Replace hyphen with underscore for "Magic-User"
      const nameInput = this.system.details.class?.toLowerCase();
      const classItem = await fadeFinder.getClass(nameInput);
      if (!classItem) {
         if (nameInput !== null && nameInput !== '') {
            console.warn(`Class not found ${this.system.details.class}. Make sure to import item compendium.`);
         }
         return;
      }

      // Make sure current level is within range of levels allowed for class.
      const classData = classItem.system;
      const currentLevel = Math.min(classData.maxLevel, Math.max(classData.firstLevel, this.system.details.level));
      this.system.details.level = currentLevel;
      const levelData = classData.levels.find(level => level.level === currentLevel);
      const prevLevelData = classData.levels.find(level => level.level === currentLevel - 1);
      const nextLevelData = classData.levels.find(level => level.level === currentLevel + 1);
      const nameLevel = classData.levels.find(level => level.level === 9);

      // Level Bonus
      this.system.details.xp.bonus = classItem.getXPBonus(this.system.abilities);

      // Level stuff
      if (levelData) {
         this.system.hp.hd = levelData.hd;
         this.system.thac0.value = levelData.thac0;
         //this.system.thbonus = levelData.thbonus;
         if (this.system.details.title == "" || this.system.details.title == null || this.system.details.title == prevLevelData?.title) {
            const ordinalized = Formatter.formatOrdinal(currentLevel);
            this.system.details.title = levelData.title === undefined ? `${ordinalized} Level ${nameLevel.title}` : levelData.title;
         }
      }
      if (nextLevelData) {
         this.system.details.xp.next = nextLevelData.xp;
      }
      this.system.details.species = this.system.details.species == "" || this.system.details.species == null ? classData.species : this.system.details.species;
      this.system.config.maxSpellLevel = classData.maxSpellLevel;

      // Spells
      const classSpellsIdx = this.system.details.level - 1;
      if (classData.spells?.length > 0 && classSpellsIdx < classData.spells.length) {
         // Get the spell progression for the given character level
         const spellProgression = classData.spells[classSpellsIdx];
         if (spellProgression === undefined || spellProgression === null || spellProgression.length === 0) {
            console.warn(`Class spells are empty for spellcaster ${this.name} (${this.system.details.class}). Max spells per level cannot be set.`, classData.spells);
         } else {
            // Loop through the spell slots in the this and update the 'max' values
            for (let slot of this.system.spellSlots) {
               const index = slot.spellLevel - 1;
               // Check if the index is within the spellProgression array bounds
               if (index >= 0 && index < spellProgression.length) {
                  // Set the max value based on the class spell progression
                  slot.max = spellProgression[index];
               } else {
                  // Set max to 0 if the character's class doesn't have spells at this level
                  slot.max = 0;
               }
            }
         }
      }
   }

   /**
    * Called by update actor event handler to update class and level data, if those changed.
    * @protected
    */
   async _updateLevelClass() {
      const className = this.system.details.class?.toLowerCase();
      const classItem = await fadeFinder.getClass(className);
      if (classItem) {
         // Get the class data for the character's current level.
         const currentLevel = Math.min(classItem.system.maxLevel, Math.max(classItem.system.firstLevel, this.system.details.level));

         this.system.thbonus = currentLevel.thbonus;

         // Saving throws
         const savesData = await ClassItem.getClassSaves(className, currentLevel);
         if (savesData) {
            await this._setupSavingThrows(savesData);
         }

         // Class special abilities
         const abilityNames = this.items.filter(item => item.type === 'specialAbility' && item.system.category === 'class').map(item => item.name);
         const abilitiesData = (await ClassItem.getClassAbilities(className, currentLevel))?.filter(item => abilityNames.includes(item.name) === false);
         if (abilitiesData && abilitiesData.length > 0) {
            const dialogResp = await DialogFactory({
               dialog: "yesno",
               title: game.i18n.localize('FADE.dialog.specialAbilities.title'),
               content: game.i18n.format('FADE.dialog.specialAbilities.content', {
                  name: this.system.details.class,
                  type: game.i18n.localize('FADE.Actor.Class')
               }),
               yesLabel: game.i18n.localize('FADE.dialog.yes'),
               noLabel: game.i18n.localize('FADE.dialog.no'),
               defaultChoice: "yes"
            }, this.actor);

            if (dialogResp?.resp?.result === true) {
               await this._setupSpecialAbilities(classItem.system.key, abilitiesData);
            }
         }
      }
   }

   /**
    * Called by update actor even halder to update species-related data.
    */
   async _updateSpecies() {
      const nameInput = this.system.details.species?.toLowerCase();
      const worldItem = await fadeFinder.getSpecies(nameInput);
      const actorItem = this.items.find(item => item.type === 'species');

      if (!worldItem) {
         //console.warn(`Class not found ${this.system.details.class}. Make sure to import item compendium.`);
         return;
      }

      // Manage the species embedded item
      if (actorItem) {
         actorItem.delete();
      }
      const itemData = [worldItem.toObject()];
      await this.createEmbeddedDocuments("Item", itemData);

      // Class special abilities
      const abilityIds = this.items.filter(item => item.type === 'specialAbility' && item.system.category === 'class').map(item=>item.id);
      const abilitiesData = (await SpeciesItem.getSpecialAbilities(nameInput))?.filter(item =>abilityIds.includes(item.id)===false);
      if (abilitiesData) {
         const dialogResp = await DialogFactory({
            dialog: "yesno",
            title: game.i18n.format('FADE.dialog.specialAbilities.title', { name: this.system.details.species }),
            content: game.i18n.format('FADE.dialog.specialAbilities.content', {
               name: this.system.details.species,
               type: game.i18n.localize('FADE.Actor.Species')
            }),
            yesLabel: game.i18n.localize('FADE.dialog.yes'),
            noLabel: game.i18n.localize('FADE.dialog.no'),
            defaultChoice: "yes"
         }, this.actor);

         if (dialogResp?.resp?.result === true) {
            await this._setupSpecialAbilities(worldItem.system.key, abilitiesData);
         }
      }
   }
}