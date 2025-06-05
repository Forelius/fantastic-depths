import { DialogFactory } from "/systems/fantastic-depths/module/dialog/DialogFactory.mjs";
import { ClassDefinitionItem } from "/systems/fantastic-depths/module/item/ClassDefinitionItem.mjs";
import { FDItem } from "/systems/fantastic-depths/module/item/FDItem.mjs";
import { Formatter } from "/systems/fantastic-depths/module/utils/Formatter.mjs";
import { fadeFinder } from "/systems/fantastic-depths/module/utils/finder.mjs";

export class ClassSystemBase {
   get isMultiClassSystem() {
      return false;
   }

   canCastSpells(actor) {
      return actor.system.config.maxSpellLevel > 0;
   }

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
   async onActorItemUpdate(actor, item, updateData) { }

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

   async getClassData(className, classLevel) {
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
    * Prepares class-related magic data when the class name is recognized.
    * @public
    */
   async setupMonsterClassMagic(actor) {
      if (game.user.isGM === false || (actor.system.details.castAs?.length ?? 0) === 0) return;

      const match = actor.system.details.castAs?.match(/^([a-zA-Z]+)(\d+)$/);
      const parsed = match ? { classId: match[1], classLevel: parseInt(match[2], 10) } : null;      
      // Get the class item
      const classItem = await fadeFinder.getClass(null, parsed?.classId);
      if (!classItem) {
         console.warn(`Class not found for key ${actor.system.name}. Cast As: ${actor.system.details.castAs}.`);
         return;
      }

      // Set this actor's level to be same as cast-as.
      await actor.update({ "system.details.level": (parsed?.classLevel ?? 1) });

      const update = this._prepareClassInfoSpellSlots(actor, classItem.system);
      await actor.update({ system: update });
   }

   /**
    * Prepares the used spells per level totals for data model.
    * This method assumes a single class.
    * @public
    */
   prepareSpellsUsed(actor) {
      if (actor.testUserPermission(game.user, "OWNER") === false) return;
      const firstSpellLevel = actor.system.config.firstSpellLevel;
      const maxSpellLevel = actor.system.config.maxSpellLevel;
      const spellLevelCount = maxSpellLevel - firstSpellLevel + 1;
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

   _prepareSpellSlots(actor, spellItems, spellSlots) {
      for (let i = 0; i < actor.system.config.maxSpellLevel; i++) {
         spellSlots.push({ spells: [] })
      }
      for (let spellItem of spellItems) {
         spellItem.img = spellItem.img || Item.DEFAULT_ICON;
         const spellLevel = Math.max(0, spellItem.system.spellLevel - 1);
         if (spellItem.system.spellLevel !== undefined && spellSlots?.length >= spellItem.system.spellLevel) {
            spellSlots[spellLevel].spells.push(spellItem);
         } else {
            console.warn(`Not able to add spell ${spellItem.name} of level ${spellItem.system.spellLevel} to ${actor.name}. Caster only has ${spellSlots.length} spell slot(s).`);
         }
      }
      return spellSlots;
   }

   /**
    * Assumes single-class actor
    * @param {any} actor
    * @param {any} classData
    * @returns
    */
   _prepareClassInfoSpellSlots(actor, classData) {
      const update = {};
      update.config = { maxSpellLevel: classData.maxSpellLevel };
      update.spellSlots = [];
      const classSpellsIdx = actor.system.details.level;
      if (classData.spells?.length > 0 && classSpellsIdx <= classData.spells.length) {
         // Get the spell progression for the given character level
         const spellProgression = classData.spells[classSpellsIdx];
         if (spellProgression === undefined || spellProgression === null || spellProgression.length === 0) {
            console.warn(`Class spells are empty for spellcaster ${actor.name} (${actor.system.details.class}). Max spells per level cannot be set.`, classData.spells);
         } else {
            update.spellSlots = Array.from({ length: classData.maxSpellLevel }, () => ({ max: 0 }));
            for (let i = 0; i < update.spellSlots.length; i++) {
               // Set the max value based on the class spell progression
               update.spellSlots[i] = { max: spellProgression[i] };
            }
         }
      }
      return update;
   }
}

export class SingleClassSystem extends ClassSystemBase {

   async onCharacterActorUpdate(actor, updateData) {
      if (updateData.system?.details?.class !== undefined
         || updateData.system?.details?.level !== undefined
         || updateData.system?.abilities !== undefined) {
         await this.#prepareClassInfo(actor);
         await this.#updateLevelClass(actor);
      }
   }

   async createActorClass(actor, item) {
      await actor.update({
         "system.details.level": 1,
         "system.details.class": item.name,
         "system.config.firstSpellLevel": item.system.firstSpellLevel,
         "system.config.maxSpellLevel": item.system.maxSpellLevel
      });
   }

   /**
    * Used to create context array of spells slots for actor sheet.
    * @param {any} actor
    * @returns
    */
   prepareSpellSlotsContext(actor) {
      return [{
         className: actor.system.details.class,
         firstSpellLevel: actor.system.config.firstSpellLevel,
         maxSpellLevel: actor.system.config.maxSpellLevel,
         slots: this._prepareSpellSlots(actor, [...actor.items.filter(item => item.type === "spell")], [])
      }];
   }
   
   /**
   * Prepares all derived class-related data when the class name is recognized.
   * Does not prepare saving throws or class special abilities which are done separately in onUpdateActor.
   * @protected
   */
   async #prepareClassInfo(actor) {
      if (actor.testUserPermission(game.user, "OWNER") === false) return;
      if (game.user.isGM === false) return; // needed?

      const classDataObj = await this.getClassData(actor.system.details.class, actor.system.details.level);
      if (classDataObj) {
         const { classItem, classData, currentLevel, levelData, prevLevelData, nextLevelData, nameLevel } = classDataObj;
         let update = {
            details: {
               level: currentLevel,
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
         ui.notifications.warn(`${actor.system.details.class} not found.`)
      }
   }

   /**
    * Called by update actor event handler to update class and level data, if those changed.
    * @protected
    */
   async #updateLevelClass(actor) {
      const className = actor.system.details.class?.toLowerCase();
      const classItem = await fadeFinder.getClass(className);

      if (classItem) {
         // Get the class data for the character's current level.
         const currentLevel = Math.min(classItem.system.maxLevel, Math.max(classItem.system.firstLevel, actor.system.details.level));

         // Saving throws
         const savesData = await fadeFinder.getClassSaves(className, currentLevel);
         if (savesData) {
            await actor._setupSavingThrows(savesData);
         }

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
               await actor._setupSpecialAbilities(abilitiesData);
               await actor._setupItems(itemsData);
            }
         } else {
            await actor._setupSpecialAbilities(abilitiesData);
            await actor._setupItems(itemsData);
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

   async onActorItemUpdate(actor, item, updateData) {
      if (item.type === "actorClass" &&
         (updateData.system.level || updateData.name)) {
         await this.#updateActorClassData(actor, item, updateData);
         await this.#updateActorData(actor);
      }
   }

   async createActorClass(actor, item) {
      const classLevel = item.system.levels[0];
      const nextClassLevel = item.system.levels[1];
      const newItem = await FDItem.create({
         name: item.name,
         type: "actorClass",
         system: {
            classUuid: item.uuid,
            key: item.system.key,
            level: classLevel?.level,
            maxLevel: item.system.maxLevel,
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
    * Used to create context array of spells slots for actor sheet.
    * @param {any} actor
    * @returns
    */
   prepareSpellSlotsContext(actor) {
      const spellClasses = [];
      if (actor.type === "monster") {
         spellClasses.push({
            className: game.i18n.localize("Types.Actor.monster"),
            slots: this._prepareSpellSlots(actor, [...actor.items.filter(item => item.type === "spell")], [])
         });
      } else {
         const casterClasses = actor.items.filter(item => item.type === "actorClass" && item.system.maxSpellLevel > 0);
         for (let casterClass of casterClasses) {
            const classSpells = actor.items.filter(item =>
               item.type === "spell" &&
               item.system.classes?.some(cls => cls.name === casterClass.name)
            );
            spellClasses.push({
               className: casterClass.name,
               firstSpellLevel: casterClass.system.firstSpellLevel,
               maxSpellLevel: casterClass.system.maxSpellLevel,
               slots: this._prepareSpellSlots(actor, classSpells, [])
            });
         }
      }
      return spellClasses;
   }

   prepareSpellsUsed(actor) {

   }

   /**
    * The ActorClass item has been updated.
    * @param {any} actor The owner of the updated actorClass.
    * @param {any} item The ActorClass item instance.
    * @param {any} updateData The updateData from the update event handler.
    */
   async #updateActorClassData(actor, item, updateData) {
      const classDataObj = await this.getClassData(item.name, updateData.system?.level);
      if (classDataObj) {
         const { classItem, classData, currentLevel, levelData, nextLevelData, nameLevel } = classDataObj;
         let update = {
            key: classData.key,
            level: currentLevel,
            maxLevel: classData.maxLevel,
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

   async #updateActorData(actor) {
      let classNames = "";
      let levels = "";
      let hds = "";
      let xps = "";
      let nextXps = "";
      let xpBonus = "";
      for (let actorClass of actor.items.filter(item => item.type === "actorClass")) {
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
   }
}