import { DialogFactory } from "/systems/fantastic-depths/module/dialog/DialogFactory.mjs";
import { ClassDefinitionItem } from "/systems/fantastic-depths/module/item/ClassDefinitionItem.mjs";
import { FDItem } from "/systems/fantastic-depths/module/item/FDItem.mjs";
import { Formatter } from "/systems/fantastic-depths/module/utils/Formatter.mjs";
import { fadeFinder } from "/systems/fantastic-depths/module/utils/finder.mjs";

export class ClassSystemInterface {
   async clearClassData(actor, className) { throw new Error("Method not implemented."); }
   async createActorClass(actor, item) { throw new Error("Method not implemented."); }
   canCastSpells(actor) { throw new Error("Method not implemented."); }
   getRollData() { throw new Error("Method not implemented."); }
   get isMultiClassSystem() { throw new Error("Method not implemented."); }
   async onActorItemUpdate(actor, item, updateData) { throw new Error("Method not implemented."); }
   async onCharacterActorUpdate(actor, updateData) { throw new Error("Method not implemented."); }
   async resetSpells(actor, event) { throw new Error("Method not implemented."); }
   async setupMonsterClassMagic(actor) { throw new Error("Method not implemented."); }
   async setupSavingThrows(actor, savesData) { throw new Error("Method not implemented."); }
   prepareSpellSlotsContext(actor) { throw new Error("Method not implemented."); }
   prepareSpellsUsed(actor) { throw new Error("Method not implemented."); }
}

export class ClassSystemBase extends ClassSystemInterface {
   get isMultiClassSystem() {
      return false;
   }

   canCastSpells(actor) {
      return actor.system.config.maxSpellLevel > 0;
   }

   /**
    * Resets the cast count for all spells associated with a given actor.
    *
    * This asynchronous method retrieves all spell items from the actor's inventory 
    * and sets their cast count to zero. It then updates each spell item to reflect 
    * this change. After resetting the spells, a notification message is displayed 
    * to inform the user, and a chat message is created to log the reset action.
    * @public
    * @param {Object} actor - The actor object whose spells are to be reset.
    * @param {Event} event - The event object associated with the action (if applicable).
    * @returns {Promise<void>} - A promise that resolves when all spells have been reset and notifications are sent.
    */
   async resetSpells(actor, event) {
      const spells = actor.items.filter((item) => item.type === "spell");
      spells.forEach(async (spell) => {
         spell.system.cast = 0;
         await spell.update({ "system.cast": spell.system.cast });
      });

      const msg = game.i18n.format("FADE.Chat.resetSpells", { actorName: actor.name });
      ui.notifications.info(msg);
      // Create the chat message
      await ChatMessage.create({ content: msg });
   }

   async onCharacterActorUpdate(actor, updateData) { }

   /**
    * Call when an actor item is updated and let this method decide if the update requires
    * any class-related info to be updated.
    * @public
    * @param {any} actor The item's owning actor.
    * @param {any} item The item being updated.
    * @param {any} updateData The update data from the update event.
    */
   async onActorItemUpdate(actor, item, updateData) { }

   /**
    * Clears the class data for a specified actor and class name.
    *
    * This asynchronous method retrieves the class item based on the provided 
    * class name and resets the actor's class-related data, including title, 
    * experience points, attack bonuses, hit points, and spell slots. It also 
    * deletes any special abilities associated with the class and removes 
    * relevant items (weapons, armor, and class items) from the actor's inventory. 
    * If the specified class is not found, a warning is logged.
    * @public
    * @param {Object} actor - The actor object whose class data is to be cleared.
    * @param {string} className - The name of the class to be cleared from the actor.
    * @returns {Promise<void>} - A promise that resolves when the class data has been cleared.
    */
   async clearClassData(actor, className) {
      const classItem = await fadeFinder.getClass(className?.toLowerCase());
      if (!classItem) {
         console.warn(`Class not found ${className}.`);
         return;
      }
      const update = {
         details: {
            title: "",
            class: "",
            xp: {
               bonus: null,
               next: null
            }
         },
         thbonus: 0,
         hp: { hd: "" },
         thac0: { value: null },
         config: { maxSpellLevel: 0 },
         spellSlots: []
      };
      await actor.update({ system: update });
      const abilityNames = classItem.system.specialAbilities.map(item => item.name);
      const actorAbilities = actor.items.filter(item => item.type === "specialAbility" && item.system.category !== "save" && abilityNames.includes(item.name));
      for (let classAbility of actorAbilities) {
         classAbility.delete();
      }
      const itemNames = classItem.system.classItems.map(item => item.name);
      let actorItems = [...actor.items.filter(item => (item.type === "weapon" || item.type === "armor") && itemNames.includes(item.name)),
      ...actor.items.filter(item => item.type === "actorClass" && item.name === className)];

      for (let actorItem of actorItems) {
         actorItem.delete();
      }
   }

