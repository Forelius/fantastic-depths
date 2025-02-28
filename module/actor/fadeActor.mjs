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
      let result = null;
      if (this.isToken === true) {
         result = canvas.tokens?.placeables?.find(token => token.id === this.token.id).document;
      } else {
         result = canvas.tokens?.placeables?.find(token => token.actor.id === this.id).document;
      }
      //console.debug(`Get currentActiveToken for ${this.name} (${result?.name}). ${result?.id}`, this);
      return result;
   }

   /**
    * Pre-create method. Being used to set some defaults on the prototype token.
    * @override
    * @param {any} data
    * @param {any} options
    * @param {any} userId
    * @returns
    */
   async _preCreate(data, options, userId) {
      const allowed = await super._preCreate(data, options, userId);
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
            assignIfUndefined(data, changeData, "img", `${fdPath}/fighter1.webp`);
            assignIfUndefined(data, changeData, "prototypeToken.texture.src", `${fdPath}/fighter1a.webp`);
            assignIfUndefined(data, changeData, "prototypeToken.disposition", CONST.TOKEN_DISPOSITIONS.FRIENDLY);
            assignIfUndefined(data, changeData, "prototypeToken.actorLink", true);
            assignIfUndefined(data, changeData, "prototypeToken.scale", 0.9);
            assignIfUndefined(data, changeData, "prototypeToken.displayName", CONST.TOKEN_DISPLAY_MODES.HOVER);
            break;
         case "monster":
            assignIfUndefined(data, changeData, "img", `${fdPath}/monster1.webp`);
            assignIfUndefined(data, changeData, "prototypeToken.texture.src", `${fdPath}/monster1a.webp`);
            assignIfUndefined(data, changeData, "prototypeToken.displayName", CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER);
            assignIfUndefined(data, changeData, "prototypeToken.disposition", CONST.TOKEN_DISPOSITIONS.HOSTILE);
            assignIfUndefined(data, changeData, "prototypeToken.actorLink", false);
            assignIfUndefined(data, changeData, "prototypeToken.scale", 1);
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
         this._prepareEncumbrance(this.type);
         this.system.prepareDerivedMovement();
         this._prepareArmorClass();
      } else {
         //console.warn(`Preparing derived data for ${this.name}, but id is null.`);
      }
      // TODO: This is the incorrect way to do this, it causes recursion through the call to setActiveLight.
      //if (this.system.activeLight?.length > 0) {
      //   const lightItem = this.items.get(this.system.activeLight);
      //   if (!lightItem) {
      //      console.log(`Deactivating light for ${this.name} due to missing light item.`);
      //      this.setActiveLight(null);
      //      this.currentActiveToken.update({ light: { dim: 0, bright: 0 } }); // Extinguish light
      //   }
      //}
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
         this.toggleStatusEffect("dead", { active: true, overlay: true });
      } else if (updateData.system?.hp?.value !== undefined && updateData.system?.hp?.value > 0 && updateData.system?.combat?.isDead === undefined) {
         await this.update({ "system.combat.isDead": false });
         this.toggleStatusEffect("dead", { active: false });
      }
   }

   onUpdateActorItem(item, updateData, options, userId) {
      const user = game.users.get(userId);
      // Check if the logging feature is enabled and the user is not a GM
      const isLoggingEnabled = game.settings.get(game.system.id, "logCharacterChanges");
      if (isLoggingEnabled && game.user.isGM && (this instanceof CharacterActor)) {
         // Log the item update and notify the GM
         console.log(`Item updated: ${this.name} ${item.name} by ${user.name}`, updateData?.system);
      }
   }

   onCreateActorItem(item, options, userId) {
      const user = game.users.get(userId);
      // Check if the logging feature is enabled and the user is not a GM
      const isLoggingEnabled = game.settings.get(game.system.id, "logCharacterChanges");
      if (isLoggingEnabled && game.user.isGM && (this instanceof CharacterActor)) {
         this.logActorChanges(item, null, user, "addItem");
      }
   }

   onDeleteActorItem(item, options, userId) {
      const user = game.users.get(userId);
      // Check if the logging feature is enabled and the user is not a GM
      const isLoggingEnabled = game.settings.get(game.system.id, "logCharacterChanges");
      if (isLoggingEnabled && game.user.isGM && (this instanceof CharacterActor)) {
         // Log the item removal and notify the GM
         console.log(`Item removed: ${item.name} by ${game.users.get(userId).name}`);
         this.logActorChanges(item, null, user, "deleteItem");
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
    * Get the attack roll formula for the specified weapon, attack type, mod and target.
    * @public
    * @param {any} weapon The weapon being used to attack with.
    * @param {any} attackType The type of attack. Values are melee, missile, breath and save.
    * @param {any} options An object containing one or more of the following:
    *    mod - A manual modifier entered by the user.
    *    target - This doesn't work when there are multiple targets.
    *    targetWeaponType - For weapon mastery system, the type of weapon the target is using (monster or handheld).
    * @returns
    */
   getAttackRoll(weapon, attackType, options = {}) {
      const weaponData = weapon.system;
      const targetData = options.target?.system;
      let formula = '1d20';
      let digest = [];
      let modifier = 0;
      const masteryEnabled = game.settings.get(game.system.id, "weaponMastery");
      const toHitSystem = game.settings.get(game.system.id, "toHitSystem");

      if (options.mod && options.mod !== 0) {
         modifier += options.mod;
         //formula = `${formula}+@mod`; 
         digest.push(game.i18n.format('FADE.Chat.rollMods.manual', { mod: options.mod }));
      }

      if (toHitSystem === 'aac' && this.system.thbonus !== 0) {
         modifier += this.system.thbonus;
         digest.push(`${game.i18n.localize('FADE.Actor.THBonus')}: ${this.system.thbonus}`);
      }

      if (attackType === "melee") {
         modifier += this.#getMeleeAttackRollMods(weaponData, digest, targetData);
      } else {
         // Missile attack
         modifier += this.#getMissileAttackRollMods(weaponData, digest, targetData, options?.ammo);
      }

      if (masteryEnabled && weaponData.mastery !== "") {
         modifier += this.#getMasteryAttackRollMods(weaponData, options, digest, attackType);
      }

      if (modifier !== 0) {
         formula = `${formula}+${modifier}`;
      }

      return { formula, digest };
   }

   /**
    * Attemtps to determine the weapon type of this actor.
    * @public
    * @returns The weapon type of this actor or 'monster' if it can't be determined.
    */
   getWeaponType() {
      let result = 'monster';
      const weapons = this.items.filter(item => item.type === 'weapon');
      const equippedWeapons = weapons?.filter(item => item.system.equipped === true && item.system.quantity > 0);
      if (equippedWeapons && equippedWeapons.length > 0) {
         result = equippedWeapons[0].system.weaponType;
      } else if (weapons && weapons.length > 0) {
         result = 'monster';
         console.warn(`${this.name} has weapons, but none are equipped or the quantity is zero.`)
      }
      return result;
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
   * Handler for updateWorldTime event.
   */
   onUpdateWorldTime(worldTime, dt, options, userId) {
      // Only the GM should handle updating effects
      if (!game.user.isGM) return;

      // Ensure there's an active scene and tokens on the canvas
      if (!canvas?.scene) return;

      // Active effects
      if (this.effects.size > 0) {
         // Ensure the actor has active effects to update
         for (let effect of this.effects) {
            if (effect.isTemporary && effect.duration?.type !== "none") {
               effect.updateDuration();
               // Adjust the duration based on the time passed
               if (effect.duration.remaining <= 0) {
                  // Effect expired
                  effect.delete();

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
   }

   /**
    * Performs the requested saving throw roll on the actor.
    * @public
    * @param {any} type A string key of the saving throw type.
    */
   async rollSavingThrow(type) {
      if (this.testUserPermission(game.user, "OWNER") === false) return;

      const savingThrow = this.#getSavingThrow(type);
      const rollData = this.getRollData();
      let dataset = {};
      dataset.dialog = "save";
      dataset.pass = savingThrow.system.operator;
      dataset.target = savingThrow.system.target;
      dataset.rollmode = savingThrow.system.rollMode;
      dataset.label = savingThrow.name;
      if (this.type === 'character') {
         dataset.type = type;
      }

      let dialogResp = await DialogFactory(dataset, this);

      if (dialogResp?.resp?.rolling === true) {
         let rollMod = dialogResp.resp?.mod || 0;
         if (dialogResp.resp.vsmagic === true) {
            rollMod += this.system.abilities.wis.mod;
         }
         rollMod += this.system.mod.save[type] || 0;
         rollMod += this.system.mod.save.all || 0;
         rollData.formula = rollMod !== 0 ? `${savingThrow.system.rollFormula}+@mod` : `${savingThrow.system.rollFormula}`;
         const rollContext = { ...rollData, mod: rollMod };
         let rolled = await new Roll(rollData.formula, rollContext).evaluate();
         const chatData = {
            dialogResp: dialogResp,
            context: this,
            caller: savingThrow,
            mdata: dataset,
            roll: rolled,
         };
         const builder = new ChatFactory(CHAT_TYPE.GENERIC_ROLL, chatData);
         return await builder.createChatMessage();
      }
   }

   /**
    * Static event handler for click on the saving throw button in chat.
    * @public
    * @param {any} event
    */
   static async handleSavingThrowRequest(event) {
      if (this.testUserPermission(game.user, "OWNER") === false) return;

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
            target.actor.rollSavingThrow(dataset.type);
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
    * Finds the best defense mastery for the specified attacker weapon type,
    * taking into account the number of times the actor has been attacked this round,
    * and the fact that the AC bonus only applies a limited number of times per round.
    *
    * The actor’s combat object contains:
    *   - system.combat.attAgainstH: number of handheld attacks this round
    *   - system.combat.attAgainstM: number of monster attacks this round
    *
    * Each mastery in system.ac.mastery has the following properties:
    *   - acBonus:      the AC bonus value.
    *   - acBonusType:  indicates which attack types the bonus applies to:
    *                   "handheld", "monster", or "all" (applies to both).
    *   - acBonusAT:    the maximum number of attacks per round for which this bonus applies.
    *
    * @public
    * @param {string} attackerWeaponType - "handheld" or "monster"
    * @param {string} attackDirection - "front" or "rear"
    * @returns {object|null} The best defense mastery, or null if none qualifies.
    */
   getBestDefenseMastery(attackerWeaponType, attackDirection = 'front') {
      const defenseMasteries = this.system.ac.mastery;
      if (!defenseMasteries || defenseMasteries.length === 0) {
         return null;
      }

      // Determine how many attacks of this type have been made this round.
      // (For "handheld" attacks use attAgainstH; for "monster" attacks use attAgainstM)
      const attackCount = attackerWeaponType === 'handheld'
         ? (this.system.combat.attAgainstH || 0)
         : (this.system.combat.attAgainstM || 0);

      // Filter masteries to those that:
      //   1. Apply to this weapon type (or all types).
      //   2. Still have their bonus available (i.e. current attackCount is less than acBonusAT).
      const applicableMasteries = defenseMasteries.filter(mastery => {
         const typeMatches = (mastery.acBonusType === attackerWeaponType || mastery.acBonusType === 'all');
         const bonusAvailable = attackCount < mastery.acBonusAT || mastery.acBonusAT === null;
         return typeMatches && bonusAvailable;
      });

      if (applicableMasteries.length === 0) {
         return null;
      }

      // Choose the mastery with the best (lowest) AC bonus.
      return applicableMasteries.reduce((best, current) => {
         return (current.acBonus < best.acBonus) ? current : best;
      });
   }


   /**
    * Get this actor's defense masteries for all equipped weapons.
    * @public
    * @param {any} ac
    * @returns
    */
   getDefenseMasteries(ac) {
      const results = [];
      const masteries = this.items.filter(item => item.type === "mastery");
      const equippedWeapons = this.items.filter((item) => item.type === "weapon" && item.system.equipped);
      // If the weapon mastery option is enabled then an array of mastery-related ac bonuses are added to the actor's system data.
      if (masteries?.length > 0 && equippedWeapons?.length > 0) {
         for (let weapon of equippedWeapons) {
            const weaponMastery = masteries.find((mastery) => mastery.name === weapon.system.mastery);
            if (weaponMastery) {
               results.push({
                  // The type(s) of attack the AC bonus applies to.
                  acBonusType: weaponMastery.system.acBonusType,
                  // The AC bonus itself, specified as a negative number for better AC.
                  acBonus: weaponMastery.system.acBonus || 0,
                  // The total of the AC with the mastery AC bonus.
                  total: ac.total + (weaponMastery.system.acBonus || 0),
                  // The total of the AAC with the mastery AC bonus.
                  totalAAC: 19 - ac.total + (weaponMastery.system.acBonus || 0),
                  // The number of attacks that this bonus applies to per round.
                  acBonusAT: weaponMastery.system.acBonusAT,
                  name: weaponMastery.name
               });
            }
         }
      }
      return results;
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
    * Prepare derived armor class values.
    */
   _prepareArmorClass() {
      const acDigest = [];
      const dexMod = (this.system.abilities?.dex.mod ?? 0);
      const baseAC = CONFIG.FADE.Armor.acNaked - dexMod - this.system.mod.baseAc;
      let ac = {};
      ac.nakedAAC = 19 - baseAC;
      ac.naked = baseAC;
      // AC value is used for wrestling rating and should not include Dexterity bonus.
      ac.value = CONFIG.FADE.Armor.acNaked;
      ac.total = baseAC;
      ac.mod = 0;
      ac.shield = 0;

      const naturalArmor = this.items.find(item => item.type === 'armor' && item.system.natural);
      this.system.equippedArmor = this.items.find(item => item.type === 'armor' && item.system.equipped && !item.system.isShield);
      const equippedShield = this.items.find(item => item.type === 'armor' && item.system.equipped && item.system.isShield);

      if (dexMod !== 0) {
         acDigest.push(`Dexterity bonus: ${dexMod}`);
      }

      // If natural armor
      if (naturalArmor?.system.totalAC !== null && naturalArmor?.system.totalAC !== undefined) {
         //naturalArmor.prepareEffects();
         ac.naked = naturalArmor.system.totalAC - dexMod;
         ac.value = ac.naked;
         ac.total = ac.naked;
         naturalArmor.system.equipped = true;
         acDigest.push(`${naturalArmor.name}: ${naturalArmor.system.totalAC}`);
      }

      // If an equipped armor is found...
      if (this.system.equippedArmor) {
         //this.system.equippedArmor.prepareEffects();
         ac.value = this.system.equippedArmor.system.ac;
         ac.mod += this.system.equippedArmor.system.mod ?? 0;
         ac.total = this.system.equippedArmor.system.totalAC;
         // Reapply dexterity mod, since overwriting ac.total here.
         ac.total -= dexMod;
         acDigest.push(`${this.system.equippedArmor.name}: ${this.system.equippedArmor.system.totalAC}`);
      }

      // If a shield is equipped...
      if (equippedShield) {
         //equippedShield.prepareEffects();
         ac.value -= equippedShield.system.ac;
         ac.shield = equippedShield.system.totalAC;
         ac.total -= equippedShield.system.totalAC;
         acDigest.push(`${equippedShield.name}: ${equippedShield.system.totalAC}`);
      }

      if (this.system.mod.baseAc != 0) {
         ac.total -= this.system.mod.baseAc;
         acDigest.push(`${game.i18n.localize('FADE.Armor.mod')}: ${this.system.mod.baseAc}`);
      }

      ac.nakedRanged = ac.total;
      ac.totalRanged = ac.total;
      // Normal Calcs done at this point --------------------------------

      if (this.system.mod.upgradeAc && this.system.mod.upgradeAc < ac.total) {
         ac.total = this.system.mod.upgradeAc;
         ac.naked = this.system.mod.upgradeAc;
         acDigest.push(`AC upgraded to ${this.system.mod.upgradeAc}`);
      }
      if (this.system.mod.upgradeRangedAc && this.system.mod.upgradeRangedAc < ac.totalRanged) {
         ac.totalRanged = this.system.mod.upgradeRangedAc;
         ac.nakedRanged = this.system.mod.upgradeRangedAc;
         acDigest.push(`Ranged AC upgraded to ${this.system.mod.upgradeRangedAc}`);
      }

      // Now other mods. Dexterity bonus already applied above.
      ac.nakedAAC = 19 - ac.naked;
      ac.totalAAC = 19 - ac.total;
      ac.totalRangedAAC = 19 - ac.totalRanged;
      ac.nakedRangedAAC = 19 - ac.nakedRanged;

      // Weapon mastery defense bonuses. These do not change the AC on the character sheet.
      const masteryEnabled = game.settings.get(game.system.id, "weaponMastery");
      if (masteryEnabled) {
         ac.mastery = this.getDefenseMasteries(ac);
      }

      this.system.ac = ac;
      this.system.acDigest = acDigest;
   }

   /**
    * @protected
    * @param {any} classKey The class key by itself.
    * @param {any} abilitiesData The class ability array for the desired level.
    * @returns
    */
   async _setupSpecialAbilities(classKey, abilitiesData) {
      if (game.user.isGM === false) return;
      const promises = [];
      // Get class ability world items for specified class
      const worldAbilities = game.items.filter(item => item.type === 'specialAbility' && item.system.category === 'class' && item.system.classKey === classKey);
      // Get this actor's class ability items.
      const classAbilities = this.items.filter(item => item.type === 'specialAbility' && item.system.category === 'class');
      const addItems = [];
      for (const abilityData of abilitiesData) {
         if (classAbilities.find(item => item.name === abilityData.name) === undefined
            && addItems.find(item => item.name === abilityData.name) === undefined) {
            const itemData = worldAbilities.find(item => item.name === abilityData.name);
            if (itemData) {
               const newAbility = itemData.toObject();
               newAbility.system.target = abilitiesData.find(item => item.name === newAbility.name)?.target;
               addItems.push(newAbility);
            } else {
               console.warn(`The specified class ability (${abilityData.name}) does not exist as a world item.`);
            }
         }
      }
      if (addItems.length > 0) {
         console.debug(`Adding ${addItems.length} class ability items to ${this.name}`);
         promises.push(this.createEmbeddedDocuments("Item", addItems));
      }

      // Iterate over ability items and set each one.
      for (const classAbility of classAbilities) {
         const target = abilitiesData.find(item => item.name === classAbility.name)?.target;
         if (target) {
            promises.push(classAbility.update({ "system.target": target }));
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
      const worldSavingThrows = game.items.filter(item => item.type === 'specialAbility' && item.system.category === 'save');
      const savingThrows = this.items.filter(item => item.type === 'specialAbility' && item.system.category === 'save');
      const saveEntries = Object.entries(savesData);
      const addItems = [];
      //console.debug(saveEntries);
      for (const saveData of saveEntries) {
         const stName = saveData[0];
         if (stName !== 'level' && savingThrows.find(item => item.system.customSaveCode === stName) === undefined
            && addItems.find(item => item.system.customSaveCode === stName) === undefined) {
            const itemData = worldSavingThrows.find(item => item.system.customSaveCode === stName);
            if (itemData) {
               const newSave = itemData.toObject();
               const saveTarget = savesData[newSave.system.customSaveCode];
               newSave.system.target = saveTarget ?? 15;
               //console.debug(`${this.name}(${this.id}) pushed ${newSave.name} (${itemData.system.customSaveCode}/${stName}) = ${saveTarget}.`);
               addItems.push(newSave);
            } else {
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
    * @protected
    * Prepares the actor's encumbrance values. Supports optional settings for different encumbrance systems.
   */
   _prepareEncumbrance(actorType) {
      const encSetting = game.settings.get(game.system.id, "encumbrance");
      let encumbrance = this.system.encumbrance || {};
      let enc = 0;

      //-- Caclulate how much is being carried/tracked --//
      // If using detailed encumbrance, similar to expert rules...
      if (encSetting === 'expert' || encSetting === 'classic') {
         enc = this.items.reduce((sum, item) => {
            const itemWeight = item.system.weight > 0 ? item.system.weight : 0;
            const itemQuantity = item.system.quantity > 0 ? item.system.quantity : 0;
            return sum + (itemWeight * itemQuantity);
         }, 0);
         encumbrance.value = enc || 0;
      }
      // Else if using simple encumbrance, similar to basic rules...
      else if (encSetting === 'basic') {
         encumbrance.value = 0;
      } else {
         encumbrance.value = 0;
      }

      //-- Calculate movement and label --//
      // If max encumbrace is set to zero...
      if (encumbrance.max === 0) {
         encumbrance.mv = this.system.movement.max;
         encumbrance.fly = this.system.flight.max;
      } else {
         this._calculateEncMovement(actorType, enc, encumbrance, encSetting);
      }

      this.system.encumbrance = encumbrance;
   }

   /**
    * Calculate movement rate based on encumbrance.
    * @protected
    * @param {any} actorType The actor.type
    * @param {number} enc The total encumbrance in coins.
    * @param {any} encumbrance The encumbrance object to set.
    * @param {encSetting} The current encumbrance setting.
    */
   _calculateEncMovement(actorType, enc, encumbrance, encSetting) {
      let weightPortion = this.system.encumbrance.max / enc;
      let table = [];
      switch (actorType) {
         case "monster":
            table = CONFIG.FADE.Encumbrance.monster;
            break;
         case "character":
            if (encSetting === 'classic' || encSetting === 'basic') {
               table = CONFIG.FADE.Encumbrance.classicPC;
            } else if (encSetting === 'expert') {
               table = CONFIG.FADE.Encumbrance.expertPC;
            }
            break;
      }

      if (table.length > 0) {
         let encTier = table.length > 0 ? table[0] : null;
         if (encSetting === 'basic') {
            if (this.system.equippedArmor?.system.armorWeight === 'light') {
               encTier = table[1];
            } else if (this.system.equippedArmor?.system.armorWeight === 'heavy') {
               encTier = table[2];
            }
         } else {
            encTier = table.find(tier => weightPortion >= tier.wtPortion) || table[table.length - 1];
         }

         if (encTier) {
            encumbrance.label = game.i18n.localize(`FADE.Actor.encumbrance.${encTier.name}.label`);
            encumbrance.desc = game.i18n.localize(`FADE.Actor.encumbrance.${encTier.name}.desc`);
            encumbrance.mv = Math.floor(this.system.movement.max * encTier.mvFactor);
            encumbrance.fly = Math.floor(this.system.flight.max * encTier.mvFactor);
         }
      }
   }

   #getSavingThrow(type) {
      return this.items.find(item => item.type === 'specialAbility' && item.system.category === 'save' && item.system.customSaveCode === type);
   }

   #getMasteryAttackRollMods(weaponData, options, digest, attackType) {
      let result = 0;
      const attackerMastery = this.items.find((item) => item.type === 'mastery' && item.name === weaponData.mastery)?.system;
      if (attackerMastery) {
         const bIsPrimary = options.targetWeaponType === attackerMastery.primaryType || attackerMastery.primaryType === 'all';
         // Get the to hit bonus, if any.
         const toHitMod = bIsPrimary ? attackerMastery.pToHit : attackerMastery.sToHit;
         if (toHitMod > 0) {
            result += toHitMod;
            const primsec = bIsPrimary ? game.i18n.localize('FADE.Mastery.primary') : game.i18n.localize('FADE.Mastery.secondary');
            digest.push(game.i18n.format('FADE.Chat.rollMods.masteryMod', { primsec, mod: toHitMod }));
         }
      } else if (attackType === "missile" && this.type === "character" && this.system.details.species === "Human") {
         // Unskilled use for humans
         result -= 1;
         digest.push(game.i18n.format('FADE.Chat.rollMods.unskilledUse', { mod: "-1" }));
      }
      return result;
   }

   #getMissileAttackRollMods(weaponData, digest, targetData, ammo) {
      let result = 0;
      const systemData = this.system;
      const targetMods = targetData?.mod.combat;
      const hasWeaponMod = weaponData.mod !== undefined && weaponData.mod !== null;

      if (hasWeaponMod && weaponData.mod.toHitRanged !== 0) {
         result += weaponData.mod.toHitRanged;
         digest.push(game.i18n.format('FADE.Chat.rollMods.weaponMod', { mod: weaponData.mod.toHitRanged }));
      }
      if (systemData.mod.combat?.toHitRanged !== 0) {
         result += systemData.mod.combat.toHitRanged;
         digest.push(game.i18n.format('FADE.Chat.rollMods.effectMod', { mod: systemData.mod.combat.toHitRanged }));
      }
      // If the attacker has ability scores...
      if (systemData.abilities && weaponData.tags.includes("thrown") && systemData.abilities.str.mod != 0) {
         result += systemData.abilities.str.mod;
         digest.push(game.i18n.format('FADE.Chat.rollMods.strengthMod', { mod: systemData.abilities.str.mod }));
      } else if (systemData.abilities && systemData.abilities.dex.mod) {
         result += systemData.abilities.dex.mod;
         digest.push(game.i18n.format('FADE.Chat.rollMods.dexterityMod', { mod: systemData.abilities.dex.mod }));
      }
      if (targetMods && targetMods.selfToHitRanged !== 0) {
         result += targetMods.selfToHitRanged;
         digest.push(game.i18n.format('FADE.Chat.rollMods.targetMod', { mod: targetMods.selfToHitRanged }));
      }
      return result;
   }

   #getMeleeAttackRollMods(weaponData, digest, targetData) {
      let result = 0;
      const systemData = this.system;
      const targetMods = targetData?.mod.combat;
      const hasWeaponMod = weaponData.mod !== undefined && weaponData.mod !== null;

      if (hasWeaponMod && weaponData.mod.toHit !== 0) {
         result += weaponData.mod.toHit;
         digest.push(game.i18n.format('FADE.Chat.rollMods.weaponMod', { mod: weaponData.mod.toHit }));
      }
      if (systemData.mod?.combat.toHit !== 0) {
         result += systemData.mod.combat.toHit;
         digest.push(game.i18n.format('FADE.Chat.rollMods.effectMod', { mod: systemData.mod.combat.toHit }));
      }
      // If the attacker has ability scores...
      if (systemData.abilities && systemData.abilities.str.mod !== 0) {
         result += systemData.abilities.str.mod;
         digest.push(game.i18n.format('FADE.Chat.rollMods.strengthMod', { mod: systemData.abilities.str.mod }));
      }
      if (targetMods && targetMods.selfToHit !== 0) {
         result += targetMods.selfToHit;
         digest.push(game.i18n.format('FADE.Chat.rollMods.targetMod', { mod: targetMods.selfToHit }));
      }

      return result;
   }
}
