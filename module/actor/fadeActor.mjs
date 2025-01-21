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
            await token.toggleEffect(CONFIG.statusEffects.find(e => e.id === status), options);
         };
      }
   }

   /**
    * Handler for the updateActor hook.
    * @param {any} updateData
    * @param {any} options
    * @param {any} userId
    */
   async updateActor(updateData, options, userId) {
      if (game.user.isGM) {
         if (updateData.system?.hp?.value !== undefined && updateData.system?.hp?.value <= 0 && updateData.system?.combat?.isDead === undefined) {
            this.update({ "system.combat.isDead": true });
            this.toggleStatusEffect("dead", { active: true, overlay: true });
         } else if (updateData.system?.hp?.value !== undefined && updateData.system?.hp?.value > 0 && updateData.system?.combat?.isDead === undefined) {
            this.update({ "system.combat.isDead": false });
            this.toggleStatusEffect("dead", { active: false });
         }
      }
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
            assignIfUndefined(data, changeData, "prototypeToken.scale", 0.9);
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
      this._prepareEffects();
      this._prepareSpellsUsed();
      this.system.prepareEncumbrance(this.items, this.type);
      this.system.prepareDerivedMovement();
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
      this._prepareArmorClass();
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
         modifier += this.#getMissileAttackRollMods(weaponData, digest, targetData);
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
      this.update({ "system.hp.value": systemData.hp.value });

      // Check if the actor already has the "Dead" effect
      let hasDeadStatus = this.statuses.has("dead");

      if (prevHP > 0 && systemData.hp.value <= 0) {
         isKilled = hasDeadStatus === false;
         if (isKilled) {
            if (this.type === 'character') {
               systemData.combat.deathCount++;
               this.update({
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
            this.update({ "system.combat.isDead": false });
            await this.toggleStatusEffect("dead", { active: false });
            digest.push(game.i18n.format('FADE.Chat.damageRoll.restoredLife', { tokenName: tokenName }));
         }
      }

      let chatContent = source ? `<div class="text-size18">${source.name}</div>` : "";
      for (let msg of digest) {
         chatContent += `<div>${msg}</div>`;
      }

      if (window.toastManager) {
         window.toastManager.showHtmlToast(chatContent, "info", game.settings.get("core", "rollMode"));
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
      const systemData = this.system;
      const savingThrow = systemData.savingThrows[type];
      const rollData = this.getRollData();
      let dataset = {};
      dataset.dialog = "save";
      dataset.pass = "gte";
      dataset.target = savingThrow.value;
      dataset.rollmode = game.settings.get("core", "rollMode");
      dataset.label = game.i18n.localize(`FADE.Actor.Saves.${type}.long`);
      if (this.type === 'character') {
         dataset.type = type;
      }

      let dialogResp = await DialogFactory(dataset, this);

      if (dialogResp?.resp?.rolling === true) {
         rollData.formula = dialogResp.resp?.mod != 0 ? `1d20+@mod` : `1d20`;
         const wisMod = this.system.abilities.wis.mod;
         if (dialogResp.resp.vsmagic === true && wisMod !== 0) {
            rollData.formula = `${rollData.formula}${wisMod > 0 ? '+' : ''}${wisMod}`;
         }
         const rollContext = { ...rollData, ...dialogResp?.resp || {} };
         let rolled = await new Roll(rollData.formula, rollContext).evaluate();
         const chatData = {
            dialogResp: dialogResp,
            context: this,
            caller: this,
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
    * @param {any} fuelItemId An owned light or fuel item's id.
    */
   setActiveLight(lightItemId, fuelItemId) {
      this.update({
         "system.activeLight": lightItemId,
         "system.activeFuel": fuelItemId
      });
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
      if ((!ammoType || ammoType === "" || ammoType === "none") && weapon.system.quantity !== 0) {
         ammoItem = weapon;
      } else {
         // Find an item in the actor's inventory that matches the ammoType and has a quantity > 0
         ammoItem = this.items.find(item => item.type === "item" && item.system.equipped === true
            && item.system.ammoType == ammoType && item.system.quantity !== 0);
      }

      return ammoItem;
   }

   /**
    * Finds the best defense mastery for the specified attacker's weapon type.
    * @public
    * @param {any} attackerWeaponType
    * @returns
    */
   getBestDefenseMastery(attackerWeaponType) {
      let result = null;
      const defenseMasteries = this.system.ac.mastery;
      if (defenseMasteries?.length > 0) {
         result = defenseMasteries.filter(mastery => mastery.acBonusType === attackerWeaponType)
            .reduce((minMastery, current) => current.acBonus < minMastery.acBonus ? current : minMastery,
               { acBonus: Infinity });
      }
      return result;
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
            const weaponMastery = masteries.find((mastery) => { return mastery.name === weapon.system.mastery; });
            if (weaponMastery) {
               results.push({
                  acBonusType: weaponMastery.system.acBonusType,
                  acBonus: weaponMastery.system.acBonus || 0,
                  total: ac.total + (weaponMastery.system.acBonus || 0),
                  totalAAC: 19 - ac.total + (weaponMastery.system.acBonus || 0),
                  acBonusAT: weaponMastery.system.acBonusAT
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
         && (item.system.quantity === null || item.system.quantity > 0)?.length > 0)) {
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
         && (item.system.memorized /* support infinite?*/))?.length > 0) {
         result.push("spell");
      }
      return result;
   }

   /** 
    * Performs base classe prep of actor's active effects.
    * Disables effects from items that are equippable and not equipped. 
    * @protected 
    */
   _prepareEffects() {
      // Iterate over all applicable effects
      for (const effect of this.allApplicableEffects()) {
         //this.effects.forEach((effect) => {
         const parentItem = effect.parent;
         // If the effect has a parent and the parent is an equippable item...
         if (parentItem && parentItem.type === 'item' && parentItem.system.equippable === true) {
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
      const systemData = this.system;
      const spells = this.items.filter((item) => item.type === 'spell');
      //const highestSpellLevel = spells.reduce((max, current) => {
      //   return current.spellLevel > max.spellLevel ? current : max;
      //})?.spellLevel;
      let spellSlots = systemData.spellSlots || [];

      // Reset used spells to zero
      for (let i = 0; i < systemData.config.maxSpellLevel; i++) {
         let slot = spellSlots[i] || {};
         slot.used = 0;
      }

      if (spellSlots.length > 0) {
         for (let spell of spells) {
            if (spell.system.memorized > 0) {
               spellSlots[spell.system.spellLevel].used += spell.system.memorized;
            }
         }
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

   #getMissileAttackRollMods(weaponData, digest, targetData) {
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