   /**
    * Pass in a value like C2 and get back a class item and level.
    * @public
    */
   async getClassItemForClassAs(classAs) {
      const match = classAs?.match(/^([a-zA-Z]+)(\d+)$/);
      const parsed = match ? { classId: match[1], classLevel: parseInt(match[2], 10) } : null;
      // Get the class item
      const classItem = await fadeFinder.getClass(null, parsed?.classId);
      if (!classItem) {
         console.warn(`Class not found for key ${classAs}.`);
         return;
      }
      return { classItem, classLevel: parsed.classLevel };
   }

   /**
    * Prepares class-related magic data when the class name is recognized.
    * Monsters use a single-class system no matter what.
    * @public
    */
   async setupMonsterClassMagic(actor) {
      if (game.user.isGM === false || (actor.system.details.castAs?.length ?? 0) === 0) return;
      const classAs = await this.getClassItemForClassAs(actor.system.details.castAs);
      if (classAs) {
         // Set this actor's level to be same as cast-as.
         await actor.update({ "system.details.level": (classAs.classLevel ?? 1) });
         const update = this._prepareClassInfoSpellSlots(actor, classAs.classItem.system);
         await actor.update({ system: update });
      }
   }

   /**
    * Prepares the used spells per level totals for data model.
    * This method assumes a single class but does not lok at actor class, only firstSpellLevel and naxSpellLevel.
    * @public
    */
   prepareSpellsUsed(actor) {
      if (actor.testUserPermission(game.user, "OWNER") === false) return;
      const firstSpellLevel = actor.system.config.firstSpellLevel;
      const maxSpellLevel = actor.system.config.maxSpellLevel;
      const spellLevelCount = (maxSpellLevel - firstSpellLevel) + 1;
      let spellSlots = [];
      if (maxSpellLevel > 0) {
         const spells = actor.items.filter((item) => item.type === "spell");
         spellSlots = [...actor.system.spellSlots];
         // Reset used spells to zero.
         // Note: This is not how many times it has been cast, but how many slots have been used.
         for (let i = 0; i < spellLevelCount; i++) {
            spellSlots[i] = spellSlots[i] || {};
            spellSlots[i].used = 0;
         }
         if (spells.length > 0) {
            for (let spell of spells) {
               const spellLevel = Math.max(0, spell.system.spellLevel);
               if (spell.system.spellLevel > maxSpellLevel) {
                  console.warn(`${actor.name} trying to setup spell level ${spell.system.spellLevel} but only has maxSpellLevel of ${maxSpellLevel}.`);
               } else if ((spellLevel - firstSpellLevel) < 0) {
                  console.warn(`${actor.name} trying to setup spell level ${spell.system.spellLevel} but firstSpellLevel is ${firstSpellLevel}.`);
               } else if (spell.system.memorized > 0) {
                  spellSlots[spellLevel - firstSpellLevel].used += spell.system.cast ?? 1;
               }
            }
         }
         if (spellSlots.length !== spellLevelCount) {
            console.warn(`${actor.name} has incorrect number of spell slots (${spellSlots.length}). There should be ${spellLevelCount} spell levels.`);
            if (spellSlots.length > spellLevelCount) {
               spellSlots.splice(spellLevelCount - spellSlots.length, spellSlots.length - spellLevelCount);
            }
         }
      }
      actor.system.spellSlots = spellSlots;
   }

