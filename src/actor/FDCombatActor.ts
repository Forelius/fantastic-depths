import { FDActorBase } from "./FDActorBase.js";
import { fadeFinder } from '../utils/finder.js';
import { DialogFactory } from '../dialog/DialogFactory.js';
import { ChatFactory, CHAT_TYPE } from '../chat/ChatFactory.js';
import { TagManager } from '../sys/TagManager.js';
import { SpecialAbilityItem } from "../item/SpecialAbilityItem.js";

/**
 * Extends the basic actor class with modifications for all system actors.
 * @extends {FDActorBase}
 */
export class FDCombatActor extends FDActorBase {
   tagManager: TagManager;

   constructor(data, context) {
      super(data, context);
      this.tagManager = new TagManager(this); // Initialize TagManager
   }

   /**
    * Pre-create method. Being used to set some defaults on the prototype token.
    * override
    * @param {any} documents Pending document instances to be created
    * @param {any} operation Parameters of the database creation operation
    * @param {any} user The User requesting the creation operation
    * @returns Return false to cancel the creation operation entirely
    */
   async _preCreate(documents, operation, user) {
      const allowed = await super._preCreate(documents, operation, user);
      // Skip if the document is being created within a compendium
      if (this.pack || this._id) return allowed;

      // Skip types handled elsewhere.
      const allowedTypes = ["character", "monster"];
      if (allowedTypes.includes(this.type) === false) return allowed;

      const fdPath = `systems/fantastic-depths/assets/img/actor`;
      const changeData = {};
      const assignIfUndefined = (oldData, newData, key, value) => {
         if (!foundry.utils.getProperty(oldData, key)) {
            foundry.utils.setProperty(newData, key, value);
         }
      };

      switch (this.type) {
         case "character":
            Object.assign(changeData, {
               "prototypeToken.sight.enabled": true,
               "prototypeToken.sight.visionMode": "basic"
            });
            assignIfUndefined(documents, changeData, "img", `${fdPath}/fighter1.webp`);
            assignIfUndefined(documents, changeData, "prototypeToken.texture.src", `${fdPath}/fighter1a.webp`);
            assignIfUndefined(documents, changeData, "prototypeToken.disposition", CONST.TOKEN_DISPOSITIONS.FRIENDLY);
            assignIfUndefined(documents, changeData, "prototypeToken.actorLink", true);
            assignIfUndefined(documents, changeData, "prototypeToken.scale", 0.9);
            assignIfUndefined(documents, changeData, "prototypeToken.displayName", CONST.TOKEN_DISPLAY_MODES.HOVER);
            break;
         case "monster":
            assignIfUndefined(documents, changeData, "img", `${fdPath}/monster1.webp`);
            assignIfUndefined(documents, changeData, "prototypeToken.texture.src", `${fdPath}/monster1a.webp`);
            assignIfUndefined(documents, changeData, "prototypeToken.displayName", CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER);
            assignIfUndefined(documents, changeData, "prototypeToken.disposition", CONST.TOKEN_DISPOSITIONS.HOSTILE);
            assignIfUndefined(documents, changeData, "prototypeToken.actorLink", false);
            assignIfUndefined(documents, changeData, "prototypeToken.scale", 1);
            break;
      }

      // Update the document with the changed data if it's a new actor
      if (Object.keys(changeData).length) {
         this.updateSource(changeData); // updateSource instead of update, no _id needed
      }

      return allowed;
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
      if (this.id) {
         // Apply the mastery level override, if present.
         if (this.system.mod.masteryLevelOverride) {
            for (const mastery of this.items.filter(item => item.type === "mastery")) {
               mastery.system.effectiveLevel = this.system.mod.masteryLevelOverride;
            }
         }
      }
   }

