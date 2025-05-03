import { fadeFinder } from '/systems/fantastic-depths/module/utils/finder.mjs';
import { ClassDefinitionItem } from '/systems/fantastic-depths/module/item/ClassDefinitionItem.mjs';
import { DialogFactory } from '../dialog/DialogFactory.mjs';
import { ChatFactory, CHAT_TYPE } from '../chat/ChatFactory.mjs';

/**
 * Extends the basic actor class with modifications for all system actors.
 * @extends {Actor}
 */
export class fadeActor extends Actor {
   constructor(data, context) {
      /** Default behavior, just call super() and do all the default Item inits */
      super(data, context);
      if (!this.toggleStatusEffect) {
         // If v11 add toggleStatusEffect method.
         this.toggleStatusEffect = async (status, options) => {
            const token = this.getActiveTokens()[0];
            await token?.toggleEffect(CONFIG.statusEffects.find(e => e.id === status), options);
         };
      }
   }

   get currentActiveToken() {
      // Get the first active token.
      return this.getActiveTokens()?.[0].document;
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
      const fdPath = `systems/fantastic-depths/assets/img/actor`;
      const changeData = {};

      // Skip if the document is being created within a compendium
      if (this.pack) {
         return allowed;
      }

      // Skip if the actor is being updated rather than created
      if (this._id) {
         return allowed;
      }

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
      if (this.id) {
         this._prepareEffects();
         this._prepareSpellsUsed();
      } else {
         //console.warn(`Preparing base data for ${this.name}, but id is null.`);
      }
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
      if (this.id) {
         game.fade.registry.getSystem('encumbranceSystem').prepareDerivedData(this);
         game.fade.registry.getSystem('actorMovement').prepareMovementRates(this);         
         game.fade.registry.getSystem('actorArmor').prepareDerivedData(this);

         // Apply the mastery level override, if present.
         if (this.system.mod.masteryLevelOverride) {
            for (let mastery of this.items.filter(item => item.type === 'mastery')) {
               mastery.system.effectiveLevel = this.system.mod.masteryLevelOverride;
            }
         }
      }
   }

   /**
    * Handler for the updateActor hook.
    * @param {any} updateData
    * @param {any} options
    * @param {any} userId
    */
   async onUpdateActor(updateData, options, userId) {
      // Hit points updated.
      if (updateData.system?.hp?.value !== undefined && updateData.system?.hp?.value <= 0 && updateData.system?.combat?.isDead === undefined) {
         await this.update({ "system.combat.isDead": true });
         this.toggleStatusEffect("dead", { active: true });
      } else if (updateData.system?.hp?.value !== undefined && updateData.system?.hp?.value > 0 && updateData.system?.combat?.isDead === undefined) {
         await this.update({ "system.combat.isDead": false });
         this.toggleStatusEffect("dead", { active: false });
      }
   }

   async onUpdateActorItem(item, updateData, options, userId) {
      const user = game.users.get(userId);
      // Check if the logging feature is enabled and the user is not a GM
      const isLoggingEnabled = game.settings.get(game.system.id, "logCharacterChanges");
      if (isLoggingEnabled && game.user.isGM && (this.type === 'character')) {
         // Log the item update and notify the GM
         console.log(`Item updated: ${this.name} ${item.name} by ${user.name}`, updateData?.system);
      }
   }

   async onCreateActorItem(item, options, userId) {
      const user = game.users.get(userId);
      if (item.type === 'mastery') {
         await item.updatePropertiesFromMastery();
      }
      // Check if the logging feature is enabled and the user is not a GM
      const isLoggingEnabled = game.settings.get(game.system.id, "logCharacterChanges");
      if (isLoggingEnabled && game.user.isGM && (this.type === 'character')) {
         this.logActorChanges(item, null, user, "addItem");
      }
   }

   onDeleteActorItem(item, options, userId) {
      const user = game.users.get(userId);
      // Check if the logging feature is enabled and the user is not a GM
      const isLoggingEnabled = game.settings.get(game.system.id, "logCharacterChanges");
      if (isLoggingEnabled && game.user.isGM && (this.type === 'character')) {
         // Log the item removal and notify the GM
         console.log(`Item removed: ${item.name} by ${game.users.get(userId).name}`);
         this.logActorChanges(item, null, user, "deleteItem");
      }
   }