   /**
     * Called by Character and Monster actor classes to update/add saving throws.
     * @param {*} actor The actor to setup saving throws for.
     * @param {any} savesData The values to use for the saving throws. This data normally
     *   comes from the class definition item and is not the saving throw special ability
     *   item itself. The structure is a json object with a key/value pair for each saving
     *   throw type. The key represents a customSaveCode.
     */
   async setupSavingThrows(actor, savesData) {
      if (game.user.isGM === false) return;
      const promises = [];
      // Get saving throw special ability items from finder.
      const savingThrowItems = await fadeFinder.getSavingThrows();
      // Get this actor's existing saving throw items.
      const actorSavingThrows = actor.items.filter(item => item.type === "specialAbility" && item.system.category === "save");

      // ------------------------------------------------
      // ADD SAVING THROWS IF NOT EXIST
      // Convert savesData to an array
      const saveEntries = Object.entries(savesData);
      const addItems = [];
      for (const saveData of saveEntries) {
         // Get the saving throw property name. This will either be "level" or the customSaveCode of a saving throw.
         const stName = saveData[0];
         // If this is not the level property, it can't be found in this actor's saving throws collection 
         // and has not already been added in this method call...
         if (stName !== "level" && actorSavingThrows.find(item => item.system.customSaveCode === stName) === undefined
            && addItems.find(item => item.system.customSaveCode === stName) === undefined) {
            // Get the saving throw item from the pack/world collection.
            const saveItem = savingThrowItems.find(item => item.system.customSaveCode === stName);

            if (saveItem && savesData[saveItem.system.customSaveCode] > 0) {
               const newSave = saveItem.toObject();
               const saveTarget = savesData[newSave.system.customSaveCode];
               newSave.system.target = saveTarget ?? 15;
               addItems.push(newSave);
            } else if (savesData[saveItem.system.customSaveCode] > 0) {
               console.warn(`The specified saving throw (${stName}) does not exist as a pack/world item.`);
            }
         }
      }
      if (addItems.length > 0) {
         //console.log(`Adding saving throw items to ${actor.name}`);
         promises.push(actor.createEmbeddedDocuments("Item", addItems));
      }

      // ------------------------------------------------
      // UPDATE SAVING THROW TARGETS
      // Iterate over actor's saving throw items and set their target if specified in savesData.
      for (const savingThrow of actorSavingThrows) {
         const saveTarget = savesData[savingThrow.system.customSaveCode];
         if (saveTarget) {
            promises.push(savingThrow.update({ "system.target": saveTarget }));
         }
      }

      if (promises.length > 0) {
         await Promise.all(promises);
      }
   }

   /**
    * Retrieves class data for a specified class name and level.
    *
    * This asynchronous method fetches the class item based on the provided class name 
    * and determines the current level of the class, ensuring it falls within the valid 
    * range defined by the class's first and maximum levels. It returns an object containing 
    * the class item, class data, current level, and data for the current, previous, and 
    * next levels, as well as the level data for level 9. If the class is not found, 
    * a warning is logged.
    * @protected
    * @param {string} className - The name of the class to retrieve data for.
    * @param {number} classLevel - The level of the class to be validated and retrieved.
    * @returns {Promise<Object|null>} - A promise that resolves to an object containing class data, or null if the class is not found.
    */
   async _getClassData(className, classLevel) {
      // Replace hyphen with underscore for "Magic-User"
      const nameInput = className.toLowerCase();
      const classItem = await fadeFinder.getClass(nameInput);
      if (!classItem) {
         if (nameInput !== null && nameInput !== "") {
            console.warn(`Class not found ${className}.`);
         }
         return;
      }
      const classData = classItem.system;
      const currentLevel = Math.min(classData.maxLevel, Math.max(classData.firstLevel, classLevel));

      // Make sure current level is within range of levels allowed for class.
      return {
         classItem,
         classData,
         currentLevel,
         levelData: classData.levels.find(level => level.level === currentLevel),
         prevLevelData: classData.levels.find(level => level.level === currentLevel - 1),
         nextLevelData: classData.levels.find(level => level.level === currentLevel + 1),
         nameLevel: classData.levels.find(level => level.level === 9),
      }
   }

