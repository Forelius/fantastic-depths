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
            this.toggleStatusEffect && this.toggleStatusEffect("dead", { active: true, overlay: true });
         } else if (updateData.system?.hp?.value !== undefined && updateData.system?.hp?.value > 0 && updateData.system?.combat?.isDead === undefined) {
            this.update({ "system.combat.isDead": false });
            this.toggleStatusEffect && this.toggleStatusEffect("dead", { active: false });
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
      this.system.prepareArmorClass(this.items);
      super.prepareDerivedData();
   }

   getRollData() {
      const data = { ...this.system };
      return data;
   }

   /**
    * Get the attack roll formula for the specified weapon, attack type, mod and target.
    * @param {any} weapon The weapon being used to attack with.
    * @param {any} attackType The type of attack. Values are melee or missile
    * @param {any} options An object containing one or more of the following:
    *    mod - A manual modifier entered by the user.
    *    target - This doesn't work when there are multiple targets.
    *    targetWeaponType - For weapon mastery system, the type of weapon the target is using (monster or handheld).
    * @returns
    */
   getAttackRoll(weapon, attackType, options = {}) {
      const weaponData = weapon.system;
      const systemData = this.system;
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

      if (masteryEnabled && weaponData.mastery !== "" && this.type === "character" && systemData.details.species === "Human") {
         modifier += this.#getMasteryAttackRollMods(weaponData, options, digest, attackType);
      }

      if (modifier !== 0) {
         formula = `${formula}+${modifier}`;
      }

      return { formula, digest };
   }

   /**
    * Attemtps to determine the weapon type of this actor.
    * @returns The weapon type of this actor or 'monster' if it can't be determined.
    */
   getWeaponType() {
      let result = 'monster';
      const weapons = this.items.filter(item => item.type === 'weapon');
      const equippedWeapons = weapons?.filter(item => item.system.equipped === true);
      if (equippedWeapons && equippedWeapons.length > 0) {
         result = equippedWeapons[0].system.weaponType;
      } else if (weapons && weapons.length > 0) {
         result = 'monster';
         console.warn(`${this.name} has weapons, but none are equipped.`)
      }
      return result;
   }

   /**
    * Applies damage or healing to the actor.
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
            this.toggleStatusEffect && await this.toggleStatusEffect("dead", { active: true, overlay: true });
            digest.push(game.i18n.format('FADE.Chat.damageRoll.killed', { tokenName: tokenName }));
         }
      } else if (prevHP < 0 && systemData.hp.value > 0) {
         isRestoredToLife = hasDeadStatus === true;
         if (isRestoredToLife) {
            this.update({ "system.combat.isDead": false });
            this.toggleStatusEffect && await this.toggleStatusEffect("dead", { active: false });
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
   * @returns
   */
   onUpdateWorldTime() {
      // Only the GM should handle updating effects
      if (!game.user.isGM) return;

      // Ensure there's an active scene and tokens on the canvas
      if (!canvas?.scene) return;

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
      dataset.dialog = "generic";
      dataset.pass = "gte";
      dataset.target = savingThrow.value;
      dataset.rollmode = game.settings.get("core", "rollMode");
      dataset.label = game.i18n.localize(`FADE.Actor.Saves.${type}.long`);

      let dialogResp = await DialogFactory(dataset, this);
      rollData.formula = dialogResp.resp?.mod != 0 ? `1d20+@mod` : `1d20`;

      if (dialogResp?.resp?.rolling === true) {
         const rollContext = { ...rollData, ...dialogResp?.resp || {} };
         let rolled = await new Roll(rollData.formula, rollContext).evaluate();
         const chatData = {
            dialogResp: dialogResp,
            context: this,
            mdata: dataset,
            roll: rolled,
         };
         const builder = new ChatFactory(CHAT_TYPE.GENERIC_ROLL, chatData);
         return await builder.createChatMessage();
      }
   }

   static async handleSavingThrowRequest(event) {
      event.preventDefault(); // Prevent the default behavior
      event.stopPropagation(); // Stop other handlers from triggering the event
      const dataset = event.currentTarget.dataset;
      const selected = Array.from(canvas.tokens.controlled);
      let hasSelected = selected.length > 0;
      if (hasSelected === false) {
         ui.notifications.warn(game.i18n.format('FADE.notification.selectToken1'));
      } else {
         for (let target of selected) {
            // Apply damage to the token's actor
            target.actor.rollSavingThrow(dataset.type);
         }
      }
   }

   #getMasteryAttackRollMods(weaponData, options, digest, attackType) {
      let result = 0;
      const target = options.target;
      const targetData = options.target?.system;
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
      } else if (attackType === "missile") {
         // Unskilled use
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

   /** 
    * @protected 
    */
   _prepareEffects() {
      // Iterate over all applicable effects
      this.allApplicableEffects().forEach((effect) => {
      //this.effects.forEach((effect) => {
         const parentItem = effect.parent;
         // If the effect has a parent and the parent is an equippable item...
         if (parentItem && parentItem.type === 'item' && parentItem.system.equippable === true) {
            // Set disabled state of effect based on item equipped state
            effect.disabled = !parentItem.system.equipped;
         }
      });
   }

   /**
    * Prepares the used spells per level totals
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
}
