export class fadeActorDataModel extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      const { fields } = foundry.data;
      return {
         config: new fields.SchemaField({
            maxSpellLevel: new fields.NumberField({ required: true, initial: 0 }),
            isRetainer: new fields.BooleanField({ initial: false }),
         }),
         biography: new fields.StringField({ initial: "" }),
         retainer: new fields.SchemaField({
            loyalty: new fields.NumberField({ initial: 0 }),
            wage: new fields.StringField({ initial: "" }),
         }),
         hp: new fields.SchemaField({
            hd: new fields.StringField({ initial: "1d8" }),
            value: new fields.NumberField({ initial: 5 }),
            max: new fields.NumberField({ initial: 5 }),
         }),
         ac: new fields.SchemaField({
            naked: new fields.NumberField({ initial: 9 }),
            nakedAAC: new fields.NumberField({ initial: 10 }),
            value: new fields.NumberField({ initial: 9 }),
            total: new fields.NumberField({ initial: 9 }),
            totalAAC: new fields.NumberField({ initial: 10 }),
            shield: new fields.NumberField({ initial: 0 }),
            mod: new fields.NumberField({ initial: 0 }),
         }),
         thac0: new fields.SchemaField({
            value: new fields.NumberField({ initial: 19 }),
            mod: new fields.SchemaField({
               missile: new fields.NumberField({ initial: 0 }),
               melee: new fields.NumberField({ initial: 0 }),
            }),
         }),
         thbonus: new fields.NumberField({ initial: 0 }),
         savingThrows: new fields.SchemaField({
            death: new fields.SchemaField({
               value: new fields.NumberField({ initial: 0 }),
            }),
            wand: new fields.SchemaField({
               value: new fields.NumberField({ initial: 0 }),
            }),
            paralysis: new fields.SchemaField({
               value: new fields.NumberField({ initial: 0 }),
            }),
            breath: new fields.SchemaField({
               value: new fields.NumberField({ initial: 0 }),
            }),
            spell: new fields.SchemaField({
               value: new fields.NumberField({ initial: 0 }),
            }),
         }),
         movement: new fields.SchemaField({
            turn: new fields.NumberField({ initial: 120 }),
            max: new fields.NumberField({ initial: 120 }),
            round: new fields.NumberField({ initial: 0 }),
            day: new fields.NumberField({ initial: 0 }),
            run: new fields.NumberField({ initial: 0 }),
         }),
         flight: new fields.SchemaField({
            turn: new fields.NumberField({ initial: 0 }),
            max: new fields.NumberField({ initial: 0 }),
            round: new fields.NumberField({ initial: 0 }),
            day: new fields.NumberField({ initial: 0 }),
            run: new fields.NumberField({ initial: 0 }),
         }),
         encumbrance: new fields.SchemaField({
            value: new fields.NumberField({ initial: 0 }),
            max: new fields.NumberField({ initial: 2400 }),
            mv: new fields.NumberField({ initial: 0 }),
            fly: new fields.NumberField({ initial: 0 }),
         }),
         initiative: new fields.SchemaField({
            value: new fields.NumberField({ initial: 0 }),
            mod: new fields.NumberField({ initial: 0 }),
         }),
         languages: new fields.StringField({ initial: "" }),
         combat: new fields.SchemaField({
            attacks: new fields.NumberField({ initial: 0 }),
            attacksAgainst: new fields.NumberField({ initial: 0 }),
            deathCount: new fields.NumberField({ initial: 0 }),
            isDead: new fields.BooleanField({ initial: false }),
         }),
         gm: new fields.SchemaField({
            notes: new fields.StringField({ initial: "" }),
         }),
         spellSlots: new fields.ArrayField(new fields.SchemaField({
            spellLevel: new fields.NumberField({ initial: 0 }),
            used: new fields.NumberField({ initial: 0 }),
            max: new fields.NumberField({ initial: 0 })
         }), {
            required: false,
            initial: Array.from({ length: this.maxSpellLevel }, (_, index) => {
               const newLevel = new ClassLevelData();
               newLevel.spellLevel = index + 1;
               return newLevel;
            })
         }),
         mod: new fields.SchemaField({
            ac: new fields.NumberField({ initial: 0 }),
            initiative: new fields.NumberField({ initial: 0 }),
            combat: new fields.SchemaField({
               toHit: new fields.NumberField({ initial: 0 }),
               dmg: new fields.NumberField({ initial: 0 }),
               toHitRanged: new fields.NumberField({ initial: 0 }),
               dmgRanged: new fields.NumberField({ initial: 0 }),
               selfDmg: new fields.NumberField({ initial: 0 }),
               selfDmgBreath: new fields.NumberField({ initial: 0 }),
               selfDmgBreathScale: new fields.NumberField({ initial: 0 }),
               selfDmgMagic: new fields.NumberField({ initial: 0 }),
               selfDmgFrost: new fields.NumberField({ initial: 0 }),
               selfDmgFire: new fields.NumberField({ initial: 0 }),
               selfToHit: new fields.NumberField({ initial: 0 }),
               selfToHitRanged: new fields.NumberField({ initial: 0 }),
            }),
            save: new fields.SchemaField({
               all: new fields.NumberField({ initial: 0 }),
               death: new fields.NumberField({ initial: 0 }),
               wand: new fields.NumberField({ initial: 0 }),
               paralysis: new fields.NumberField({ initial: 0 }),
               breath: new fields.NumberField({ initial: 0 }),
               spell: new fields.NumberField({ initial: 0 }),
            })
         })
      };
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
      this._prepareMods();
      this._prepareSpells();
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
   }

   /**
    * Prepare derived armor class values.
    * @protected
    */
   prepareArmorClass(items) {
      const dexMod = (this.abilities?.dex.mod ?? 0);
      const baseAC = CONFIG.FADE.Armor.acNaked - dexMod;
      let ac = {};
      ac.nakedAAC = 19 - baseAC;
      ac.naked = baseAC;
      ac.value = baseAC;
      ac.total = baseAC;
      ac.mod = 0;
      ac.shield = 0;

      const naturalArmor = items.find(item =>
         item.type === 'armor' && item.system.natural
      );

      const equippedArmor = items.find(item =>
         item.type === 'armor' && item.system.equipped && !item.system.isShield
      );

      const equippedShield = items.find(item =>
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
      ac.total = ac.total - (this.mod.ac ?? 0) - dexMod;
      ac.totalAAC = 19 - ac.total;
      // Weapon mastery defense bonuses
      const masteryEnabled = game.settings.get(game.system.id, "weaponMastery");
      const masteries = items.filter(item => item.type === "mastery");
      const equippedWeapons = items.filter((item) => item.type === "weapon" && item.system.equipped);
      // If the weapon mastery option is enabled then an array of mastery-related ac bonuses are added to the actor's system data.
      if (masteryEnabled && masteries?.length > 0 && equippedWeapons?.length > 0) {
         ac.mastery = [];
         for (let weapon of equippedWeapons) {
            const weaponMastery = masteries.find((mastery) => { return mastery.name === weapon.system.mastery; });
            if (weaponMastery) {
               ac.mastery.push({
                  acBonusType: weaponMastery.system.acBonusType,
                  acBonus: weaponMastery.system.acBonus || 0,
                  total: ac.total + (weaponMastery.system.acBonus || 0),
                  totalAAC: 19 - ac.total + (weaponMastery.system.acBonus || 0),
                  acBonusAT: weaponMastery.system.acBonusAT
               });
            }
         }
      }

      this.ac = ac;
   }

   /**
   * Prepares the actor's encumbrance values. Supports optional settings for different encumbrance systems.
   */
   prepareEncumbrance(items, actorType) {
      const encSetting = game.settings.get(game.system.id, "encumbrance");
      let encumbrance = this.encumbrance || {};
      let enc = 0;

      // Prepare containers
      for (let item of items) {
         if (item.system.container === true) {
            item.system.contained = [];
            item.system.containedEnc = 0;
         }
      }
      for (let item of items) {
         // If a contained item...
         if (item.system.containerId?.length > 0) {
            let containerItem = items.find(i => i._id === item.system.containerId);
            if (containerItem) {
               containerItem.system.contained.push(item);
            }
         }
      }
      //-- Caclulate how much is being carried/tracked --//
      // If using detailed encumbrance, similar to expert rules...
      if (encSetting === 'expert') {
         // Containers         
         for (let container of items.filter(item => item.system.container === true)) {
            container.system.containedEnc = container.system.contained.reduce((sum, item) => {
               const itemWeight = item.system.weight || 0;
               const itemQuantity = item.system.quantity || 1;
               return sum + (itemWeight * itemQuantity);
            }, 0);
         }
         enc = items.reduce((sum, item) => {
            const itemWeight = item.system.weight || 0;
            const itemQuantity = item.system.quantity || 1;
            return sum + (itemWeight * itemQuantity);
         }, 0);
         encumbrance.value = enc || 0;
      }
      // Else if using simple encumbrance, similar to basic rules...
      else if (encSetting === 'basic') {
         enc = items.filter((item) => {
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
         encumbrance.mv = this.movement.max;
         encumbrance.fly = this.flight.max;
      } else {
         this._calculateEncMovement(actorType, enc, encumbrance);
      }

      this.encumbrance = encumbrance;
   }

   /**
    * Prepare the actor's movement rate values.
   */
   prepareDerivedMovement() {
      this.movement.turn = this.encumbrance.mv;
      this.flight.turn = this.encumbrance.fly || 0;
      this.movement.round = this.movement.turn > 0 ? Math.floor(this.movement.turn / 3) : 0;
      this.movement.day = this.movement.turn > 0 ? Math.floor(this.movement.turn / 5) : 0;
      this.movement.run = this.movement.turn;
      this.flight.round = this.flight.turn > 0 ? Math.floor(this.flight.turn / 3) : 0;
      this.flight.day = this.flight.turn > 0 ? Math.floor(this.flight.turn / 5) : 0;
      this.flight.run = this.flight.turn;
   }

   /**
    * @protected
    */
   _prepareMods() {
      this.mod.ac = 0;
      this.mod.initiative = 0;
      this.mod.combat.toHit = 0;
      this.mod.combat.dmg = 0;
      this.mod.combat.toHitRanged = 0;
      this.mod.combat.dmgRanged = 0;
      this.mod.combat.selfDmg = 0;
      this.mod.combat.selfDmgBreath = 0;
      this.mod.combat.selfDmgBreathScale = 0;
      this.mod.combat.selfDmgMagic = 0;
      this.mod.combat.selfDmgFrost = 0;
      this.mod.combat.selfDmgFire = 0;
      this.mod.combat.selfToHit = 0;
      this.mod.combat.selfToHitRanged = 0;
      this.mod.save.all = 0;
      this.mod.save.death = 0;
      this.mod.save.wand = 0;
      this.mod.save.paralysis = 0;
      this.mod.save.breath = 0;
      this.mod.save.spell = 0;
   }

   /**
    * Calculate movement rate based on encumbrance.
    * @protected
    * @param {number} enc The total encumbrance in coins.
    * @param {any} encumbrance The encumbrance object to set.
    */
   _calculateEncMovement(actorType, enc, encumbrance) {
      let weightPortion = this.encumbrance.max / enc;
      const table = (actorType === "monster") ? CONFIG.FADE.Encumbrance.monster : CONFIG.FADE.Encumbrance.pc;
      let encTier = table.find(tier => weightPortion >= tier.wtPortion) || table[table.length - 1];
      encumbrance.label = encTier.label;
      encumbrance.desc = encTier.desc;
      // This is a maximum movement for the current encumbered tier
      encumbrance.mv = this.movement.max * encTier.mvFactor;
      encumbrance.fly = this.flight.max * encTier.mvFactor;
   }

   /**
    * Prepares the spell slots used and max values.
    * @protected
    */
   _prepareSpells() {
      if (this.config.maxSpellLevel > 0) {
         this.spellSlots = Array.from({ length: this.config.maxSpellLevel }, (_, index) => ({
            spellLevel: index + 1
         }));
      }
   }

   /**
    * Prepares derived saving throw values based on class name and class level.
    * @protected
    * @param {any} className The class name (Fighter, Cleric, etc.)
    * @param {number} classLevel The level of the class.
    */
   _prepareSavingThrows(className, classLevel) {
      // Replace hyphen with underscore for "Magic-User"
      const classNameInput = className.toLowerCase().replace('_', '-');
      const classes = CONFIG.FADE.Classes;
      // Find a match in the FADE.Classes data
      const classData = Object.values(classes).find(cdata => cdata.name.toLowerCase() === classNameInput);
      // If matching class data was found...
      if (classData !== undefined) {
         // Apply the class data
         const savesData = classData.saves.find(save => classLevel <= save.level);
         for (let saveType in savesData) {
            if (this.savingThrows.hasOwnProperty(saveType)) {
               this.savingThrows[saveType].value = savesData[saveType];
            }
         }
      }

      // Apply mods, mostly from effects
      const mods = this.mod.save;
      this.savingThrows.death.value -= mods.death + mods.all;
      this.savingThrows.wand.value -= mods.wand + mods.all;
      this.savingThrows.paralysis.value -= mods.paralysis + mods.all;
      this.savingThrows.breath.value -= mods.breath + mods.all;
      this.savingThrows.spell.value -= mods.spell + mods.all;
   }
}

export class NpcDataModel extends fadeActorDataModel {
   static defineSchema() {
      return {
         ...super.defineSchema(),
         cr: new fields.NumberField({ initial: 0 }),
      };
   }
}