   /**
    * Prepares and organizes spell slots for a given range of spell levels.
    *
    * This method initializes an array of spell slots based on the specified 
    * first and maximum spell levels. It then populates each spell slot with 
    * the corresponding spell items based on their spell levels. If a spell item's 
    * level is outside the range of available spell slots, a warning is logged. 
    * Each spell item is also assigned a default icon if none is provided.
    * @protected
    * @param {number} firstSpellLevel - The lowest spell level for the spell slots.
    * @param {number} maxSpellLevel - The highest spell level for the spell slots.
    * @param {Array} spellItems - An array of spell item objects to be organized into slots.
    * @param {Array} spellSlots - An array to be populated with organized spell slots.
    * @returns {Array} - The updated array of spell slots containing organized spells.
    */
   _prepareSpellSlots(firstSpellLevel, maxSpellLevel, spellItems, spellSlots) {
      const spellLevelCount = (maxSpellLevel - firstSpellLevel) + 1;
      for (let i = 0; i < spellLevelCount; i++) {
         spellSlots.push({ spells: [] })
      }
      for (let spellItem of spellItems) {
         spellItem.img = spellItem.img || Item.DEFAULT_ICON;
         const slotIndex = spellItem.system.spellLevel - firstSpellLevel;
         if (spellItem.system.spellLevel !== undefined && spellSlots?.length >= slotIndex && slotIndex >= 0) {
            spellSlots[slotIndex].spells.push(spellItem);
         } else {
            console.warn(`Not able to add spell ${spellItem.name} of level ${spellItem.system.spellLevel}. Caster only has ${spellSlots.length} spell slot(s).`);
         }
      }
      return spellSlots;
   }

   /**
    * Prepares the spell slot information for a given actor based on their class data.
    *
    * This method constructs an update object containing the spell slot configuration 
    * for the actor's class. It calculates the number of spell slots available based 
    * on the class's spell progression and the actor's current level. If the class has 
    * spells defined, it populates the spell slots with the maximum number of spells 
    * per level. If no spells are available for the actor's level, a warning is logged.
    * @protected
    * @param {Object} actor - The actor object for which spell slots are being prepared.
    * @param {Object} classData - The class data object containing spell progression information.
    * @returns {Object} - An object containing the updated spell slot configuration and counts.
    */
   _prepareClassInfoSpellSlots(actor, classData) {
      const update = {};
      update.config = {
         firstSpellLevel: classData.firstSpellLevel,
         maxSpellLevel: classData.maxSpellLevel
      };
      update.spellSlots = [];
      const spellSlotCount = (classData.maxSpellLevel - classData.firstSpellLevel) + 1;
      const classSpellsIdx = actor.system.details.level - classData.firstSpellLevel;
      if (classData.spells?.length > 0 && classSpellsIdx <= classData.spells.length && classSpellsIdx >= 0) {
         // Get the spell progression for the given character level
         const spellProgression = classData.spells[classSpellsIdx];
         if (spellProgression === undefined || spellProgression === null || spellProgression.length === 0) {
            console.warn(`Class spells are empty for spellcaster ${actor.name} (${actor.system.details.class}). Max spells per level cannot be set.`, classData.spells);
         } else {
            update.spellSlots = Array.from({ length: spellSlotCount }, () => ({ max: 0 }));
            for (let i = 0; i < update.spellSlots.length; i++) {
               // Set the max value based on the class spell progression
               update.spellSlots[i] = { max: spellProgression[i] };
            }
         }
      }
      return update;
   }

   _parseCastAsKey(castAsKey) {
      const match = castAsKey?.match(/^([A-Z]+)(\/)?(\d+)?$/i);
      if (!match) return null;

      const hasSymbol = match[2] === '/';
      const hasNumber = match[3] !== undefined;

      return {
         classKey: match[1],
         symbol: hasSymbol ? '/' : null,
         number: hasNumber ? parseInt(match[3], 10) : null
      };
   }
}

export class SingleClassSystem extends ClassSystemBase {
   /**
    * Initializes a new class for the specified actor.
    *
    * This asynchronous method updates the actor's system details to set the initial 
    * class information, including the class name, level, and spell level configurations. 
    * It sets the actor's level to 1 and configures the first and maximum spell levels 
    * based on the provided class item.
    * @public
    * @param {Object} actor - The actor object to which the new class will be assigned.
    * @param {Object} item - The class item object containing the class details to be applied.
    * @returns {Promise<void>} - A promise that resolves when the actor's class data has been updated.
    */
   async createActorClass(actor, item) {
      await actor.update({
         "system.details.level": 1,
         "system.details.class": item.name,
         "system.details.classKey": item.system.key,
         "system.details.castAsKey": item.system.castAsKey,
         "system.config.firstSpellLevel": item.system.firstSpellLevel,
         "system.config.maxSpellLevel": item.system.maxSpellLevel
      });
   }