   /**
    * Performs the requested saving throw roll on the actor.
    * @public
    * @param {any} type A string key of the saving throw type.
    *                                                     */
   async rollSavingThrow(type, event) {
      if (this.testUserPermission(game.user, "OWNER") === false) return;

      const saveItem = this.#getSavingThrow(type); // Saving throw item
      if (!saveItem) return;

      const digest = [];
      const ctrlKey = event?.ctrlKey ?? false;
      const rollData = this.getRollData();
      let dialogResp = null;
      const dataset = {
         dialog: "save",
         pass: saveItem.system.operator,
         target: saveItem.system.target,
         rollmode: saveItem.system.rollMode,
         label: saveItem.name,
         type: null
      }
      if (this.type === "character") {
         dataset.type = type;
      }

      if (ctrlKey === true) {
         dialogResp = {
            mod: 0
         };
      } else {
         dialogResp = await DialogFactory(dataset, this);
      }

      if (dialogResp) {
         let rollMod = 0;

         // Modifier from dialog         
         const manualMod = Number(dialogResp.mod) || 0;
         if (manualMod != 0) {
            digest.push(game.i18n.format("FADE.Chat.rollMods.manual", { mod: dialogResp.mod }));
         }

         // Ability score mod
         const abilityScoreSys = game.fade.registry.getSystem("abilityScore");
         const abilityScoreMod = abilityScoreSys.getSavingThrowMod(this, dialogResp.action, saveItem);
         if (abilityScoreMod !== 0) {
            digest.push(game.i18n.format("FADE.Chat.rollMods.abilityScoreMod", { mod: abilityScoreMod }));
         }

         // Mods from active effects
         let effectMod = this.system.mod.save[type] || 0;
         effectMod += this.system.mod.save.all || 0;
         if (effectMod != 0) {
            digest.push(game.i18n.format("FADE.Chat.rollMods.effectMod2", { mod: effectMod }));
         }
         rollMod += manualMod + abilityScoreMod + effectMod;
         rollData.formula = rollMod !== 0 ? `${saveItem.system.rollFormula}+@mod` : `${saveItem.system.rollFormula}`;
         const rollContext = { ...rollData, mod: rollMod };
         const rolled = await new Roll(rollData.formula, rollContext).evaluate();
         const chatData = {
            context: this,
            caller: saveItem,
            mdata: dataset,
            roll: rolled,
            digest
         };

         const showResult = saveItem.getShowResult(event);
         const builder = new ChatFactory(CHAT_TYPE.GENERIC_ROLL, chatData, { showResult });
         return await builder.createChatMessage();
      }
   }

   /**
    * Static event handler for click on the saving throw button in chat.
    * @public
    * @param {any} event
    */
   static async handleSavingThrowRequest(event) {
      event.preventDefault(); // Prevent the default behavior
      event.stopPropagation(); // Stop other handlers from triggering the event
      const dataset = event.currentTarget.dataset;
      /** @type {Array<any>} */ // or /** @type {Token[]} */
      const selected: Token[] = Array.from(canvas.tokens.controlled);
      const hasSelected = selected.length > 0;
      if (hasSelected === false) {
         ui.notifications.warn(game.i18n.localize("FADE.notification.selectToken1"));
      } else {
         for (const target of selected) {
            // Roll for each token's actor
            target.actor.rollSavingThrow(dataset.type, event);
         }
      }
   }

   /**
    * Static event handler for click on an action button in chat.
    * @public
    * @param {any} event
    */
   static async handleActionRoll(event) {
      event.preventDefault(); // Prevent the default behavior
      event.stopPropagation(); // Stop other handlers from triggering the event
      const dataset = event.currentTarget.dataset;
      const owner = dataset.owneruuid ? foundry.utils.deepClone(await fromUuid(dataset.owneruuid)) : null;
      const instigator = owner || canvas.tokens.controlled?.[0]?.document;
      if (!instigator) {
         ui.notifications.warn(game.i18n.localize("FADE.notification.noTokenAssoc"));
      } else {
         if (dataset?.type === "melee" || dataset?.type === "shoot" || dataset?.type === "throw") {
            const item = await fromUuid(dataset.itemuuid);
            // Directly roll item and skip the rest
            if (item) await item.rollAttack(dataset);
         } else if (dataset?.type === "toggleLight") {
            const item = await fromUuid(dataset.itemuuid);
            if (item) await item.toggleLight(dataset);
         } else {
            const item = await fromUuid(dataset.itemuuid);
            // Directly roll item and skip the rest
            if (item) await item.roll(dataset, null, event);
         }
      }
   }

