export class fadeActorDataModel extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      console.debug("fadeActorDataModel.defineSchema", this);
      return {
         config: new foundry.data.fields.SchemaField({
            isSpellcaster: new foundry.data.fields.BooleanField({ initial: false }),
            isRetainer: new foundry.data.fields.BooleanField({ initial: false }),
         }),
         biography: new foundry.data.fields.StringField({ initial: "" }),
         retainer: new foundry.data.fields.SchemaField({
            loyalty: new foundry.data.fields.NumberField({ initial: 0 }),
            wage: new foundry.data.fields.StringField({ initial: "" }),
         }),
         hp: new foundry.data.fields.SchemaField({
            hd: new foundry.data.fields.StringField({ initial: "1d8" }),
            value: new foundry.data.fields.NumberField({ initial: 5 }),
            max: new foundry.data.fields.NumberField({ initial: 5 }),
         }),
         ac: new foundry.data.fields.SchemaField({
            naked: new foundry.data.fields.NumberField({ initial: 9 }),
            value: new foundry.data.fields.NumberField({ initial: 9 }),
            total: new foundry.data.fields.NumberField({ initial: 9 }),
            shield: new foundry.data.fields.NumberField({ initial: 0 }),
            mod: new foundry.data.fields.NumberField({ initial: 0 }),
         }),
         thac0: new foundry.data.fields.SchemaField({
            value: new foundry.data.fields.NumberField({ initial: 19 }),
            mod: new foundry.data.fields.SchemaField({
               missile: new foundry.data.fields.NumberField({ initial: 0 }),
               melee: new foundry.data.fields.NumberField({ initial: 0 }),
            }),
         }),
         savingThrows: new foundry.data.fields.SchemaField({
            death: new foundry.data.fields.SchemaField({
               value: new foundry.data.fields.NumberField({ initial: 0 }),
            }),
            wand: new foundry.data.fields.SchemaField({
               value: new foundry.data.fields.NumberField({ initial: 0 }),
            }),
            paralysis: new foundry.data.fields.SchemaField({
               value: new foundry.data.fields.NumberField({ initial: 0 }),
            }),
            breath: new foundry.data.fields.SchemaField({
               value: new foundry.data.fields.NumberField({ initial: 0 }),
            }),
            spell: new foundry.data.fields.SchemaField({
               value: new foundry.data.fields.NumberField({ initial: 0 }),
            }),
         }),
         movement: new foundry.data.fields.SchemaField({
            turn: new foundry.data.fields.NumberField({ initial: 120 }),
            max: new foundry.data.fields.NumberField({ initial: 120 }),
            round: new foundry.data.fields.NumberField({ initial: 0 }),
            day: new foundry.data.fields.NumberField({ initial: 0 }),
            run: new foundry.data.fields.NumberField({ initial: 0 }),
         }),
         flight: new foundry.data.fields.SchemaField({
            turn: new foundry.data.fields.NumberField({ initial: 0 }),
            max: new foundry.data.fields.NumberField({ initial: 0 }),
            round: new foundry.data.fields.NumberField({ initial: 0 }),
            day: new foundry.data.fields.NumberField({ initial: 0 }),
            run: new foundry.data.fields.NumberField({ initial: 0 }),
         }),
         encumbrance: new foundry.data.fields.SchemaField({
            value: new foundry.data.fields.NumberField({ initial: 0 }),
            max: new foundry.data.fields.NumberField({ initial: 2400 }),
            mv: new foundry.data.fields.NumberField({ initial: 0 }),
            fly: new foundry.data.fields.NumberField({ initial: 0 }),
         }),
         initiative: new foundry.data.fields.SchemaField({
            value: new foundry.data.fields.NumberField({ initial: 0 }),
            mod: new foundry.data.fields.NumberField({ initial: 0 }),
         }),
         languages: new foundry.data.fields.StringField({ initial: "" }),
         combat: new foundry.data.fields.SchemaField({
            attacks: new foundry.data.fields.NumberField({ initial: 0 }),
            attacksAgainst: new foundry.data.fields.NumberField({ initial: 0 }),
            deathCount: new foundry.data.fields.NumberField({ initial: 0 }),
            isDead: new foundry.data.fields.BooleanField({ initial: false }),
         }),
         gm: new foundry.data.fields.SchemaField({
            notes: new foundry.data.fields.StringField({ initial: "" }),
         }),
         spellSlots: new foundry.data.fields.ArrayField(new foundry.data.fields.SchemaField({
            spellLevel: new foundry.data.fields.NumberField({ initial: 0 }),
            used: new foundry.data.fields.NumberField({ initial: 0 }),
            max: new foundry.data.fields.NumberField({ initial: 0 })
         })),
         mod: new foundry.data.fields.SchemaField({
            ac: new foundry.data.fields.NumberField({ initial: 0 }),
            initiative: new foundry.data.fields.NumberField({ initial: 0 }),
            combat: new foundry.data.fields.SchemaField({
               toHit: new foundry.data.fields.NumberField({ initial: 0 }),
               dmg: new foundry.data.fields.NumberField({ initial: 0 }),
               toHitRanged: new foundry.data.fields.NumberField({ initial: 0 }),
               dmgRanged: new foundry.data.fields.NumberField({ initial: 0 }),
               selfDmg: new foundry.data.fields.NumberField({ initial: 0 }),
               selfDmgBreath: new foundry.data.fields.NumberField({ initial: 0 }),
               selfDmgBreathScale: new foundry.data.fields.NumberField({ initial: 0 }),
               selfDmgMagic: new foundry.data.fields.NumberField({ initial: 0 }),
               selfDmgFrost: new foundry.data.fields.NumberField({ initial: 0 }),
               selfDmgFire: new foundry.data.fields.NumberField({ initial: 0 }),
               selfToHit: new foundry.data.fields.NumberField({ initial: 0 }),
               selfToHitRanged: new foundry.data.fields.NumberField({ initial: 0 }),
            }),
            save: new foundry.data.fields.SchemaField({
               all: new foundry.data.fields.NumberField({ initial: 0 }),
               death: new foundry.data.fields.NumberField({ initial: 0 }),
               wand: new foundry.data.fields.NumberField({ initial: 0 }),
               paralysis: new foundry.data.fields.NumberField({ initial: 0 }),
               breath: new foundry.data.fields.NumberField({ initial: 0 }),
               spell: new foundry.data.fields.NumberField({ initial: 0 }),
            })
         })
      };
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
      if (this.config.isSpellcaster === true) {
         this._prepareSpells();
      }
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
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
      if (this.spellSlots.length == 0) {
         this.spellSlots = Array.from(9);
      }
      for (let i = 0; i < 9; i++) {
         this.spellSlots[i] = this.spellSlots?.[i] || {};
         this.spellSlots[i].spellLevel = i;
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
         cr: new foundry.data.fields.NumberField({ initial: 0 }),
      };
   }
}