   /**
    * Handles updates to the character actor's data and prepares class information.
    *
    * This asynchronous method is triggered when the actor's data is updated. 
    * It checks if the class, level, or abilities have been modified in the update data. 
    * If any of these properties are present, it calls methods to prepare class information 
    * and update the actor's level class accordingly.
    * @public
    * @param {Object} actor - The actor object representing the character being updated.
    * @param {Object} updateData - The data object containing the updates to be applied to the actor.
    * @returns {Promise<void>} - A promise that resolves when the class information and level updates are complete.
    */
   async onCharacterActorUpdate(actor, updateData, skipItems = false) {
      if (updateData.system?.details?.class !== undefined
         || updateData.system?.details?.level !== undefined
         || updateData.system?.abilities !== undefined) {
         await this.#prepareClassInfo(actor);
         await this.#updateLevelClass(actor, skipItems);
      }
   }

   /**
    * Prepares a context array of spell slots for the actor sheet.
    *
    * This public method constructs an object containing the actor's class name, 
    * the first and maximum spell levels, and an array of spell slots populated 
    * with the actor's spell items. It utilizes the `_prepareSpellSlots` method 
    * to organize the spell items into the appropriate slots based on their levels. 
    * The resulting object is returned as an array.
    * @public
    * @param {Object} actor - The actor object for which the spell slots context is being prepared.
    * @returns {Array} - An array containing the context object with spell slot information.
    */
   prepareSpellSlotsContext(actor) {
      const firstSpellLevel = actor.system.config.firstSpellLevel;
      const maxSpellLevel = actor.system.config.maxSpellLevel;
      const result = {
         className: actor.system.details.class,
         firstSpellLevel,
         maxSpellLevel,
         slots: this._prepareSpellSlots(firstSpellLevel, maxSpellLevel, [...actor.items.filter(item => item.type === "spell")], [])
      };
      return [result];
   }

   /**
    * Prepares class-related roll data for evaluating rolls and formulas.
    * @public
    * @param {any} actor - The actor object for which the roll data is being prepared.
    * @returns - An object with a class property that contains class level.
    */
   getRollData(actor) {
      const result = {};
      if (actor.type === "monster") {
         const classAs = actor.system.details.castAs;
         if ((classAs?.length ?? 0) >= 0) {
            const match = classAs?.match(/^([a-zA-Z]+)(\d+)$/);
            const parsed = match ? { classId: match[1], classLevel: parseInt(match[2], 10) } : null;
            if (parsed?.classId && typeof parsed?.classLevel === typeof 0) {
               result[parsed.classId] = { level: parsed.classLevel };
            }
         }
      } else if (actor.system.details?.classKey?.length > 0) {
         const classLevel = actor.system.details.level;
         let castLevel = classLevel;
         const classKey = actor.system.details.classKey;
         result[classKey] = {
            level: classLevel,
            castLevel
         };

         const castAsParsed = this._parseCastAsKey(actor.system.details.castAsKey);
         if (castAsParsed?.classKey) {
            // If castAsKey is different than character's class key...
            if (!result[castAsParsed.classKey]) {
               // Initialize result for class.
               result[castAsParsed.classKey] = { castLevel };
            }
            // If the castAsKey has a divisor...
            if (castAsParsed.symbol == "/" && castAsParsed.number > 0) {
               // Perform math calc and assign result to cast level.
               castLevel = Math.floor(classLevel / castAsParsed.number);               
               result[castAsParsed.classKey].castLevel = castLevel;
            }
         }
      }
      return result;
   }

   /**
    * Prepares and updates the class information for a given actor.
    * Ensures the actor has the necessary permissions and retrieves 
    * relevant class data based on the actor's current class and level.
    * Does not prepare saving throws or class special abilities which are done separately in onUpdateActor.
    * @private
    * @param {Object} actor - The actor whose class information is to be prepared.
    */
   async #prepareClassInfo(actor) {
      if (actor.testUserPermission(game.user, "OWNER") === false) return;
      if (game.user.isGM === false) return; // needed?

