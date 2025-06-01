import { DialogFactory } from "/systems/fantastic-depths/module/dialog/DialogFactory.mjs";
import { ClassDefinitionItem } from "/systems/fantastic-depths/module/item/ClassDefinitionItem.mjs";
import { FDItem } from "/systems/fantastic-depths/module/item/FDItem.mjs";
import { Formatter } from "/systems/fantastic-depths/module/utils/Formatter.mjs";
import { fadeFinder } from "/systems/fantastic-depths/module/utils/finder.mjs";

export class ClassSystemBase {
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
      ...actor.items.filter(item=>item.type==="actorClass" && item.name===className)];

      for (let actorItem of actorItems) {
         actorItem.delete();
      }
   }

   prepareSpellSlots(actor, classData) {
      const update = {};
      const classSpellsIdx = actor.system.details.level - 1;
      if (classData.spells?.length > 0 && classSpellsIdx < classData.spells.length) {
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

   async getClassData(className, actor, classLevel) {
      // Replace hyphen with underscore for "Magic-User"
      const nameInput = className.toLowerCase();
      const classItem = await fadeFinder.getClass(nameInput);
      if (!classItem) {
         if (nameInput !== null && nameInput !== "") {
            console.warn(`Class not found ${actor.system.details.class}.`);
         }
         return;
      }
      const classData = classItem.system;
      classLevel = classLevel >= 0 ? classLevel : actor.system.details.level;
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
      await actor.update({ "system.details.level": 1, "system.details.class": item.name });
   }

   /**
   * Prepares all derived class-related data when the class name is recognized.
   * Does not prepare saving throws or class special abilities which are done separately in onUpdateActor.
   * @protected
   */
   async #prepareClassInfo(actor) {
      if (actor.testUserPermission(game.user, "OWNER") === false) return;
      if (game.user.isGM === false) return; // needed?

      const classDataObj = await this.getClassData(actor.system.details.class, actor);
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
            spellSlots: []
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
         update.config = { maxSpellLevel: classData.maxSpellLevel };

         // Spells
         update = { ...update, ...this.prepareSpellSlots(actor, classData) };

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

   async #updateActorClassData(actor, item, updateData) {
      const classDataObj = await this.getClassData(item.name, actor, updateData.system?.level);
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