   /**
   * Handler for updateWorldTime event.
   */
   onUpdateWorldTime(worldTime, dt, options, userId) {
      // Only the GM should handle updating effects
      if (!game.user.isGM) return;

      // Ensure there's an active scene and tokens on the canvas
      if (!canvas?.scene) return;

      // Active effects
      // Ensure the actor has active effects to update
      for (let effect of this.allApplicableEffects()) {
         if (effect.isTemporary && effect.duration?.type !== "none") {
            effect.updateDuration();
            // Adjust the duration based on the time passed
            if (effect.duration.remaining <= 0) {
               if (effect.parent && effect.parent.type === "condition") {
                  // Condition expired
                  effect.parent.delete();
               } else {
                  // Effect expired
                  effect.delete();
               }

               // Notify chat.
               const speaker = { alias: game.users.get(game.userId).name };  // Use the player's name as the speaker
               let chatContent = game.i18n.format('FADE.Chat.effectEnds', { effectName: effect.name, actorName: this.name });
               ChatMessage.create({ speaker: speaker, content: chatContent });
            }
         }
      }

      // Only re-render the sheet if it's already rendered
      if (this.sheet && this.sheet.rendered) {
         this.sheet.render(true);  // Force a re-render of the actor sheet
      }
   }

   /**
    * @returns
    */
   getRollData() {
      const data = { ...this.system };
      return data;
   }

   /**
    * Applies damage or healing to the actor.
    * @public
    * @param {any} amount
    * @param {any} damageType
    * @param {any} source
    */
   async applyDamage(amount, damageType, source = null) {
      if (game.user.isGM === false) return;

      const systemData = this.system;
      const tokenName = this.parent?.name ?? this.name;
      let dmgAmt = amount;
      const prevHP = systemData.hp.value;
      let digest = [];
      const isHeal = damageType === "heal";
      // Damage mitigation
      let damageMitigated = 0;
      let isKilled = false;
      let isRestoredToLife = false;

      switch (damageType) {
         case 'physical':
            damageMitigated = systemData.mod.combat.selfDmg;
            break;
         case 'breath':
            damageMitigated = systemData.mod.combat.selfDmgBreath;
            damageMitigated += dmgAmt * systemData.mod.combat.selfDmgBreathScale;
            break;
         case 'magic':
            damageMitigated = systemData.mod.combat.selfDmgMagic;
            break;
      }

      if (isHeal) {
         systemData.hp.value = Math.min((systemData.hp.value + dmgAmt), systemData.hp.max);
         digest.push(game.i18n.format('FADE.Chat.damageRoll.restored', { hp: (systemData.hp.value - prevHP), tokenName: tokenName }));
      } else {
         if (damageMitigated !== 0) {
            dmgAmt -= damageMitigated;
            digest.push(game.i18n.format('FADE.Chat.damageRoll.mitigated', { damage: damageMitigated, type: damageType }));
         }
         systemData.hp.value -= dmgAmt;
         digest.push(game.i18n.format('FADE.Chat.damageRoll.applied', { damage: dmgAmt, type: damageType, tokenName: tokenName }));
      }
      await this.update({ "system.hp.value": systemData.hp.value });

      // Check if the actor already has the "Dead" effect
      let hasDeadStatus = this.statuses.has("dead");

      if (prevHP > 0 && systemData.hp.value <= 0) {
         isKilled = hasDeadStatus === false;
         if (isKilled) {
            if (this.type === 'character') {
               systemData.combat.deathCount++;
               await this.update({
                  "system.combat.deathCount": systemData.combat.deathCount + 1,
                  "system.combat.isDead": true
               });
            }
            await this.toggleStatusEffect("dead", { active: true, overlay: true });
            digest.push(game.i18n.format('FADE.Chat.damageRoll.killed', { tokenName: tokenName }));
         }
      } else if (prevHP < 0 && systemData.hp.value > 0) {
         isRestoredToLife = hasDeadStatus === true;
         if (isRestoredToLife) {
            await this.update({ "system.combat.isDead": false });
            await this.toggleStatusEffect("dead", { active: false });
            digest.push(game.i18n.format('FADE.Chat.damageRoll.restoredLife', { tokenName: tokenName }));
         }
      }

      let chatContent = source ? `<div class="text-size18">${source.name}</div>` : "";
      for (let msg of digest) {
         chatContent += `<div>${msg}</div>`;
      }

      if (game.fade.toastManager) {
         game.fade.toastManager.showHtmlToast(chatContent, "info", game.settings.get("core", "rollMode"));
      }

      const speaker = { alias: game.users.get(game.userId).name };  // Use the player's name as the speaker
      let chatData = {
         speaker: speaker,
         content: chatContent
      };
      ChatMessage.create(chatData);
   }