      const classDataObj = await this._getClassData(actor.system.details.class, actor.system.details.level);
      if (classDataObj) {
         const { classItem, classData, currentLevel, levelData, prevLevelData, nextLevelData, nameLevel } = classDataObj;
         let update = {
            details: {
               level: currentLevel,
               classKey: classData.key,
               castAsKey: classData.castAsKey,
               xp: {
                  bonus: classItem.getXPBonus(actor.system.abilities)
               }
            },
            combat: {
               // If false then take from class data, otherwise whatever character's value was set to.
               basicProficiency: classData.basicProficiency,
               unskilledToHitMod: classData.unskilledToHitMod,
            },
            hp: {},
            thac0: {},
         };

         // Level stuff
         if (levelData) {
            update.thbonus = levelData.thbonus;
            update.hp.hd = levelData.hd;
            update.thac0.value = levelData.thac0;
            if (actor.system.details.title == "" || actor.system.details.title == null || actor.system.details.title == prevLevelData?.title) {
               const ordinalized = Formatter.formatOrdinal(currentLevel);
               update.details.title = levelData.title === undefined ? `${ordinalized} Level ${nameLevel.title}` : levelData.title;
            }
         }

         if (nextLevelData) {
            update.details.xp.next = nextLevelData.xp;
         }

         update.details.species = actor.system.details.species == "" || actor.system.details.species == null ? classData.species : actor.system.details.species;

         // Spells         
         update = { ...update, ...this._prepareClassInfoSpellSlots(actor, classData) };

         await actor.update({ system: update });
      } else {
         ui.notifications.warn(`${actor.name}: ${actor.system.details.class} not found.`)
      }
   }

   /**
    * Updates the class and level data for the given actor, including saving throws and special abilities.
    * This method is called by the update Character event handler when class or level data changes.
    * @private
    * @param {Object} actor - The actor whose class and level data is to be updated.
    * @param {boolean} [skipItems=false] - Flag to skip updating items associated with the class.
    */
   async #updateLevelClass(actor, skipItems = false) {
      const className = actor.system.details.class?.toLowerCase();
      const classItem = await fadeFinder.getClass(className);

      if (classItem) {
         // Get the class data for the character's current level.
         const currentLevel = Math.min(classItem.system.maxLevel, Math.max(classItem.system.firstLevel, actor.system.details.level));

         // Saving throws
         const savesData = await fadeFinder.getClassSaves(className, currentLevel);
         if (savesData) {
            await this.setupSavingThrows(actor, savesData);
         }

         if (skipItems !== true) {
            // Class special abilities
            const abilityNames = actor.items.filter(item => item.type === "specialAbility").map(item => item.name);
            const validItemTypes = ClassDefinitionItem.ValidItemTypes;
            const itemNames = actor.items.filter(item => validItemTypes.includes(item.type)).map(item => item.name);
            const abilitiesData = await fadeFinder.getClassAbilities(className, currentLevel);
            const itemsData = await fadeFinder.getClassItems(className, currentLevel);
            if ((abilitiesData && abilitiesData.filter(item => abilityNames.includes(item.name) === false).length > 0)
               || (itemsData && itemsData.filter(item => itemNames.includes(item.name) === false).length > 0)) {
               const dialogResp = await DialogFactory({
                  dialog: "yesno",
                  title: game.i18n.localize("FADE.dialog.specialAbilities.title"),
                  content: game.i18n.format("FADE.dialog.specialAbilities.content", {
                     name: actor.system.details.class,
                     type: game.i18n.localize("FADE.Actor.Class")
                  }),
                  yesLabel: game.i18n.localize("FADE.dialog.yes"),
                  noLabel: game.i18n.localize("FADE.dialog.no"),
                  defaultChoice: "yes"
               }, actor);

               if (dialogResp?.resp?.result === true) {
                  await actor.setupSpecialAbilities(abilitiesData);
                  await actor._setupItems(itemsData);
               }
            } else {
               await actor.setupSpecialAbilities(abilitiesData);
               await actor._setupItems(itemsData);
            }
         }
      }
   }
}

export class MultiClassSystem extends ClassSystemBase {

   canCastSpells(actor) {
      let result = false;
      if (actor.type === "monster") {
         result = actor.system.config.maxSpellLevel > 0;
      } else if (actor.type === "character") {
         result = actor.items.filter(item => item.type === "actorClass" && item.system.maxSpellLevel > 0)?.length > 0;
      }
      return result;
   }

   get isMultiClassSystem() {
      return true;
   }

   /**
    * Call when an actor item is updated and let this method decide if the update requires
    * any class-related info to be updated.
    * @public
    * @param {any} actor The item's owning actor.
    * @param {any} item The item being updated.
    * @param {any} updateData The update data from the update event.
    */
   async onActorItemUpdate(actor, item, updateData) {
      if (item.type === "actorClass" && (updateData.system.level || updateData.name)) {
         await this.#updateActorClassData(actor, item, updateData);
         await this.#updateActorData(actor);
      }
   }

