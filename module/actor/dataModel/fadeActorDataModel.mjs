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
            nakedRanged: new fields.NumberField({ initial: 9 }),
            nakedAAC: new fields.NumberField({ initial: 10 }),
            nakedRangedAAC: new fields.NumberField({ initial: 10 }),
            value: new fields.NumberField({ initial: 9 }),
            // This is the raw AC based on armor and no modifiers applied. Used for wrestling.
            total: new fields.NumberField({ initial: 9 }),
            totalRanged: new fields.NumberField({ initial: 9 }),
            totalAAC: new fields.NumberField({ initial: 10 }),
            totalRangedAAC: new fields.NumberField({ initial: 10 }),
            shield: new fields.NumberField({ initial: 0 }),
            // mod is an accumulator for armor AC mods only. All other items that modify armor must do so via actor's system.mod.ac.
            mod: new fields.NumberField({ initial: 0 })
         }),
         thac0: new fields.SchemaField({
            value: new fields.NumberField({ initial: 19 }),
            mod: new fields.SchemaField({
               missile: new fields.NumberField({ initial: 0 }),
               melee: new fields.NumberField({ initial: 0 }),
            }),
         }),
         thbonus: new fields.NumberField({ initial: 0 }),
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
            // This is how many attacks the character has made for the current round
            attacks: new fields.NumberField({ initial: 0 }),
            // This is how many times the character has been attack for the current round
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
            initial: []
         }),
         mod: new fields.SchemaField({
            // mod is for items that modify AC (add/subtract only) but are not armor items.
            ac: new fields.NumberField({ initial: 0 }),
            baseAc: new fields.NumberField({ initial: 0 }),
            upgradeAc: new fields.NumberField({ nullable: true, initial: null }),
            upgradeRangedAc: new fields.NumberField({ nullable: true, initial: null }),
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
            save: new fields.ObjectField({
               initial: { all: 0 },
               all: new fields.NumberField({ initial: 0 }),
               //death: new fields.NumberField({ initial: 0 }),
               //wand: new fields.NumberField({ initial: 0 }),
               //paralysis: new fields.NumberField({ initial: 0 }),
               //breath: new fields.NumberField({ initial: 0 }),
               //spell: new fields.NumberField({ initial: 0 }),
            })
         }),
         wrestling: new foundry.data.fields.NumberField({ initial: 0 }),
         acDigest: new fields.ArrayField(new fields.StringField(), { required: false, initial: [] }),
         activeLight: new fields.StringField({ nullable: true, required: false, initial: null }),
      };
   }

   /** @override */
   prepareBaseData() {
      this._prepareMods();
      super.prepareBaseData();
      this._prepareSpells();
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

      //-- Caclulate how much is being carried/tracked --//
      // If using detailed encumbrance, similar to expert rules...
      if (encSetting === 'expert' || encSetting === 'classic') {
         enc = items.reduce((sum, item) => {
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
      this.mod.ac = 0;
      this.mod.baseAc = 0;
      this.mod.upgradeAc = null;
      this.mod.upgradeRangedAc = null;
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
      // Create the saving throw member variables dynamically from the world's save items.
      const saves = game.items?.filter(item => item.type === 'specialAbility' && item.system.category === 'save')
         .map(item => item.system.customSaveCode);
      for (let save of saves) {
         this.mod.save[save] = 0;
      }
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
      } else {
         this.spellSlots = [];
      }
   }
}