   /**
    * Performs the requested saving throw roll on the actor.
    * @public
    * @param {any} type A string key of the saving throw type.
    */
   async rollSavingThrow(type, event) {
      if (this.testUserPermission(game.user, "OWNER") === false) return;

      const ctrlKey = event?.ctrlKey ?? false;
      const savingThrow = this.#getSavingThrow(type); // Saving throw item
      const rollData = this.getRollData();
      let dialogResp = null;
      let dataset = {};
      dataset.dialog = "save";
      dataset.pass = savingThrow.system.operator;
      dataset.target = savingThrow.system.target;
      dataset.rollmode = savingThrow.system.rollMode;
      dataset.label = savingThrow.name;
      if (this.type === 'character') {
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
         if (dialogResp.action === 'magic') {
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
         ui.notifications.warn(game.i18n.localize('FADE.notification.selectToken1'));
      } else {
         for (let target of selected) {
            // Apply damage to the token's actor
            target.actor.rollSavingThrow(dataset.type, event);
         }
      }
   }

   /**
    * A helper method for setting the actor's current active light and active fuel.
    * @public
    * @param {any} lightItemId An owned light item's id.
    */
   async setActiveLight(lightItemId) {
      if (lightItemId === null || lightItemId === '' || lightItemId === undefined) {
         await this.currentActiveToken.update({ light: { dim: 0, bright: 0 } }); // Extinguish light
      }
      await this.update({ "system.activeLight": lightItemId });
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
         // Find an item in the actor's inventory that matches the ammoType and has a quantity > 0
         ammoItem = this.items.find(item => item.type === "item" && item.system.equipped === true
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
            || (item.system.damageType === 'breath' || item.system.natural === true))) {
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
      const specialAbilities = this.items.filter(item => item.type === 'specialAbility' && item.system.combatManeuver !== null)
         .map((item) => item.system.combatManeuver);
      for (const ability of specialAbilities) {
         const config = CONFIG.FADE.CombatManeuvers[ability];
         if (config === undefined || config.needWeapon === false || (config.needWeapon === true && hasEquippedWeapon === true)) {
            result.push(ability);
         }
      }
      return result;
   }

   async clearClassData(className) {
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
      await this.update({ system: update });
      const abilityNames = classItem.system.specialAbilities.map(item => item.name);
      const actorAbilities = this.items.filter(item => item.type === 'specialAbility' && item.system.category !== 'save' && abilityNames.includes(item.name));
      for (let classAbility of actorAbilities) {
         classAbility.delete();
      }
      const itemNames = classItem.system.classItems.map(item => item.name);
      const actorItems = this.items.filter(item => (item.type === 'weapon' || item.type === 'armor') && itemNames.includes(item.name));
      for (let classItem of actorItems) {
         classItem.delete();
      }
   }

   /** 
    * Performs base classe prep of actor's active effects.
    * Disables effects from items that are equippable and not equipped. 
    * @protected 
    */
   _prepareEffects() {
      //if (this.testUserPermission(game.user, "OWNER") === false) return;
      // Iterate over all applicable effects
      for (const effect of this.allApplicableEffects()) {
         //this.effects.forEach((effect) => {
         const parentItem = effect.parent;
         // If the effect has a parent and the parent is an equippable item...
         const equippableFx = ['item', 'armor', 'weapon', 'light'];
         if (parentItem && equippableFx.includes(parentItem.type) && parentItem.system.equippable === true) {
            // Set disabled state of effect based on item equipped state
            effect.disabled = !parentItem.system.equipped;
         }
      }
   }

   /**
    * Prepares the used spells per level totals
    * @protected 
    */
   _prepareSpellsUsed() {
      if (this.testUserPermission(game.user, "OWNER") === false) return;

      const systemData = this.system;
      const spells = this.items.filter((item) => item.type === 'spell');
      let spellSlots = systemData.spellSlots || [];

      // Reset used spells to zero.
      // Note: This is not how many times it has been cast, but how many slots have been used.
      for (let i = 0; i < systemData.config.maxSpellLevel; i++) {
         spellSlots[i] = spellSlots[i] || {};
         spellSlots[i].used = 0;
      }

      if (spells.length > 0) {
         for (let spell of spells) {
            const spellLevel = Math.max(0, spell.system.spellLevel - 1);
            if (spell.system.spellLevel > spellSlots.length) {
               console.warn(`${this.name} trying to setup spell level ${spell.system.spellLevel} but only has maxSpellLevel of ${systemData.config.maxSpellLevel}.`);
            } else if (spell.system.memorized > 0) {
               spellSlots[spellLevel].used += spell.system.memorized ?? 1;
            }
         }
      }
      if (spellSlots.length !== systemData.config.maxSpellLevel) {
         console.warn(`${this.name} has incorrect number of spell slots (${spellSlots.length}). Max spell level is (${systemData.config.maxSpellLevel}).`);
      }
      systemData.spellSlots = spellSlots;
   }

   /**
    * @protected
    * Add and/or update the actor's class-given special abilities.
    * @param {any} abilitiesData The class ability array for the desired level.
    * @returns void
    */
   async _setupSpecialAbilities(abilitiesData) {
      if (game.user.isGM === false || !(abilitiesData?.length > 0)) return;
      const promises = [];
      // Get this actor's class ability items.
      const actorAbilities = this.items.filter(item => item.type === 'specialAbility' && item.system.category !== 'save');

      // Determine which special abilities are missing and need to be added.
      const addItems = [];
      for (const abilityData of abilitiesData) {
         if (actorAbilities.find(item => item.name === abilityData.name) === undefined
            && addItems.find(item => item.name === abilityData.name) === undefined) {
            const theItem = await fadeFinder.getClassAbility(abilityData.name, abilityData.classKey);
            if (theItem) {
               const newAbility = theItem.toObject();
               //newAbility.system.target = abilitiesData.find(item => item.name === newAbility.name)?.target;
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

      // Iterate over ability items and set each one.
      for (const specialAbility of actorAbilities) {
         const abilityData = abilitiesData.find(item => item.name === specialAbility.name);
         const target = abilityData?.target;
         if (target) {
            promises.push(specialAbility.update({ "system.target": target }));
         }
         let changes = abilityData?.changes;
         if (changes) {
            try {
               promises.push(specialAbility.update(JSON.parse(changes)));
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
  * @protected
  * Add and/or update the actor's class-given items.
  * @param {any} itemsData The class items array for the desired level.
  * @returns void
  */
   async _setupItems(itemsData) {
      if (game.user.isGM === false || itemsData == null || itemsData?.length == 0) return;
      const promises = [];
      // Get this actor's class ability items.
      let actorItems = this.items.filter(item => ClassDefinitionItem.ValidItemTypes.includes(item.type));

      // Determine which special abilities are missing and need to be added.
      const addItems = [];
      for (const itemData of itemsData) {
         if (actorItems.find(item => item.name === itemData.name) === undefined
            && addItems.find(item => item.name === itemData.name) === undefined) {
            const theItem = await fadeFinder.getItem(itemData.name, ClassDefinitionItem.ValidItemTypes);
            if (theItem) {
               const newItem = theItem.toObject();
               addItems.push(newItem);
            } else {
               console.warn(`The class-given item ${itemData.name} does not exist as a world item or in the fade compendiums.`);
            }
         }
      }
      // Add the missing special abilities.
      if (addItems.length > 0) {
         console.debug(`Adding ${addItems.length} class items to ${this.name}`);
         await this.createEmbeddedDocuments("Item", addItems);
      }

      actorItems = this.items.filter(item => ClassDefinitionItem.ValidItemTypes.includes(item.type));

      // Iterate over ability items and set each one.
      for (const actorItem of actorItems) {
         let changes = itemsData.find(item => item.name === actorItem.name)?.changes;
         if (changes) {
            try {
               promises.push(actorItem.update(JSON.parse(changes)));
            }
            catch (err) {
               console.error(`Invalid class item changes specified for ${actorItem.name}.`);
            }
         }
      }
      if (promises.length > 0) {
         await Promise.all(promises);
      }
   }

   /**
    * Called by Character and Monster actor classes to update/add saving throws.
    * @param {any} savesData The values to use for the saving throws.
    */
   async _setupSavingThrows(savesData) {
      if (game.user.isGM === false) return;
      const promises = [];
      const savingThrowItems = await fadeFinder.getSavingThrows();
      const savingThrows = this.items.filter(item => item.type === 'specialAbility' && item.system.category === 'save');
      const saveEntries = Object.entries(savesData);
      const addItems = [];
      for (const saveData of saveEntries) {
         const stName = saveData[0];
         if (stName !== 'level' && savingThrows.find(item => item.system.customSaveCode === stName) === undefined
            && addItems.find(item => item.system.customSaveCode === stName) === undefined) {
            const saveItem = savingThrowItems.find(item => item.system.customSaveCode === stName);
            if (saveItem && savesData[saveItem.system.customSaveCode] > 0) {
               const newSave = saveItem.toObject();
               const saveTarget = savesData[newSave.system.customSaveCode];
               newSave.system.target = saveTarget ?? 15;
               addItems.push(newSave);
            } else if (savesData[saveItem.system.customSaveCode] > 0) {
               console.warn(`The specified saving throw (${stName}) does not exist as a world item.`);
            }
         }
      }
      if (addItems.length > 0) {
         //console.log(`Adding saving throw items to ${this.name}`);
         promises.push(this.createEmbeddedDocuments("Item", addItems));
      }
      // Iterate over saving throw items and set each one.
      for (const savingThrow of savingThrows) {
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
    * Determines if a roll on a non-item (ability score check) should show a success/fail result message.
    * @protected
    * @param {any} event
    * @returns True if the results should be shown, otherwise false.
    */
   _getShowResult(event) {
      let result = true;
      const shiftKey = event?.originalEvent?.shiftKey ?? false;
      if (game.user.isGM === true) {
         result = shiftKey === false && result === true;
      }
      return result;
   }

   #getSavingThrow(type) {
      return this.items.find(item => item.type === 'specialAbility' && item.system.category === 'save' && item.system.customSaveCode === type);
   }
}