   /**
    * Creates a new actor class item and updates the associated actor's data.
    *
    * This asynchronous method takes an actor and an item representing a class,
    * extracts relevant information from the item, and creates a new actor class
    * item with the specified attributes. It then updates the actor's data to 
    * reflect the newly added class. The method returns the newly created item.
    * @public
    * @param {Object} actor - The actor object to which the new class will be added.
    * @param {Object} item - The item object representing the class to be created.
    * @returns {Promise<Object>} - A promise that resolves to the newly created actor class item.
    */
   async createActorClass(actor, item) {
      const classLevel = item.system.levels[0];
      const nextClassLevel = item.system.levels[1];
      const newItem = await FDItem.create({
         name: item.name,
         type: "actorClass",
         system: {
            classUuid: item.uuid,
            key: item.system.key,
            castAsKey: item.system.castAsKey,
            level: classLevel?.level,
            firstLevel: item.system.firstLevel,
            maxLevel: item.system.maxLevel,
            firstSpellLevel: item.system.firstSpellLevel,
            maxSpellLevel: item.system.maxSpellLevel,
            xp: {
               value: classLevel?.xp,
               next: nextClassLevel?.xp,
               bonus: 0
            },
            hd: classLevel?.hd,
            hdcon: classLevel?.hdcon,
            thac0: classLevel?.thac0,
            thbonus: classLevel?.thbonus,
            attackRank: classLevel?.attackRank,
            title: classLevel?.title,
            basicProficiency: item.system.basicProficiency,
            unskilledToHitMod: item.system.unskilledToHitMod,
         },
      }, { parent: actor });
      await this.#updateActorData(actor);
      return newItem;
   }

   /**
    * Prepares class-related roll data for evaluating rolls and formulas.
    * @public
    * @param {any} actor - The actor object for which the roll data is being prepared.
    * @returns - An object with a class property that contains class level.
    */
   getRollData(actor) {
      const result = {};

      if (actor.type === "monster") {
         const classAs = actor.system.details.castAs;
         if ((classAs?.length ?? 0) >= 0) {
            const match = classAs?.match(/^([a-zA-Z]+)(\d+)$/);
            const parsed = match ? { classId: match[1], classLevel: parseInt(match[2], 10) } : null;
            if (parsed?.classId && typeof parsed?.classLevel === typeof 0) {
               result[parsed.classId] = { level: parsed.classLevel };
            }
         }
      } else {
         for (let actorClass of actor.items.filter(item => item.type === "actorClass")) {
            result[actorClass.system.key] = { level: actorClass.system.level };
         }
      }

      return result;
   }

   /**
    * Used to create context array of spells slots for actor sheet.
    * @public
    * @param {any} actor
    * @returns
    */
   prepareSpellSlotsContext(actor) {
      const spellClasses = [];
      if (actor.type === "monster") {
         const firstSpellLevel = actor.system.config.firstSpellLevel;
         const maxSpellLevel = actor.system.config.maxSpellLevel;
         spellClasses.push({
            className: game.i18n.localize("Types.Actor.monster"),
            firstSpellLevel,
            maxSpellLevel,
            slots: this._prepareSpellSlots(firstSpellLevel, maxSpellLevel, [...actor.items.filter(item => item.type === "spell")], [])
         });
      } else {
         const casterClasses = actor.items.filter(item => item.type === "actorClass" && item.system.maxSpellLevel > 0);
         for (let casterClass of casterClasses) {
            const classSpells = actor.items.filter(item =>
               item.type === "spell" &&
               item.system.classes?.some(cls => cls.name === casterClass.name)
            );
            const firstSpellLevel = casterClass.system.firstSpellLevel;
            const maxSpellLevel = casterClass.system.maxSpellLevel;
            spellClasses.push({
               className: casterClass.name,
               firstSpellLevel,
               maxSpellLevel,
               slots: this._prepareSpellSlots(firstSpellLevel, maxSpellLevel, classSpells, [])
            });
         }
      }
      return spellClasses;
   }

   prepareSpellsUsed(actor) {

   }

