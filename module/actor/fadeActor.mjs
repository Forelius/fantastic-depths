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

   getAttackRoll(weapon, attackType, mod) {
      const weaponData = weapon.system;
      const systemData = this.system;
      let formula = mod != 0 ? '1d20+@mod' : '1d20';
      if (attackType === "melee") {
         if (weaponData.mod.toHit !== 0) {
            formula = `${formula}+${weaponData.mod.toHit}`;
         }
         if (systemData.mod.toHit !== 0) {
            formula = `${formula}+${systemData.mod.toHit}`;
         }
         // If the attacker has ability scores...
         if (systemData.abilities && systemData.abilities.str.mod !== 0) {
            formula = `${formula}+${systemData.abilities.str.mod}`;
         }
      } else {
         // Missile attack
         if (weaponData.mod.toHitRanged !== 0) {
            formula = `${formula}+${weaponData.mod.toHitRanged}`;
         }
         if (systemData.mod.toHitRanged !== 0) {
            formula = `${formula}+${systemData.mod.toHitRanged}`;
         }
         // If the attacker has ability scores...
         if (systemData.abilities && weaponData.tags.includes("thrown") && systemData.abilities.str.mod != 0) {
            formula = `${formula}+${systemData.abilities.str.mod}`;
         } else if (systemData.abilities && systemData.abilities.dex.mod) {
            formula = `${formula}+${systemData.abilities.dex.mod}`;
         }
         const weaponMastery = game.settings.get(game.system.id, "weaponMastery");
         if (weaponMastery && weaponData.mastery !== "" && this.type === "character" && systemData.details.species === "Human") {
            const attackerMastery = this.items.find((item) => item.type === 'mastery' && item.name === weaponData.mastery);
            if (attackerMastery) {
               // do stuff
            } else {
               // Unskilled use
               formula = `${formula}-1`;
            }
         }
      }
      return formula;
   }

   async applyDamage(amount, type, source = null) {
      const systemData = this.system;
      let dmgAmt = amount;
      const prevHP = systemData.hp.value;

      switch (type) {
         case 'physical':
            dmgAmt -= systemData.mod.combat.selfDmg;
            break;
         case 'breath':
            dmgAmt -= systemData.mod.combat.selfDmgBreath;
            break;
         case 'magic':
            dmgAmt -= systemData.mod.combat.selfDmgMagic;
            break;
      }
      systemData.hp.value -= dmgAmt;
      this.update({ "system.hp.value": systemData.hp.value })

      // Check if the actor already has the "Dead" effect
      let hasDeadEffect = this.effects.some(e => e.getFlag("core", "statusId") === "dead");

      if (prevHP > 0 && systemData.hp.value <= 0) {
         if (this.type === 'character') {
            systemData.details.deathCount++;
            this.update({ "system.details.deathCount": systemData.details.deathCount })
         }
         if (hasDeadEffect === false) {
            // Apply the "Dead" status effect
            await this.toggleEffect(CONFIG.statusEffects.find(e => e.id === "dead"));
         }
      } else if (prevHP < 0 && systemData.hp.value > 0) {
         if (hasDeadEffect === true) {
            await this.toggleEffect(CONFIG.statusEffects.find(e => e.id === "dead"));
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
            selfDmgMagic: 0
         },
         save: {
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
      savingThrows.death.value -= systemData.mod.save.death;
      savingThrows.wand.value -= systemData.mod.save.wand;
      savingThrows.paralysis.value -= systemData.mod.save.paralysis;
      savingThrows.breath.value -= systemData.mod.save.breath;
      savingThrows.spell.value -= systemData.mod.save.spell;

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