   /**
    * Finds and returns the appropriate ammo for the specified weapon.
    * The ammo item must be equipped for it to be recognized.
    * @public
    * @param {any} weapon
    * @returns {any} The equipped ammo item if it exists and its quantity is greater than zero, otherwise null.
    */
   getAmmoItem(weapon) {
      let ammoItem = null;
      const ammoType = weapon.system.ammoType;

      // If there's no ammo needed use the weapon itself
      if (weapon.system.isRanged === false) {
         // Do nothing, return null
      } else if ((!ammoType || ammoType === "" || ammoType === "none") && weapon.system.quantity !== 0) {
         ammoItem = weapon;
      } else {
         const ammoItems = ["ammo"];
         // Find an item in the actor's inventory that matches the ammoType and has a quantity > 0
         ammoItem = this.items.find(item => ammoItems.includes(item.type) && item.system.equipped === true
            && item.system.ammoType == ammoType && item.system.quantity !== 0);
      }

      return ammoItem;
   }

   /**
    * Get an array of strings indicating which combat maneuvers this actor is capable of.
    * @returns {string[]}
    */
   getAvailableActions() {
      // These options are always available.
      const result = [
         "nothing",
         "attack",
         "guard",
         "withdrawal",
         "retreat",
         "moveOnly",
         "unarmed",
         "wrestle",
         "shove",
         "magicItem",
         "specialAbility",
         "concentrate"
      ];

      // Ranged weapon actions
      const rangedWeapons = this.items.filter(item => item.type === "weapon"
         && item.system.canRanged === true && item.system.equipped === true
         && (item.system.quantity === null || item.system.quantity > 0));
      if (rangedWeapons.find(item => (item.system.ammoType?.length > 0 && this.getAmmoItem(item) !== null)
         || (item.system.damageType === "breath" || item.system.natural === true))) {
         result.push("fire");
      } else {
         result.push("throw");
      }

      // Spells
      if (this.items.filter(item => item.type === "spell"
         && (item.system.memorized === null || item.system.memorized > 0))?.length > 0) {
         result.push("spell");
      }

      // Combat manuever special abilitites
      const specialAbilities = this.items.filter(item => item.type === "specialAbility" && item.system.combatManeuver !== null && item.system.combatManeuver !== "null")
         .map((item) => item.system.combatManeuver);
      for (const ability of specialAbilities) {
         result.push(ability);
      }

      return result.sort((a, b) => a.localeCompare(b));
   }

   /**
    * @public
    * Add and/or update the actor's class-given special abilities.
    * @param {any} abilitiesData The class ability array for the desired level.
    * @returns void
    */
   async setupSpecialAbilities(abilitiesData) {
      if (game.user.isGM === false || !(abilitiesData?.length > 0)) return;
      let promises = [];
      // Get this actor's class ability items.
      let actorAbilities = this.items.filter(item => item.type === "specialAbility" && item.system.category !== "save");

      // Determine which special abilities are missing and need to be added.
      const addItems = [];
      for (const abilityData of abilitiesData) {
         if (actorAbilities.find(item => item.name === abilityData.name) === undefined
            && addItems.find(item => item.name === abilityData.name) === undefined) {
            const theItem = await fadeFinder.getClassAbility(abilityData.name, abilityData.classKey);
            if (theItem) {
               const newAbility = theItem.toObject();
               if (abilityData.target != null) {
                  newAbility.system.target = abilityData.target;
               }
               addItems.push(newAbility);
            } else {
               console.warn(`The special ability ${abilityData.name} does not exist as a world item or in the fade compendiums.`);
            }
         }
      }

      // Add the missing special abilities.
      if (addItems.length > 0) {
         console.debug(`Adding ${addItems.length} special ability items to ${this.name}`);
         promises.push(this.createEmbeddedDocuments("Item", addItems));
      }

      if (promises.length > 0) {
         await Promise.all(promises);
         promises = [];
         actorAbilities = this.items.filter(item => item.type === "specialAbility" && item.system.category !== "save");
      }

      // Iterate over ability items and set each one.
      for (const specialAbility of actorAbilities) {
         const abilityData = abilitiesData.find(item => item.name === specialAbility.name);
         const target = abilityData?.target;
         if (target) {
            promises.push(specialAbility.update({ "system.target": target }));
         }
         if (abilityData?.changes) {
            try {
               const changes = JSON.parse(abilityData?.changes);
               promises.push(specialAbility.update(changes));
            }
            catch (_err) {
               console.error(`Invalid class ability changes specified for ${specialAbility.name}.`);
            }
         }
      }

      if (promises.length > 0) {
         await Promise.all(promises);
      }
   }