   /**
    * The ActorClass item has been updated.
    * @private
    * @param {any} actor The owner of the updated actorClass.
    * @param {any} item The ActorClass item instance.
    * @param {any} updateData The updateData from the update event handler.
    */
   async #updateActorClassData(actor, item, updateData) {
      const classDataObj = await this._getClassData(item.name, updateData.system?.level);
      if (classDataObj) {
         const { classItem, classData, currentLevel, levelData, nextLevelData, nameLevel } = classDataObj;
         let update = {
            key: classData.key,
            castAsKey: classData.castAsKey,
            level: currentLevel,
            firstLevel: classData.firstLevel,
            maxLevel: classData.maxLevel,
            firstSpellLevel: classData.firstSpellLevel,
            maxSpellLevel: classData.maxSpellLevel,
            xp: {
               bonus: classItem.getXPBonus(actor.system.abilities)
            },
            // If false then take from class data, otherwise whatever character's value was set to.
            basicProficiency: classData.basicProficiency,
            unskilledToHitMod: classData.unskilledToHitMod,
         };

         // Level stuff
         if (levelData) {
            update.hd = levelData.hd;
            update.hdcon = levelData.hdcon;
            update.thac0 = levelData.thac0;
            update.thbonus = levelData.thbonus;
            const ordinalized = Formatter.formatOrdinal(currentLevel);
            update.title = levelData.title === undefined ? `${ordinalized} Level ${nameLevel.title}` : levelData.title;
         }

         if (nextLevelData) {
            update.xp.next = nextLevelData.xp;
         }

         // Spells
         // TODO: Update this for multi-class
         //update = { ...update, ...this.prepareSpellSlots(actor, classData) };

         await item.update({ system: update });
      } else {
         ui.notifications.warn(`${item.name} not found.`)
      }
   }

   /**
    * Updates the best saving throws based on the provided saves data.
    *
    * This method takes two objects: `savesData`, which contains the current saving throw values,
    * and `bestSavesData`, which holds the best saving throw values recorded so far.
    * It iterates through each saving throw in `savesData`, compares it with the corresponding
    * value in `bestSavesData`, and updates `bestSavesData` with the minimum value.
    * @private
    * @param {Object} savesData - An object containing the current saving throw values.
    * @param {Object} bestSavesData - An object containing the best saving throw values to be updated.
    * @returns {Object} - The updated `bestSavesData` object with the best saving throw values.
    */
   #getBestSavingThrows(savesData, bestSavesData) {
      const saveEntries = Object.entries(savesData).filter(item => item[0] !== "level");
      for (const saveData of saveEntries) {
         const saveName = saveData[0];
         bestSavesData[saveName] = Math.min(savesData[saveName], bestSavesData[saveName] ?? 100);
      }
      return bestSavesData;
   }

   /**
    * Updates the actor's data based on their class information and saving throws.
    *
    * This private asynchronous method retrieves and compiles various attributes 
    * of the actor's classes, including class names, levels, hit dice (HD), 
    * experience points (XP), and XP bonuses. It also calculates the best saving 
    * throws for the actor based on their class data. The method then updates the 
    * actor's system details with the compiled information.
    *
    * @private
    * @param {any} actor - The actor object whose data is to be updated.
    * @returns {Promise<void>} - A promise that resolves when the actor's data has been updated.
    */
   async #updateActorData(actor) {
      let classNames = "";
      let levels = "";
      let hds = "";
      let xps = "";
      let nextXps = "";
      let xpBonus = "";
      let bestSavesData = {};

      for (let actorClass of actor.items.filter(item => item.type === "actorClass")) {
         // Saving throws
         const savesData = await fadeFinder.getClassSaves(actorClass.name, actorClass.system.level);
         if (savesData) {
            bestSavesData = this.#getBestSavingThrows(savesData, bestSavesData);
         }

         classNames += `\\${actorClass.name}`;
         levels += `\\${actorClass.system.level}`;
         hds += `\\${actorClass.system.hd}`;
         xps += `\\${actorClass.system.xp.value}`;
         nextXps += `\\${actorClass.system.xp.next}`;
         xpBonus += `\\${actorClass.system.xp.bonus}`;
      }
      classNames = classNames.replace(/^\\/, "");
      levels = levels.replace(/^\\/, "");
      hds = hds.replace(/^\\/, "");
      xps = xps.replace(/^\\/, "");
      nextXps = nextXps.replace(/^\\/, "");
      xpBonus = xpBonus.replace(/^\\/, "");
      await actor.update({
         "system.details.class": classNames,
         "system.details.level": levels,
         "system.hp.hd": hds,
         "system.details.xp.value": xps,
         "system.details.xp.next": nextXps,
         "system.details.xp.bonus": xpBonus,
      });

      await this.setupSavingThrows(actor, bestSavesData);
   }
}