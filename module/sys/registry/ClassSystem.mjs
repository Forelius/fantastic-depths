import { DialogFactory } from "../../dialog/DialogFactory.mjs";
import { ClassDefinitionItem } from "../../item/ClassDefinitionItem.mjs";
import { FDItem } from "../../item/FDItem.mjs";
import { Formatter } from "../../utils/Formatter.mjs";
import { fadeFinder } from "../../utils/finder.mjs";

export class ClassSystemBase {
   get isMultiClassSystem() {
      return false;
   }

   canCastSpells(actor) {
      return actor.system.config.maxSpellLevel > 0;
   }

   /**
    * Prepares a context array of spell slots for the actor sheet.
    *
    * This public method constructs an object containing the actor's class name, 
    * the first and maximum spell levels, and an array of spell slots populated 
    * with the actor's spell items. It utilizes the `_prepareSpellLevels` method 
    * to organize the spell items into the appropriate slots based on their levels. 
    * The resulting object is returned as an array.
    * @param {any} actor - The actor object for which the spell slots context is being prepared.
    * @returns {Promise<any[]>} - An array containing the context object with spell slot information.
    */
   async prepareSpellsContext(actor) { return []; }

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

   async onCharacterActorUpdate(actor, updateData, skipItems = false) { }

   /**
    * Call when an actor item is updated and let this method decide if the update requires
    * any class-related info to be updated.
    * @public
    * @param {any} actor The item's owning actor.
    * @param {any} item The item being updated.
    * @param {any} updateData The update data from the update event.
    */
   async onActorItemUpdate(actor, item, updateData, skipItems = false) { }

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
    * Pass in a value like C2 and get back an object with classItem and classLevel properties.
    * @public
    * @param {String} classAs The class-as key/level value. Example "F1" for Fighter of level 1.
    */
   async getClassItemForClassAs(classAs) {
      let result;
      const parsed = this.parseClassAs(classAs);
      if (parsed) {
         // Get the class item
         const classItem = await fadeFinder.getClass(null, parsed?.classId);
         if (!classItem) {
            console.warn(`Class not found for key ${classAs}.`);
         } else {
            result = { classItem, classLevel: parsed.classLevel };
         }
      }
      return result;
   }