   /**
    * @public
    * Add and/or update the actor's class-given items.
    * @param {any} itemsData The class items array for the desired level.
    * @param {any} validItemTypes The array of item type names that are valid.
    * @returns void
    */
   async setupItems(itemsData, validItemTypes) {
      if (game.user.isGM === false || itemsData == null || itemsData?.length == 0) return;
      const promises = [];
      // Get this actor's class-given items.
      let actorItems = this.items.filter(item => validItemTypes.includes(item.type));

      // Determine which items are missing and need to be added.
      const addItems = [];
      for (const itemData of itemsData) {
         if (actorItems.find(item => item.name === itemData.name) === undefined
            && addItems.find(item => item.name === itemData.name) === undefined) {
            const theItem = await fadeFinder.getItem(itemData.name, validItemTypes);
            if (theItem) {
               const newItem = theItem.toObject();
               addItems.push(newItem);
            } else {
               console.warn(`The class-given item ${itemData.name} does not exist as a world item or in the fade compendiums.`);
            }
         }
      }
      // Add the missing items.
      if (addItems.length > 0) {
         console.debug(`Adding ${addItems.length} items to ${this.name}`);
         await this.createEmbeddedDocuments("Item", addItems);
      }

      actorItems = this.items.filter(item => validItemTypes.includes(item.type));

      // Iterate over items and set each one.
      for (const actorItem of actorItems) {
         const changes = itemsData.find(item => item.name === actorItem.name)?.changes;
         if (changes) {
            try {
               promises.push(actorItem.update(JSON.parse(changes)));
            }
            catch (err) {
               console.error(`Invalid item changes specified for ${actorItem.name}.`, err);
            }
         }
      }
      if (promises.length > 0) {
         await Promise.all(promises);
      }
   }

   /**
    * @public
    * Add languages to actor, but only the ones that don't already exist.
    * @param {String[]} languages An array of language names.
    */
   async setupLanguages(languages) {
      const existing = this.system.languages.split(",").map(item => item.trim()).filter(Boolean);
      const adding = languages.filter(language => existing.includes(language) === false);
      if (adding?.length > 0) {
         console.debug(`Adding ${adding.length} languages to ${this.name}`);
         await this.update({ "system.languages": [...existing, ...adding].join(", ") });
      }
   }

   setupMinAbilityScores(abilities) {
      const updated = {};
      for (const [key] of Object.entries(abilities)) {
         if (this.system.abilities[key]?.min < abilities[key].min) {
            updated[key] = { min: abilities[key].min };
         }
      }
      return updated;
   }

   #getSavingThrow(saveType): SpecialAbilityItem {
      const result = this.items.find(item => item.type === "specialAbility"
         && item.system.category === "save"
         && item.system.customSaveCode === saveType) as SpecialAbilityItem;
      if (!result) {
         ui.notifications.error(game.i18n.format("FADE.notification.missingSave", { saveType }));
      }
      return result;
   }
}