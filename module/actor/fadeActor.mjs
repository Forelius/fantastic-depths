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

      const assignIfUndefined = (obj, key, value) => {
         if (!foundry.utils.getProperty(obj, key)) {
            foundry.utils.setProperty(obj, key, value);
         }
      };

      switch (this.type) {
         case "character":
            Object.assign(changeData, {
               "prototypeToken.sight.enabled": true,
               "prototypeToken.sight.visionMode": "basic"
            });
            assignIfUndefined(changeData, "img", `${fdPath}/fighter1.webp`);
            assignIfUndefined(changeData, "prototypeToken.texture.src", `${fdPath}/fighter1a.webp`);
            assignIfUndefined(changeData, "prototypeToken.disposition", CONST.TOKEN_DISPOSITIONS.FRIENDLY);
            assignIfUndefined(changeData, "prototypeToken.actorLink", true);
            assignIfUndefined(changeData, "prototypeToken.scale", 0.9);
            assignIfUndefined(changeData, "prototypeToken.displayName", CONST.TOKEN_DISPLAY_MODES.HOVER);
            break;
         case "npc":
            Object.assign(changeData, {
               "prototypeToken.sight.enabled": true,
               "prototypeToken.sight.visionMode": "basic"
            });
            assignIfUndefined(changeData, "img", `${fdPath}/hero1.webp`);
            assignIfUndefined(changeData, "prototypeToken.texture.src", `${fdPath}/hero1a.webp`);
            assignIfUndefined(changeData, "prototypeToken.disposition", CONST.TOKEN_DISPOSITIONS.NEUTRAL);
            assignIfUndefined(changeData, "prototypeToken.actorLink", true);
            assignIfUndefined(changeData, "prototypeToken.scale", 0.9);
            assignIfUndefined(changeData, "prototypeToken.displayName", CONST.TOKEN_DISPLAY_MODES.HOVER);
            break;
         case "monster":
            assignIfUndefined(changeData, "img", `${fdPath}/monster1.webp`);
            assignIfUndefined(changeData, "prototypeToken.texture.src", `${fdPath}/monster1a.webp`);
            assignIfUndefined(changeData, "prototypeToken.displayName", CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER);
            assignIfUndefined(changeData, "prototypeToken.disposition", CONST.TOKEN_DISPOSITIONS.HOSTILE);
            assignIfUndefined(changeData, "prototypeToken.actorLink", false);
            assignIfUndefined(changeData, "prototypeToken.scale", 0.9);
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
      const systemData = this.system;

      this._prepareEffects();

      systemData.combat = systemData.combat || {};
      systemData.combat.attacksAgainst = systemData.combat.attacksAgainst || 0;
      systemData.config = systemData.config || {};
      systemData.config.isSpellcaster = systemData.config.isSpellcaster || false;
      systemData.config.isRetainer = systemData.config.isRetainer || false;
      systemData.encumbrance = systemData.encumbrance || {};

      if (this.type === "monster") {
         systemData.encumbrance.max = systemData.encumbrance.max || 0;
      } else {
         systemData.encumbrance.max = systemData.encumbrance.max || CONFIG.FADE.Encumbrance.maxLoad;
      }

      this._prepareMovement();
      systemData.details = systemData.details || {};
      systemData.ac = systemData.ac || {};

      this._prepareHitPoints();
      systemData.thac0 = systemData.thac0 || {};

      this._prepareBaseSavingThrows();

      if (systemData.config.isSpellcaster === true) {
         this._prepareSpells();
      }

      this._prepareModifiers();
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
      this._prepareArmorClass();
      this._prepareEncumbrance();
      this._prepareDerivedMovement();
      this._prepareSpellsUsed();
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

      if (options.mod && options.mod !== 0) {
         modifier += options.mod;
         //formula = `${formula}+@mod`; 
         digest.push(`Manual mod: ${options.mod}`);
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
            digest.push(`Mastery mod: ${toHitMod}`);
         }
      } else if (attackType === "missile") {
         // Unskilled use
         result -= 1;
         digest.push(`Unskilled ranged weapon use: -1`);
      }
      return result;
   }

   #getMissileAttackRollMods(weaponData, digest, targetData) {
      let result = 0;
      const systemData = this.system;
      const targetMods = targetData?.mod.combat;
      const hasWeaponMod = weaponData.mod !== undefined && weaponData.mod !== null;

      if (hasWeaponMod && weaponData.mod.toHitRanged !== 0) {
         //formula = `${formula}+${weaponData.mod.toHitRanged}`;
         result += weaponData.mod.toHitRanged;
         digest.push(`Weapon mod: ${weaponData.mod.toHitRanged}`);
      }
      if (systemData.mod.combat?.toHitRanged !== 0) {
         result += systemData.mod.combat.toHitRanged;
         //formula = `${formula}+${systemData.mod.combat.toHitRanged}`;
         digest.push(`Attacker effect mod: ${systemData.mod.combat.toHitRanged}`);
      }
      // If the attacker has ability scores...
      if (systemData.abilities && weaponData.tags.includes("thrown") && systemData.abilities.str.mod != 0) {
         result += systemData.abilities.str.mod;
         //formula = `${formula}+${systemData.abilities.str.mod}`;
         digest.push(`Strength mod: ${systemData.abilities.str.mod}`);
      } else if (systemData.abilities && systemData.abilities.dex.mod) {
         result += systemData.abilities.dex.mod;
         //formula = `${formula}+${systemData.abilities.dex.mod}`;
         digest.push(`Dexterity mod: ${systemData.abilities.dex.mod}`);
      }
      if (targetMods && targetMods.selfToHitRanged !== 0) {
         result += targetMods.selfToHitRanged;
         //formula = `${formula}+${targetMods.selfToHitRanged}`;
         digest.push(`Target effect mod: ${targetMods.selfToHitRanged}`);
      }
      return result;
   }

   #getMeleeAttackRollMods(weaponData, digest, targetData) {
      let result = 0;
      const systemData = this.system;
      const targetMods = targetData?.mod.combat;
      const hasWeaponMod = weaponData.mod !== undefined && weaponData.mod !== null;

      if (hasWeaponMod && weaponData.mod.toHit !== 0) {
         //formula = `${formula}+${weaponData.mod.toHit}`;
         result += weaponData.mod.toHit;
         digest.push(`Weapon mod: ${weaponData.mod.toHit}`);
      }
      if (systemData.mod?.combat.toHit !== 0) {
         //formula = `${formula}+${systemData.mod.combat.toHit}`;
         result += systemData.mod.combat.toHit;
         digest.push(`AttsystemData.mod.combat.toHitacker effect mod: ${systemData.mod.combat.toHit}`);
      }
      // If the attacker has ability scores...
      if (systemData.abilities && systemData.abilities.str.mod !== 0) {
         //formula = `${formula}+${systemData.abilities.str.mod}`;
         result += systemData.abilities.str.mod;
         digest.push(`Strength mod: ${systemData.abilities.str.mod}`);
      }
      if (targetMods && targetMods.selfToHit !== 0) {
         //formula = `${formula}+${targetMods.selfToHit}`;
         result += targetMods.selfToHit;
         digest.push(`Target effect mod: ${targetMods.selfToHit}`);
      }

      return result;
   }

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
         digest.push(`${systemData.hp.value - prevHP} hit points restored to ${tokenName}.`);
      } else {
         if (damageMitigated !== 0) {
            dmgAmt -= damageMitigated;
            digest.push(`${damageMitigated} points of ${damageType} damage mitigated.`);
         }
         systemData.hp.value -= dmgAmt;
         digest.push(`${dmgAmt} points of ${damageType} damage applied to ${tokenName}.`);
      }
      this.update({ "system.hp.value": systemData.hp.value });

      // Check if the actor already has the "Dead" effect
      let hasDeadStatus = this.statuses.has("dead");

      if (prevHP > 0 && systemData.hp.value <= 0) {
         if (this.type === 'character') {
            systemData.details.deathCount++;
            this.update({ "system.details.deathCount": systemData.details.deathCount })
         }
         isKilled = hasDeadStatus === false;
         if (isKilled) {
            await this.toggleStatusEffect("dead", { active: true, overlay: true });
            digest.push(`<span class='attack-fail'>${tokenName} has fallen in battle.</span>`);
         }
      } else if (prevHP < 0 && systemData.hp.value > 0) {
         isRestoredToLife = hasDeadStatus === true;
         if (isRestoredToLife) {
            await this.toggleStatusEffect("dead", { active: false });
            digest.push(`<span class='attack-success'>${tokenName} has been restored to life.</span>`);
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
            if (effect.isTemporary && effect.duration) {
               effect.updateDuration();
               // Adjust the duration based on the time passed
               if (effect.duration.remaining <= 0) {
                  // Effect expired
                  effect.delete();

                  // Notify chat.
                  const speaker = { alias: game.users.get(game.userId).name };  // Use the player's name as the speaker
                  let chatContent = `<div>${effect.name} on ${this.name} ends.</div>`;
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
         ui.notifications.warn("A token must first be selected.")
      } else {
         for (let target of selected) {
            // Apply damage to the token's actor
            target.actor.rollSavingThrow(dataset.type);
         }
      }
   }

   _prepareModifiers() {
      // Modifiers are often applied as a negative value, even though the modifer is a positive value.
      this.system.mod = {
         ac: 0,
         combat: {
            toHit: 0,
            dmg: 0,
            toHitRanged: 0,
            dmgRanged: 0,
            // These only work with damage automation
            selfDmg: 0,
            selfDmgBreath: 0,
            selfDmgBreathScale: 1,
            selfDmgMagic: 0,
            selfDmgFrost: 0,
            selfDmgFire: 0,
            // These only work if actor is targetted
            selfToHit: 0, // to hit this actor
            selfToHitRanged: 0 // to hit this actor
         },
         save: {
            all: 0,
            death: 0,
            wand: 0,
            paralysis: 0,
            breath: 0,
            spell: 0
         }
      };
   }

   _prepareEffects() {
      // Iterate over all applicable effects
      this.allApplicableEffects().forEach((effect) => {
         const parentItem = effect.parent;
         // If the effect has a parent and the parent is an equippable item...
         if (parentItem && parentItem.type === 'item' && parentItem.system.isEquippable === true) {
            // Set disabled state of effect based on item equipped state
            effect.disabled = !parentItem.system.equipped;
         }
      });
   }

   _prepareBaseSavingThrows() {
      const systemData = this.system;
      let savingThrows = systemData.savingThrows || {};
      const savingThrowTypes = ["death", "wand", "paralysis", "breath", "spell"];
      savingThrowTypes.forEach(savingThrow => {
         savingThrows[savingThrow] = savingThrows[savingThrow] || { value: 15 };
      });
      systemData.savingThrows = savingThrows;
   }

   /**
    * Prepares derived saving throw values based on class name and class level.
    * @protected
    * @param {any} className The class name (Fighter, Cleric, etc.)
    * @param {number} classLevel The level of the class.
    */
   _prepareSavingThrows(className, classLevel) {
      const systemData = this.system;
      // Replace hyphen with underscore for "Magic-User"
      const classNameInput = className.toLowerCase().replace('_', '-');
      const classes = CONFIG.FADE.Classes;
      // Find a match in the FADE.Classes data
      const classData = Object.values(classes).find(cdata => cdata.name.toLowerCase() === classNameInput);
      let savingThrows = systemData.savingThrows || {};
      // If matching class data was found...
      if (classData !== undefined) {
         // Apply the class data
         const savesData = classData.saves.find(save => classLevel <= save.level);
         for (let saveType in savesData) {
            if (savingThrows.hasOwnProperty(saveType)) {
               savingThrows[saveType].value = savesData[saveType];
            }
         }
      }

      // Apply mods, mostly from effects
      const mods = systemData.mod.save;
      savingThrows.death.value -= mods.death + mods.all;
      savingThrows.wand.value -= mods.wand + mods.all;
      savingThrows.paralysis.value -= mods.paralysis + mods.all;
      savingThrows.breath.value -= mods.breath + mods.all;
      savingThrows.spell.value -= mods.spell + mods.all;

      // Apply modifier for wisdom, if needed
      if (this.type !== "monster") {
         savingThrows.spell.value -= systemData.abilities.wis.mod;
      }

      systemData.savingThrows = savingThrows;
   }

   /**
    * Prepares the hit point related values.
    * @protected
    */
   _prepareHitPoints() {
      const systemData = this.system;
      let hp = this.system.hp || {};
      hp.value = hp.value ?? 0;
      hp.max = hp.max ?? 0;
      if (this.type === "monster") {
         hp.hd = hp.hd || "1";
      } else {
         hp.hd = hp.hd || "1d8";
      }
      systemData.hp = hp;
   }

   /**
    * Prepare ground movement and flight rates.
    * @protected
    */
   _prepareMovement() {
      const systemData = this.system;
      let movement = systemData.movement || {};
      let flight = systemData.flight || {};
      if (this.type === "monster") {
         movement.max = movement.max || movement.turn || 0;
         flight.max = flight.max || flight.turn || 0;
         flight.turn = flight.turn || 0;
      } else {
         movement.max = movement.max || CONFIG.FADE.Encumbrance.maxMove;
         flight.max = flight.max || 0;
         flight.turn = flight.turn || 0;
      }
      systemData.movement = movement;
      systemData.flight = flight;
   }

   /**
    * Prepare derived armor class values.
    * @protected
    */
   _prepareArmorClass() {
      const systemData = this.system;
      const dexMod = (systemData.abilities?.dex.mod ?? 0);
      const baseAC = CONFIG.FADE.Armor.acNaked - dexMod;
      let ac = {};
      ac.naked = baseAC;
      ac.value = baseAC;
      ac.total = baseAC;
      ac.mod = 0;
      ac.shield = 0;

      const naturalArmor = this.items.find(item =>
         item.type === 'armor' && item.system.natural
      );

      const equippedArmor = this.items.find(item =>
         item.type === 'armor' && item.system.equipped && !item.system.isShield
      );

      const equippedShield = this.items.find(item =>
         item.type === 'armor' && item.system.equipped && item.system.isShield
      );

      // If natural armor
      if (naturalArmor?.system.totalAc !== null && naturalArmor?.system.totalAc !== undefined) {
         ac.naked = naturalArmor.system.totalAc;
      }

      // If an equipped armor is found
      if (equippedArmor) {
         ac.value = equippedArmor.system.ac;
         ac.mod = equippedArmor.system.mod ?? 0;
         ac.total = equippedArmor.system.totalAc;
      }

      if (equippedShield) {
         ac.shield = equippedShield.system.ac + (equippedShield.system.ac.mod ?? 0);
         ac.total -= ac.shield;
      }

      // Now other mods.
      ac.total = ac.total - (systemData.mod.ac ?? 0) - dexMod;

      // Weapon mastery defense bonuses
      const masteryEnabled = game.settings.get(game.system.id, "weaponMastery");
      const masteries = this.items.filter(item => item.type === "mastery");
      const equippedWeapons = this.items.filter((item) => item.type === "weapon" && item.system.equipped);
      if (masteryEnabled && masteries?.length > 0 && equippedWeapons?.length > 0) {
         ac.mastery = [];
         for (let weapon of equippedWeapons) {
            const weaponMastery = masteries.find((mastery) => { return mastery.name === weapon.system.mastery; });
            //console.debug(this.name, weaponMastery?.system, systemData.combat.attacksAgainst);
            if (weaponMastery/* && weaponMastery.system.acBonusAT > systemData.combat.attacksAgainst*/) {
               ac.mastery.push({
                  acBonusType: weaponMastery.system.acBonusType,
                  acBonus: weaponMastery.system.acBonus,
                  total: ac.total + weaponMastery.system.acBonus,
                  acBonusAT: weaponMastery.system.acBonusAT
               });
            }
         }
         //console.debug(this.name, ac.mastery);
      }

      systemData.ac = ac;
   }

   /**
    * Prepares the spell slots used and max values.
    * @protected
    */
   _prepareSpells() {
      const systemData = this.system;
      let spellSlots = systemData.spellSlots || [];

      for (let i = 0; i < 9; i++) {
         spellSlots[i] = systemData.spellSlots?.[i] || {};
         spellSlots[i].spellLevel = i;
         spellSlots[i].used = systemData.spellSlots?.[i].used || 0;
         spellSlots[i].max = systemData.spellSlots?.[i]?.max || 0;
      }

      systemData.spellSlots = spellSlots;
   }

   /**
    * Prepares the used spells per level totals
    * @protected
    */
   _prepareSpellsUsed() {
      const systemData = this.system;
      let spellSlots = systemData.spellSlots || [];

      // Reset used spells to zero
      for (let i = 0; i < 9; i++) {
         let slot = spellSlots[i] || {};
         slot.used = 0;
      }

      const spells = this.items.filter((item) => item.type === 'spell');
      for (let spell of spells) {
         if (spell.system.memorized > 0) {
            spellSlots[spell.system.spellLevel].used += spell.system.memorized;
         }
      }

      systemData.spellSlots = spellSlots;
   }

   /**
    * Prepares the actor's encumbrance values. Supports optional settings for different encumbrance systems.
    * @protected
    */
   _prepareEncumbrance() {
      const systemData = this.system;
      const encSetting = game.settings.get(game.system.id, "encumbrance");
      if (!encSetting) console.error("_prepareEncumbrance(): encSetting has no value!");
      let encumbrance = systemData.encumbrance || {};
      let enc = 0;

      //-- Caclulate how much is being carried/tracked --//
      // If using detailed encumbrance, similar to expert rules...
      if (encSetting === 'expert') {
         enc = this.items.reduce((sum, item) => {
            const itemWeight = item.system.weight || 0;
            const itemQuantity = item.system.quantity || 1;
            return sum + (itemWeight * itemQuantity);
         }, 0);
         encumbrance.value = enc || 0;
      }
      // Else if using simple encumbrance, similar to basic rules...
      else if (encSetting === 'basic') {
         enc = this.items.filter((item) => {
            return item.type === "armor";
         }).reduce((sum, item) => {
            const itemWeight = item.system.weight || 0;
            const itemQuantity = item.system.quantity || 1;
            return sum + (itemWeight * itemQuantity);
         }, 0);
         encumbrance.value = enc || 0;
      } else {
         encumbrance.value = 0;
      }

      //-- Calculate movement and label --//
      // If max encumbrace is set to zero...
      if (encumbrance.max === 0) {
         encumbrance.mv = systemData.movement.max;
         encumbrance.fly = systemData.flight.max;
      } else {
         this._calculateEncMovement(enc, encumbrance);
      }

      systemData.encumbrance = encumbrance;
   }

   /**
    * Calculate movement rate based on encumbrance.
    * @protected
    * @param {number} enc The total encumbrance in coins.
    * @param {any} encumbrance The encumbrance object to set.
    */
   _calculateEncMovement(enc, encumbrance) {
      const systemData = this.system;
      const isMonster = this.type === "monster";
      let weightPortion = systemData.encumbrance.max / enc;
      const table = (this.type === "monster") ? CONFIG.FADE.Encumbrance.monster : CONFIG.FADE.Encumbrance.pc;
      let encTier = table.find(tier => weightPortion >= tier.wtPortion) || table[table.length - 1];
      encumbrance.label = encTier.label;
      encumbrance.desc = encTier.desc;
      // This is a maximum movement for the current encumbered tier
      encumbrance.mv = systemData.movement.max * encTier.mvFactor;
      encumbrance.fly = systemData.flight.max * encTier.mvFactor;
   }

   /**
    * Prepare the actor's movement rate values.
    * @protected
    */
   _prepareDerivedMovement() {
      const systemData = this.system;
      let movement = systemData.movement || {};
      let flight = systemData.flight || {};

      movement.turn = systemData.encumbrance.mv;
      flight.turn = systemData.encumbrance.fly || 0;

      movement.round = movement.turn > 0 ? Math.floor(movement.turn / 3) : 0;
      movement.day = movement.turn > 0 ? Math.floor(movement.turn / 5) : 0;
      movement.run = movement.turn;

      flight.round = flight.turn > 0 ? Math.floor(flight.turn / 3) : 0;
      flight.day = flight.turn > 0 ? Math.floor(flight.turn / 5) : 0;
      flight.run = flight.turn;

      systemData.movement = movement;
      systemData.flight = flight;
   }
}
