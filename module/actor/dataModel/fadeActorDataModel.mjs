export class fadeActorDataModel extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      const { fields } = foundry.data;
      return {
         config: new fields.SchemaField({
            maxSpellLevel: new fields.NumberField({ required: true, initial: 0 }),            
         }),
         biography: new fields.StringField({ initial: "" }),         
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
            // mod is an accumulator for armor AC mods only. All other items that modify armor must do so via actor's system.mod.ac.
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
            label: new fields.StringField(),
            desc: new fields.StringField(),
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
            declaredAction: new fields.StringField({ initial: "attack" }),
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
            // mod is for items that modify AC (add/subtract only) but are not armor items.
            ac: new fields.NumberField({ initial: 0 }),
            baseAc: new fields.NumberField({ initial: 0 }),
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
         }),
         wrestling: new foundry.data.fields.NumberField({ initial: 0 }),
         acDigest: new fields.ArrayField(new fields.StringField(), { required: false, initial: [] }),
         activeLight: new fields.StringField({ nullable: true, required: false, initial: null }),
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
    */
   prepareArmorClass(items) {
      const acDigest = [];
      const dexMod = (this.abilities?.dex.mod ?? 0);
      const baseAC = CONFIG.FADE.Armor.acNaked - dexMod - this.mod.baseAc;
      let ac = {};
      ac.nakedAAC = 19 - baseAC;
      ac.naked = baseAC;
      // AC value is used for wrestling rating and should not include Dexterity bonus.
      ac.value = CONFIG.FADE.Armor.acNaked;
      ac.total = baseAC;
      ac.mod = 0;
      ac.shield = 0;

      const naturalArmor = items.find(item => item.type === 'armor' && item.system.natural);
      this.equippedArmor = items.find(item => item.type === 'armor' && item.system.equipped && !item.system.isShield);
      const equippedShield = items.find(item => item.type === 'armor' && item.system.equipped && item.system.isShield);

      if (dexMod !== 0) {
         acDigest.push(`Dexterity bonus: ${dexMod}`);
      }

      // If natural armor
      if (naturalArmor?.system.totalAC !== null && naturalArmor?.system.totalAC !== undefined) {
         naturalArmor.prepareEffects();
         ac.naked = naturalArmor.system.totalAC - dexMod;
         ac.value = ac.naked;
         ac.total = ac.naked;
         naturalArmor.system.equipped = true;
         acDigest.push(`Natural armor ${naturalArmor.name}: ${naturalArmor.system.totalAC}`);
      }

      // If an equipped armor is found...
      if (this.equippedArmor) {
         this.equippedArmor.prepareEffects();
         ac.value = this.equippedArmor.system.ac;
         ac.mod += this.equippedArmor.system.mod ?? 0;
         ac.total = this.equippedArmor.system.totalAC;
         // Reapply dexterity mod, since overwriting ac.total here.
         ac.total -= dexMod;
         acDigest.push(`Equipped armor ${this.equippedArmor.name}: ${this.equippedArmor.system.totalAC}`);
      }

      // If a shield is equipped...
      if (equippedShield) {
         equippedShield.prepareEffects();
         ac.value -= equippedShield.system.ac;
         ac.shield = equippedShield.system.totalAC;
         ac.total -= equippedShield.system.totalAC;
         acDigest.push(`Equipped shield ${equippedShield.name}: ${equippedShield.system.totalAC}`);
      }

      if (this.mod.baseAc != 0) {
         ac.total -= this.mod.baseAc;
         acDigest.push(`Base AC mod: ${this.mod.baseAc}`);
      }

      // Now other mods. Dexterity bonus already applied above.
      ac.totalAAC = 19 - ac.total;
      ac.nakedAAC = 19 - ac.naked;

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
      this.acDigest = acDigest;
   }

   /**
   * Prepares the actor's encumbrance values. Supports optional settings for different encumbrance systems.
   */
   prepareEncumbrance(items, actorType) {
      const encSetting = game.settings.get(game.system.id, "encumbrance");
      let encumbrance = this.encumbrance || {};
      let enc = 0;

      //-- Caclulate how much is being carried/tracked --//
      // If using detailed encumbrance, similar to expert rules...
      if (encSetting === 'expert' || encSetting === 'classic') {
         enc = items.reduce((sum, item) => {
            const itemWeight = item.system.weight || 0;
            const itemQuantity = item.system.quantity || 1;
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
         encumbrance.mv = this.movement.max;
         encumbrance.fly = this.flight.max;
      } else {
         this._calculateEncMovement(actorType, enc, encumbrance, encSetting);
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
      this.mod.baseAc = 0;
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
    * @param {any} actorType The actor.type
    * @param {number} enc The total encumbrance in coins.
    * @param {any} encumbrance The encumbrance object to set.
    * @param {encSetting} The current encumbrance setting.
    */
   _calculateEncMovement(actorType, enc, encumbrance, encSetting) {
      let weightPortion = this.encumbrance.max / enc;
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
            if (this.equippedArmor?.system.armorWeight === 'light') {
               encTier = table[1];
            } else if (this.equippedArmor?.system.armorWeight === 'heavy') {
               encTier = table[2];
            }
         } else {
            encTier = table.find(tier => weightPortion >= tier.wtPortion) || table[table.length - 1];
         }

         if (encTier) {
            encumbrance.label = game.i18n.localize(`FADE.Actor.encumbrance.${encTier.name}.label`);
            encumbrance.desc = game.i18n.localize(`FADE.Actor.encumbrance.${encTier.name}.desc`);
            encumbrance.mv = Math.floor(this.movement.max * encTier.mvFactor);
            encumbrance.fly = Math.floor(this.flight.max * encTier.mvFactor);
         }
      }
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
    * @param {any} savesData The class saving throw data
    */
   _prepareSavingThrows(savesData) {
      // Apply the class data
      for (let saveType in savesData) {
         if (this.savingThrows.hasOwnProperty(saveType)) {
            this.savingThrows[saveType].value = savesData[saveType];
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