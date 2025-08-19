import { FDActorBase } from "/systems/fantastic-depths/module/actor/FDActorBase.mjs";
import { fadeFinder } from '/systems/fantastic-depths/module/utils/finder.mjs';
import { DialogFactory } from '/systems/fantastic-depths/module/dialog/DialogFactory.mjs';
import { ChatFactory, CHAT_TYPE } from '../chat/ChatFactory.mjs';
import { TagManager } from '../sys/TagManager.mjs';

/**
 * Extends the basic actor class with modifications for all system actors.
 * @extends {Actor}
 */
export class FDCombatActor extends FDActorBase {
   constructor(data, context) {
      super(data, context);
      this.tagManager = new TagManager(this); // Initialize TagManager
   }

   /**
    * Pre-create method. Being used to set some defaults on the prototype token.
    * @override
    * @param {any} documents Pending document instances to be created
    * @param {any} operation Parameters of the database creation operation
    * @param {any} user The User requesting the creation operation
    * @returns Return false to cancel the creation operation entirely
    */
   async _preCreate(documents, operation, user) {
      const allowed = await super._preCreate(documents, operation, user);      
      // Skip if the document is being created within a compendium
      if (this.pack || this._id) { return allowed; }

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
   prepareBaseData() {
      super.prepareBaseData();
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
      if (this.id) {
         // Apply the mastery level override, if present.
         if (this.system.mod.masteryLevelOverride) {
            for (let mastery of this.items.filter(item => item.type === "mastery")) {
               mastery.system.effectiveLevel = this.system.mod.masteryLevelOverride;
            }
         }
      }
   }

   /**
    * Performs the requested saving throw roll on the actor.
    * @public
    * @param {any} type A string key of the saving throw type.
    */
   async rollSavingThrow(type, event) {
      if (this.testUserPermission(game.user, "OWNER") === false) return;

      const savingThrow = this.#getSavingThrow(type); // Saving throw item
      if (!savingThrow) return;

      const ctrlKey = event?.ctrlKey ?? false;
      const rollData = this.getRollData();
      let dialogResp = null;
      let dataset = {};
      dataset.dialog = "save";
      dataset.pass = savingThrow.system.operator;
      dataset.target = savingThrow.system.target;
      dataset.rollmode = savingThrow.system.rollMode;
      dataset.label = savingThrow.name;
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
         let rollMod = Number(dialogResp.mod) || 0;
         if (dialogResp.action === "magic") {
            rollMod += this.system.abilities?.wis?.mod ?? 0;
         }
         rollMod += this.system.mod.save[type] || 0;
         rollMod += this.system.mod.save.all || 0;
         rollData.formula = rollMod !== 0 ? `${savingThrow.system.rollFormula}+@mod` : `${savingThrow.system.rollFormula}`;
         const rollContext = { ...rollData, mod: rollMod };
         let rolled = await new Roll(rollData.formula, rollContext).evaluate();
         const chatData = {
            context: this,
            caller: savingThrow,
            mdata: dataset,
            roll: rolled
         };
         const showResult = savingThrow._getShowResult(event);
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
      const selected = Array.from(canvas.tokens.controlled);
      let hasSelected = selected.length > 0;
      if (hasSelected === false) {
         ui.notifications.warn(game.i18n.localize("FADE.notification.selectToken1"));
      } else {
         for (let target of selected) {
            // Apply damage to the token's actor
            target.actor.rollSavingThrow(dataset.type, event);
         }
      }
   }

   /**
    * Finds and returns the appropriate ammo for the specified weapon.
    * The ammo item must be equipped for it to be recognized.
    * @public
    * @param {any} weapon
    * @returns The equipped ammo item if it exists and its quantity is greater than zero, otherwise null.
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
         const ammoItems = ["item", "ammo"];
         // Find an item in the actor's inventory that matches the ammoType and has a quantity > 0
         ammoItem = this.items.find(item => ammoItems.includes(item.type) && item.system.equipped === true
            && item.system.ammoType == ammoType && item.system.quantity !== 0);
      }

      return ammoItem;
   }

   /**
    * Get an array of strings indicating which combat maneuvers this actor is capable of.
    */
   getAvailableActions() {
      const result = ["nothing", "moveOnly", "retreat", "shove", "guard", "magicItem"];
      let hasEquippedWeapon = false;
      // Ready weapon
      if (this.items.filter(item => item.type === "weapon" && item.system.equipped === false && item.system.quantity > 0)?.length > 0) {
         result.push("readyWeapon");
      }
      // Ranged weapon actions
      let rangedWeapons = this.items.filter(item => item.type === "weapon"
         && item.system.canRanged === true && item.system.equipped === true
         && (item.system.quantity === null || item.system.quantity > 0));
      if (rangedWeapons?.length > 0) {
         if (rangedWeapons.find(item => (item.system.ammoType?.length > 0 && this.getAmmoItem(item) !== null)
            || (item.system.damageType === "breath" || item.system.natural === true))) {
            result.push("fire");
         } else {
            result.push("throw");
         }
         hasEquippedWeapon = true;
      }
      // Melee weapon actions
      if (this.items.filter(item => item.type === "weapon"
         && item.system.canMelee === true && item.system.equipped === true
         && (item.system.quantity === null || item.system.quantity > 0))?.length > 0) {
         result.push("attack");
         result.push("withdrawal");
         hasEquippedWeapon = true;
      }
      // Unarmed actions
      if (hasEquippedWeapon === false) {
         result.push("unarmed");
         result.push("wrestle");
      }
      // Spells
      if (this.items.filter(item => item.type === "spell"
         && (item.system.memorized === null || item.system.memorized > 0))?.length > 0) {
         result.push("spell");
      }
      const specialAbilities = this.items.filter(item => item.type === "specialAbility" && item.system.combatManeuver !== null && item.system.combatManeuver !== "null")
         .map((item) => item.system.combatManeuver);
      for (const ability of specialAbilities) {
         const config = CONFIG.FADE.CombatManeuvers[ability];
         if (config === undefined || (config.needWeapon ?? false) === false || (config.needWeapon === true && hasEquippedWeapon === true)) {
            result.push(ability);
         }
      }
      return result;
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
            catch (err) {
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
         let changes = itemsData.find(item => item.name === actorItem.name)?.changes;
         if (changes) {
            try {
               promises.push(actorItem.update(JSON.parse(changes)));
            }
            catch (err) {
               console.error(`Invalid item changes specified for ${actorItem.name}.`);
            }
         }
      }
      if (promises.length > 0) {
         await Promise.all(promises);
      }
   }

   #getSavingThrow(type) {
      const result = this.items.find(item => item.type === "specialAbility"
         && item.system.category === "save"
         && item.system.customSaveCode === type);
      if (!result) {
         ui.notifications.error(game.i18n.format("FADE.notification.missingSave", { type }));
      }
      return result;
   }
}