   /**
    * Parsed a classAs value into its component parts.
    * @public
    * @param {any} classAs A two-part designator of class and level. Example: M2.
    * @returns An object contain classId and classLevel properties.
    */
   parseClassAs(classAs) {
      let result;
      if (classAs && classAs.length > 0) {
         const match = classAs?.match(/^([a-zA-Z]+)(\d+)$/);
         result = match ? { classId: match[1], classLevel: parseInt(match[2], 10) } : null;
      }
      return result;
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
      }
   }

   /**
     * Called by Character and Monster actor classes to update/add saving throws.
     * @public
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
    * Parsed hitdice into their component parts.
    * @param {any} hd The hitdice string
    * @returns An object with base, modifier, dieSides and sign properties.
    */
   getParsedHD(hd) {
      // Regular expression to check for a dice specifier like d<number>
      const diceRegex = /d(\d+)/;
      // Regular expression to capture the base number and any modifiers (+, -, *, /) that follow
      const modifierRegex = /([+\-*/]\d+)$/;
      const match = hd.match(diceRegex);
      let dieSides = 8;
      if (match) {
         dieSides = parseInt(match[1], 10);
      } else {
         dieSides = 8;
      }
      // If no dice specifier is found, check if there's a modifier like +1, *2, etc.
      let base = hd.replace(modifierRegex, ""); // Extract base number
      let modifier = hd.match(modifierRegex)?.[0] || 0; // Extract modifier (if any)
      base = parseFloat(base);
      modifier = parseInt(modifier, 10);
      const sign = modifier <= 0 ? "" : "+";
      return { base, modifier, dieSides, sign };
   }

   getHighestHD(actor) {
      return actor.system.hp.hd;
   }

   getHighestLevel(actor) {
      let result = 1;
      if (actor.type === "monster") {
         result = Number(actor.system.hp.hd ?? 1 < 1 ? 1 : actor.system.hp.hd);
      } else if (actor.type === "character") {
         result = Number(actor.system.details.level);
      }
      return result;
   }

   /**
    * For single class only. Monster is always single class.
    * @protected
    * @param {any} actor
    * @param {any} result
    */
   async _getUsedAndMaxSpells(actor, result) {
      let actorLevel;
      let classItem;

      if (actor.type === "monster") {
         const classAs = await this.getClassItemForClassAs(actor.system.details.castAs);
         classItem = classAs?.classItem;
         actorLevel = classAs?.classLevel;
      } else if (actor.type === "character") {
         actorLevel = Number(actor.system.details.level);
         classItem = await fadeFinder.getClass(actor.system.details.class);
      }

      if (classItem && actorLevel >= classItem.system.firstLevel) {
         const classLevelSpells = classItem.system.spells[actorLevel - classItem.system.firstLevel];
         for (let i = 0; i < result.slots.length; i++) {
            result.slots[i].max = classLevelSpells[i];
            result.slots[i].used = result.slots[i].spells.reduce((used, spell) => used + spell.system.cast, 0);
         }
      }
   }

   /**
    * Retrieves class data for a specified class name and level.
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
    * This method initializes an array of spell slots based on the specified 
    * first and maximum spell levels. It then populates each spell slot with 
    * the corresponding spell items based on their spell levels. If a spell item's 
    * level is outside the range of available spell slots, a warning is logged. 
    * Each spell item is also assigned a default icon if none is provided.
    * @protected
    * @param {number} firstSpellLevel - The lowest spell level for the spell slots.
    * @param {number} maxSpellLevel - The highest spell level for the spell slots.
    * @param {Array} spellItems - An array of spell item objects to be organized into slots.
    * @param {Array} spellLevels - An array to be populated with organized spell slots.
    * @returns {Array} - The updated array of spell slots containing organized spells.
    */
   _prepareSpellLevels(firstSpellLevel, maxSpellLevel, spellItems, spellLevels) {
      const spellLevelCount = (maxSpellLevel - firstSpellLevel) + 1;
      for (let i = 0; i < spellLevelCount; i++) {
         spellLevels.push({ spells: [] })
      }
      for (let spellItem of spellItems) {
         spellItem.img = spellItem.img || Item.DEFAULT_ICON;
         const slotIndex = spellItem.system.spellLevel - firstSpellLevel;
         if (spellItem.system.spellLevel !== undefined && spellLevels?.length >= slotIndex && slotIndex >= 0) {
            spellLevels[slotIndex].spells.push(spellItem);
         } else {
            console.warn(`Not able to add spell ${spellItem.name} of level ${spellItem.system.spellLevel}. Caster only has ${spellLevels.length} spell slot(s).`);
         }
      }
      return spellLevels;
   }

   /**
    * Parses a "castAs" key string into its component parts: class key, optional symbol, and optional number.
    * Note: The symbol portion of the castAsKey might contain the divide "/" symbol and this would be used to
    *       specify that the caster level should be divided by an arbitrary value. 
    *       Example: "C/2" would be a Cleric's level divided by 2.
    * @param {String} castAsKey - The input string to parse.
    * @returns {object|null} An object with `classKey`, `symbol`, and `number` fields, or `null` if the format is invalid.
    */
   _parseCastAsKey(castAsKey) {
      const match = castAsKey?.match(/^([A-Z]+)(\/)?(\d+)?$/i);
      if (!match) return null;

      const hasSymbol = match[2] === "/";
      const hasNumber = match[3] !== undefined;

      return {
         classKey: match[1],
         symbol: hasSymbol ? "/" : null,
         number: hasNumber ? parseInt(match[3], 10) : null
      };
   }

   /**
    * Used to populate castAs roll data for an actor.
    * @param {any} classLevel The class level
    * @param {any} classKey The class key
    * @param {any} castAsKey The full castAs key.
    * @returns An object with a property matching the class key and a castLevel property value equal to the class level.
    *          Example: result.M.castLevel = 2
    */
   getLevelAndCastAsLevel(classLevel, classKey, castAsKey) {
      const result = {};
      let castLevel = classLevel;
      result[classKey] = {
         level: classLevel,
         castLevel
      };

      const castAsParsed = this._parseCastAsKey(castAsKey);
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
      return result;
   }

   async getXpNeeded(actorIds = null) {
      // Get all tracked actors
      actorIds = actorIds || game.settings.get(game.system.id, 'partyTrackerData') || [];
      const trackedActors = actorIds.map(id => game.actors.get(id)).filter(actor => actor);
      let output = "<h2>XP Needed</h2><ul>";

      for (const actor of trackedActors) {
         if (actor.type !== "character") continue;

         const actorClass = await this.getActorClassData(actor);
         const className = actorClass?.name;
         if (!className) continue;
         const level = actorClass.system.level ?? 1;

         // Determine prevXP (0 if level=1, else XP of (level-1))
         let prevXP = 0;
         if (level > 1) {
            prevXP = actorClass.system.xp.current;
         }

         // Determine nextXP (if it exists)
         if (actorClass.system.level >= actorClass.system.maxLevel) {
            output += `
        <li><strong>${actor.name}</strong> (Level ${level}):
          No higher level data (max level?)
        </li>`;
            continue;
         }

         const nextXP = actorClass.system.xp.next;
         const difference = nextXP - prevXP;

         // Use toLocaleString() to add commas
         const currentXPStr = actor.system.details.xp.value.toLocaleString();
         const nextXPStr = nextXP.toLocaleString();
         const differenceStr = difference.toLocaleString();
         const oneTenthStr = Math.floor(difference / 10).toLocaleString();
         const oneTwentiethStr = Math.floor(difference / 20).toLocaleString();

         // Format a single line of info
         output += `
      <li>
        <strong>${actor.name}</strong> (Level ${level}/XP ${currentXPStr})<br/>
        Next XP: ${nextXPStr} |
        Needed: ${differenceStr}<br/>
        1/10: <strong>${oneTenthStr}</strong>, 
        1/20: <strong>${oneTwentiethStr}</strong>
      </li>`;
      }

      output += "</ul>";

      // Whisper to GM(s)
      ChatMessage.create({
         content: output,
         whisper: ChatMessage.getWhisperRecipients("GM")
      });
   }

   async getActorClassData(actor) {
      if (actor.system.details?.class && actor.system.details?.level != null) {
         const classDefinition = await fadeFinder.getClass(actor.system.details.class);
         const classLevel = classDefinition.system.levels.find(i => i.level == actor.system.details.level);
         const nextClassLevel = classDefinition.system.levels.find(i => Number(i.level) == Number(actor.system.details.level) + 1);
         if (classLevel !== undefined && nextClassLevel !== undefined) {
            return {
               name: actor.system.details.class,
               system: {
                  key: classDefinition.system.key,
                  castAsKey: classDefinition.system.castAsKey,
                  level: Number(actor.system.details?.level) ?? 0,
                  firstLevel: Number(classDefinition.system.firstLevel) ?? 0,
                  maxLevel: Number(classDefinition.system.maxLevel) ?? 0,
                  xp: {
                     current: Number(classLevel?.xp) ?? 0,
                     value: Number(actor.system.details?.xp.value) ?? 0,
                     next: Number(nextClassLevel?.xp) ?? 0,
                     bonus: Number(actor.system.details?.xp.bonus) ?? 0
                  }
               }
            }
         }
      }
   }

   async _promptAddAbilityItems(actor, className, currentLevel) {
      const abilityNames = actor.items.filter(item => item.type === "specialAbility").map(item => item.name);
      const itemNames = actor.items.filter(item => ClassDefinitionItem.ValidItemTypes.includes(item.type)).map(item => item.name);
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
            await actor.setupItems(itemsData, ClassDefinitionItem.ValidItemTypes);
         }
      } else {
         await actor.setupSpecialAbilities(abilitiesData);
         await actor.setupItems(itemsData, ClassDefinitionItem.ValidItemTypes);
      }
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
      if ((actor.system.details?.class && actor.system.details?.level != null)
         && (updateData.system?.details?.class !== undefined
            || updateData.system?.details?.level !== undefined
            || updateData.system?.abilities !== undefined)) {
         await this.#prepareClassInfo(actor);
         // This is kludgey. Filter out updates caused by setting an ability score's min property.
         const isOnlyMin = updateData.system?.abilities ? Object.values(updateData.system.abilities).every(entry => {
            const keys = Object.keys(entry); return keys.length === 1 && keys[0] === "min";
         }) : false;

         // This method might set an ability score's min property and it should not retrigger this.
         if (isOnlyMin === false) {
            await this.#updateLevelClass(actor, skipItems);
         }
      } else if (actor.system.details?.class === "") {
         let update = {
            details: {
               classKey: null,
               castAsKey: null,
               xp: {
                  bonus: "0",
                  next: "0"
               }
            },
            abilities: {},
            config: {
               maxSpellLevel: 0
            }
         };
         // Get ability scores from actor
         for (let [akey, aval] of Object.entries(actor.system.abilities)) {
            update.abilities[akey] = { min: 1 };
         }
         await actor.update({ system: update });
      }
   }

   /**
    * Prepares a context array of spell slots for the actor sheet.
    *
    * This public method constructs an object containing the actor's class name, 
    * the first and maximum spell levels, and an array of spell slots populated 
    * with the actor's spell items. It utilizes the `_prepareSpellLevels` method 
    * to organize the spell items into the appropriate slots based on their levels. 
    * The resulting object is returned as an array.
    * @override
    * @param {any} actor - The actor object for which the spell slots context is being prepared.
    * @returns {Promise<any[]>} - An array containing the context object with spell slot information.
    */
   async prepareSpellsContext(actor) {
      const firstSpellLevel = actor.system.config.firstSpellLevel;
      const maxSpellLevel = actor.system.config.maxSpellLevel;
      const spellAbility = actor.items.find(i => i.type === "specialAbility" && i.system.category === "spellcasting");
      // Enrich biography info for display
      // Enrichment turns text like `[[/r 1d20]]` into buttons
      // TODO: Remove after v12 support.
      const textEditorImp = foundry?.applications?.ux?.TextEditor?.implementation ? foundry.applications.ux.TextEditor.implementation : TextEditor;
      const spellAbilityDesc = spellAbility ? await textEditorImp.enrichHTML(spellAbility.system.description, {
         rollData: actor.getRollData(),
         relativeTo: actor,
      }) : null;
      const result = {
         className: actor.system.details.class,
         spellAbilityId: spellAbility?.id,
         spellAbilityDesc,
         firstSpellLevel,
         maxSpellLevel,
         slots: this._prepareSpellLevels(firstSpellLevel, maxSpellLevel, [...actor.items.filter(item => item.type === "spell")], [])
      };
      // Determine used and max spells
      await this._getUsedAndMaxSpells(actor, result);
      return [result];
   }

   /**
    * Prepares class-related roll data for evaluating rolls and formulas.
    * @public
    * @param {any} actor - The actor object for which the roll data is being prepared.
    * @returns - An object with a class property that contains class level.
    */
   getRollData(actor) {
      let result = {};
      if (actor.type === "monster") {
         const classAs = actor.system.details.castAs;
         if ((classAs?.length ?? 0) >= 0) {
            const parsed = this.parseClassAs(classAs);
            if (parsed?.classId && typeof parsed?.classLevel === typeof 0) {
               result[parsed.classId] = { level: parsed.classLevel };
            }
         }
      } else if (actor.system.details?.classKey?.length > 0) {
         result = this.getLevelAndCastAsLevel(actor.system.details.level, actor.system.details.classKey, actor.system.details.castAsKey);
      }
      return result;
   }

   async calcXPAward(actor, amount) {
      // If there's a bonus % in actor.system.details.xp.bonus
      const bonusPct = Number(actor.system.details?.xp?.bonus ?? 0) / 100;
      return [amount + Math.floor(amount * bonusPct)];
   }

   async awardXP(actor, amounts) {
      const amount = Number(amounts || 0);
      if (amount) {
         const currentXP = Number(foundry.utils.getProperty(actor, "system.details.xp.value") ?? 0);
         const finalXP = currentXP + amount;
         const msg = game.i18n.format("FADE.dialog.awardXP.awardedCharacter", { name: actor.name, amount });
         ChatMessage.create({ user: game.user.id, content: msg });
         await actor.update({ "system.details.xp.value": finalXP });
      } else {
         console.warn(`Invalid XP amount specified for ${actor.name}.`, amounts);
      }
   }

   /**
    * Prepares and updates the class information for a given actor.
    * Ensures the actor has the necessary permissions and retrieves 
    * relevant class data based on the actor's current class and level.
    * Does not prepare saving throws or class special abilities which are done separately in onUpdateActor.
    * @param {any} actor - The actor whose class information is to be prepared.
    * @returns {Promise<void>}
    */
   async #prepareClassInfo(actor) {
      if (actor.testUserPermission(game.user, "OWNER") === false) return;

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
            update.abilities = await actor.setupMinAbilityScores(classItem.system.abilities);
         }

         if (nextLevelData) {
            update.details.xp.next = nextLevelData.xp;
         }

         update.details.species = actor.system.details.species == "" || actor.system.details.species == null ? classData.species : actor.system.details.species;

         await actor.update({ system: update });
      } else {
         ui.notifications.warn(`${actor.name}: ${actor.system.details.class} not found.`);
      }
   }

   /**
    * Updates the class and level data for the given actor, including saving throws and special abilities.
    * This method is called by the update Character event handler when class or level data changes.
    * @param {any} actor - The actor whose class and level data is to be updated.
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
            await this._promptAddAbilityItems(actor, className, currentLevel);
         }
      }
   }
}

export class MultiClassSystem extends ClassSystemBase {

   async getActorClassData(actor) {
      return actor.items.find(i => i.type === "actorClass" && i.system.isPrimary === true);
   }

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
   async onActorItemUpdate(actor, item, updateData, skipItems = false) {
      if (item.type === "actorClass" && (updateData.system.level !== undefined
         || updateData.name !== undefined
         || updateData.system.isPrimary !== undefined)) {
         await this.#updateActorClassData(actor, item, updateData);
      }
      if (item.type === "actorClass" && (updateData.system.level !== undefined
         || updateData.name !== undefined
         || updateData.system.isPrimary !== undefined
         || updateData.system.xp !== undefined)) {
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
               current: classLevel?.xp,
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
      let result = {};

      if (actor.type === "monster") {
         const classAs = actor.system.details.castAs;
         if ((classAs?.length ?? 0) >= 0) {
            const parsed = this.parseClassAs(classAs);
            if (parsed?.classId && typeof parsed?.classLevel === typeof 0) {
               result[parsed.classId] = { level: parsed.classLevel };
            }
         }
      } else {
         for (let actorClass of actor.items.filter(item => item.type === "actorClass")) {
            result = { ...result, ...this.getLevelAndCastAsLevel(actorClass.system.level, actorClass.system.key, actorClass.system.castAsKey) };
         }
      }

      return result;
   }

   /**
    * Used to create context array of spells slots for actor sheet.
    * @public
    * @param {any} actor
    * @returns {Promise<Array>}
    */
   async prepareSpellsContext(actor) {
      const spellClasses = [];
      // TODO: Remove after v12 support.
      const textEditorImp = foundry?.applications?.ux?.TextEditor?.implementation ? foundry.applications.ux.TextEditor.implementation : TextEditor;

      if (actor.type === "monster") {
         const firstSpellLevel = actor.system.config.firstSpellLevel;
         const maxSpellLevel = actor.system.config.maxSpellLevel;
         const classAs = await this.getClassItemForClassAs(actor.system.details.castAs);
         const spellAbility = actor.items.find(i => i.type === "specialAbility" && i.system.category === "spellcasting" && i.system.classKey === classAs?.classItem?.system.key);
         // Enrich biography info for display
         // Enrichment turns text like `[[/r 1d20]]` into buttons
         const spellAbilityDesc = spellAbility ? await textEditorImp.enrichHTML(spellAbility.system.description, {
            rollData: actor.getRollData(),
            relativeTo: actor,
         }) : null;

         if (classAs) {
            spellClasses.push({
               className: classAs?.classItem?.name,
               firstSpellLevel,
               maxSpellLevel,
               spellAbilityId: spellAbility?.id,
               spellAbilityDesc,
               slots: this._prepareSpellLevels(firstSpellLevel, maxSpellLevel, [...actor.items.filter(item => item.type === "spell")], [])
            });
            // Determine used and max spells
            await this._getUsedAndMaxSpells(actor, spellClasses);
         }
      } else {
         const casterClasses = actor.items.filter(item => item.type === "actorClass" && item.system.maxSpellLevel > 0);

         for (let casterClass of casterClasses) {
            const classSpells = actor.items.filter(item => item.type === "spell" && item.system.classes?.some(cls => cls.name === casterClass.name));
            const firstSpellLevel = casterClass.system.firstSpellLevel;
            const maxSpellLevel = casterClass.system.maxSpellLevel;
            const spellAbility = actor.items.find(i => i.type === "specialAbility" && i.system.category === "spellcasting" && i.system.classKey === casterClass.system.key);
            // Enrich biography info for display
            // Enrichment turns text like `[[/r 1d20]]` into buttons
            const spellAbilityDesc = spellAbility ? await textEditorImp.enrichHTML(spellAbility.system.description, {
               rollData: actor.getRollData(),
               relativeTo: actor,
            }) : null;
            const slots = this._prepareSpellLevels(firstSpellLevel, maxSpellLevel, classSpells, []);
            spellClasses.push({
               className: casterClass.name,
               firstSpellLevel,
               maxSpellLevel,
               spellAbilityId: spellAbility?.id,
               spellAbilityDesc,
               slots
            });

            const castAs = casterClass.system.castAsKey === "" || casterClass.system.castAsKey === null ? casterClass.system.key : casterClass.system.castAsKey;
            const castAsParsed = this._parseCastAsKey(castAs);

            if (castAsParsed?.classKey) {
               const classItem = await fadeFinder.getClass(null, castAsParsed?.classKey);
               const classLevelSpells = classItem.system.spells[casterClass.system.level - classItem.system.firstLevel];
               for (let i = 0; i < slots.length; i++) {
                  slots[i].max = classLevelSpells[i];
                  slots[i].used = slots[i].spells.reduce((used, spell) => used + spell.system.cast, 0);
               }
            }
         }
      }

      return spellClasses;
   }

   async calcXPAward(actor, amount) {
      const actorClasses = actor.items.filter(item => item.type === "actorClass");
      const hasPrimary = actor.items.some(item => item.type === "actorClass" && item.system.isPrimary === true);
      const primaries = actor.items.filter(item => item.type === "actorClass" && (item.system.isPrimary === true || hasPrimary === false));
      const indivAmount = Math.floor(amount / (primaries?.length ?? 1));
      const amounts = [];
      for (let actorClass of actorClasses) {
         if (hasPrimary === false || actorClass.system.isPrimary === true) {
            amounts.push((Math.floor(Number((actorClass.system.xp.bonus ?? 0) / 100) * indivAmount)) + indivAmount);
         } else {
            amounts.push("--");
         }
      }
      return amounts;
   }

   async awardXP(actor, amounts) {
      let xps = (input => input.split("/").map(part => /^\d+$/.test(part) ? Number(part) : null))(amounts);
      const actorClasses = actor.items.filter(item => item.type === "actorClass");
      if (xps?.length > 0 && xps?.length == actorClasses?.length) {
         const hasPrimary = actor.items.some(item => item.type === "actorClass" && item.system.isPrimary === true);
         let index = 0;
         for (let actorClass of actorClasses) {
            const currentXP = Number(foundry.utils.getProperty(actorClass, "system.xp.value") ?? 0);
            const finalXP = Number(xps[index]) + currentXP;
            if (hasPrimary === false || actorClass.system.isPrimary === true) {
               await actorClass.update({ "system.xp.value": finalXP });
               const msg = game.i18n.format("FADE.dialog.awardXP.awardedCharacter", { name: actor.name, amount: xps[index] });
               ChatMessage.create({ user: game.user.id, content: msg });
            }
            index++;
         }
      } else {
         //ui.notifications.warn(`Invalid value specified for ${actor.name}. ${amounts}`);
         console.warn(`Invalid XP amount specified for ${actor.name}.`, amounts);
      }
   }

   getHighestHD(actor) {
      if (actor.type === "monster") {
         return super.getHighestHD(actor);
      }
      let hd = null;
      let highestBase = 0;
      const actorClasses = actor.items.filter(item => item.type === "actorClass");
      for (let actorClass of actorClasses) {
         if (actorClass.system.hd) {
            const { base, modifier, dieSides, sign } = this.getParsedHD(actorClass.system.hd);
            if (highestBase < base) {
               highestBase = base;
               hd = actorClass.system.hd;
            }
         } else {
            console.warn(`Actor class ${actorClass?.name} for ${actor.name} has no hit dice.`);
         }
      }
      return hd ?? actor.system.hp.hd;
   }

   getHighestLevel(actor) {
      let result = 1;
      if (actor.type === "monster") {
         result = super.getHighestLevel(actor);
      } else if (actor.type === "character") {
         const actorClasses = actor.items.filter(item => item.type === "actorClass");
         for (let actorClass of actorClasses) {
            if (actorClass.system.level) {
               if (result < actorClass.system.level) {
                  result = actorClass.system.level;
               }
            } else {
               console.warn(`Actor class ${actorClass?.name} for ${actor.name} has no level.`);
            }
         }
      }
      return result;
   }

   /**
    * The ActorClass item has been updated.
    * @param {any} actor The owner of the updated actorClass.
    * @param {any} item The ActorClass item instance.
    * @param {any} updateData The updateData from the update event handler.
    */
   async #updateActorClassData(actor, item, updateData) {
      const classDataObj = await this._getClassData(item.name, (updateData.system?.level ?? item.system.level));
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
            update.xp.current = levelData.xp;
         }

         if (nextLevelData) {
            update.xp.next = nextLevelData.xp;
         }

         await item.update({ system: update });
      } else {
         ui.notifications.warn(`${item.name} not found.`)
      }
   }

   /**
    * Updates the best saving throws based on the provided saves data.
    * This method takes two objects: `savesData`, which contains the current saving throw values,
    * and `bestSavesData`, which holds the best saving throw values recorded so far.
    * It iterates through each saving throw in `savesData`, compares it with the corresponding
    * value in `bestSavesData`, and updates `bestSavesData` with the minimum value.
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
    * This private asynchronous method retrieves and compiles various attributes 
    * of the actor's classes, including class names, levels, hit dice (HD), 
    * experience points (XP), and XP bonuses. It also calculates the best saving 
    * throws for the actor based on their class data. The method then updates the 
    * actor's system details with the compiled information.
    * @param {any} actor - The actor object whose data is to be updated.
    * @returns {Promise<void>} - A promise that resolves when the actor's data has been updated.
    */
   async #updateActorData(actor, skipItems = false) {
      let classNames = "";
      let levels = "";
      let hds = "";
      let xps = "";
      let nextXps = "";
      let xpBonus = "";
      let bestSavesData = {};
      const hasPrimary = actor.items.some(item => item.type === "actorClass" && item.system.isPrimary === true);

      for (let actorClass of actor.items.filter(item => item.type === "actorClass")) {
         // If current actor class is a primary class or there are no primary classes...
         if (hasPrimary === false || actorClass.system.isPrimary === true) {
            // Saving throws
            const savesData = await fadeFinder.getClassSaves(actorClass.name, actorClass.system.level);
            if (savesData) {
               bestSavesData = this.#getBestSavingThrows(savesData, bestSavesData);
            }
         }

         if (skipItems !== true) {
            // Class special abilities
            await this._promptAddAbilityItems(actor, actorClass.name, actorClass.system.level);
         }

         classNames += `\\${actorClass.name}`;
         levels += `\\${actorClass.system.level}`;
         //hds += `\\${actorClass.system.hd}`;
         xps += `\\${actorClass.system.xp.value}`;
         if (actorClass.system.isPrimary || hasPrimary === false) {
            hds += `\\${actorClass.system.hd}`;
            nextXps += `\\${actorClass.system.xp.next}`;
            xpBonus += `\\${actorClass.system.xp.bonus}`;
         } else {
            hds += `\\--`;
            nextXps += `\\--`;
            xpBonus += `\\--`;
         }
      }
      await this.setupSavingThrows(actor, bestSavesData);

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
   }
} 