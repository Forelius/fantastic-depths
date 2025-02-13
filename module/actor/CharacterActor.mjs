// actor-character.mjs
import Formatter from '../utils/Formatter.mjs';
import { fadeActor } from './fadeActor.mjs';
import { ClassItem } from "../item/ClassItem.mjs";

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
   async updateActor(updateData, options, userId) {
      super.updateActor(updateData, options, userId)
      const isLoggingEnabled = await game.settings.get(game.system.id, "logCharacterChanges");
      const user = await game.users.get(userId);

      // Only proceed if logging is enabled and the update is by a player
      if (isLoggingEnabled && game.user.isGM) {
         // Get the old actor data before changes
         const oldActorData = updateData;

         // Log changes between the old and new data
         this.logActorChanges(updateData, oldActorData, user, "property");
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
    * @returns
    */
   async _prepareClassInfo() {
      // Replace hyphen with underscore for "Magic-User"
      const classNameInput = this.system.details.class?.toLowerCase();
      const classLevel = this.system.details.level;

      const classItem = ClassItem.getClassItem(classNameInput);
      const classData = classItem?.system;

      if (classData) {
         const currentLevel = classLevel;
         const levelData = classData.levels.find(level => level.level === currentLevel);
         const prevLevelData = classData.levels.find(level => level.level === currentLevel - 1);
         const nextLevelData = classData.levels.find(level => level.level === currentLevel + 1);
         const nameLevel = classData.levels.find(level => level.level === 9);

         // Level Bonus
         const { pr5Count, pr10Count } = classData.primeReqs.reduce((counts, primeReq) => {
            const value = this.system.abilities[primeReq.ability].value;
            if (value >= primeReq.xpBonus5) counts.pr5Count++;
            if (value >= primeReq.xpBonus10) counts.pr10Count++;
            return counts;
         }, { pr5Count: 0, pr10Count: 0 });
         this.system.details.xp.bonus = pr10Count === classData.primeReqs.length ? 10 : pr5Count === classData.primeReqs.length ? 5 : 0;

         // Level stuff
         if (levelData) {
            this.system.hp.hd = levelData.hd;
            this.system.thac0.value = levelData.thac0;
            this.system.thbonus = levelData.thbonus;
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
               //console.debug(`Class spells ${this.name}: spell levels ${spellProgression.length}, spell slots ${this.system.spellSlots.length}.`);
               // Loop through the spell slots in the this and update the 'max' values
               this.system.spellSlots.forEach((slot, index) => {
                  // Check if the index is within the spellProgression array bounds
                  if (index >= 0 && index < spellProgression.length) {
                     // Set the max value based on the class spell progression
                     slot.max = spellProgression[index];
                  } else {
                     // Set max to 0 if the character's class doesn't have spells at this level
                     slot.max = 0;
                  }
               });
            }
         }

         // Saving throws
         const savesData = ClassItem.getClassSaves(classNameInput, currentLevel);
         if (savesData) {
            await this._setupSavingThrows(savesData);
         }

         const abilitiesData = ClassItem.getClassAbilities(classNameInput, currentLevel);
         if (abilitiesData) {
            await this._setupSpecialAbilities(classItem.system.key, abilitiesData);
         }
      }

      return classData; // Return null if no match found
   }
}