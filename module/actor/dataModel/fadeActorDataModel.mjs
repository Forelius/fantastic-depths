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
            // This is the raw AC based on armor and no modifiers applied. Used for wrestling.
            value: new fields.NumberField({ initial: 9 }),
            // For melee attacks
            total: new fields.NumberField({ initial: 9 }),
            // For ranged attacks
            totalRanged: new fields.NumberField({ initial: 9 }),
            // Same for ascending armor class
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
         }),
         languages: new fields.StringField({ initial: "" }),
         combat: new fields.SchemaField({
            // This is how many attacks the character has made for the current round
            attacks: new fields.NumberField({ initial: 0 }),
            // This is how many times the character has been attack for the current round
            attAgainstH: new fields.NumberField({ initial: 0 }),
            attAgainstM: new fields.NumberField({ initial: 0 }),
            deathCount: new fields.NumberField({ initial: 0 }),
            isDead: new fields.BooleanField({ initial: false }),
            declaredAction: new fields.StringField({ initial: "attack" }),
         }),
         gm: new fields.SchemaField({
            notes: new fields.StringField({ initial: "", gmOnly: true }),
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
            // Modifies the natural/naked AC.
            baseAc: new fields.NumberField({ initial: 0 }),
            // Upgrades the AC if better, otherwise does nothing.
            upgradeAc: new fields.NumberField({ nullable: true, initial: null }),
            // Upgrades the ranged AC if better, otherwise does nothing.
            upgradeRangedAc: new fields.NumberField({ nullable: true, initial: null }),
            // Wrestling Rating modifier
            wrestling: new fields.NumberField({ nullable: true, initial: null }),
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
               all: new fields.NumberField({ initial: 0 }),
            }),
            masteryLevelOverride: new fields.StringField({ nullable: true, initial: null }),
         }),
         wrestling: new foundry.data.fields.NumberField({ initial: 0 }),
         acDigest: new fields.ArrayField(new fields.StringField(), { required: false, initial: [] }),
         activeLight: new fields.StringField({ nullable: true, required: false, initial: null }),
         abilities: new fields.SchemaField({
            str: new fields.SchemaField({
               // The base ability score value.
               value: new fields.NumberField({ initial: 10 }),
               // The ability score total, after active effects and tempMod applied.
               total: new fields.NumberField({ initial: 10 }),
               // The ability score derived modifier. Sometimes called adjustment.
               mod: new fields.NumberField({ initial: 0 }),
               // A temporary modifier applied to total.
               tempMod: new fields.NumberField({ initial: 0 }),
            }),
            int: new fields.SchemaField({
               value: new fields.NumberField({ initial: 10 }),
               total: new fields.NumberField({ initial: 10 }),
               mod: new fields.NumberField({ initial: 0 }),
               tempMod: new fields.NumberField({ initial: 0 }),
            }),
            wis: new fields.SchemaField({
               value: new fields.NumberField({ initial: 10 }),
               total: new fields.NumberField({ initial: 10 }),
               mod: new fields.NumberField({ initial: 0 }),
               tempMod: new fields.NumberField({ initial: 0 }),
            }),
            dex: new fields.SchemaField({
               value: new fields.NumberField({ initial: 10 }),
               total: new fields.NumberField({ initial: 10 }),
               mod: new fields.NumberField({ initial: 0 }),
               tempMod: new fields.NumberField({ initial: 0 }),
            }),
            con: new fields.SchemaField({
               value: new fields.NumberField({ initial: 10 }),
               total: new fields.NumberField({ initial: 10 }),
               mod: new fields.NumberField({ initial: 0 }),
               tempMod: new fields.NumberField({ initial: 0 }),
            }),
            cha: new fields.SchemaField({
               value: new fields.NumberField({ initial: 10 }),
               total: new fields.NumberField({ initial: 10 }),
               mod: new fields.NumberField({ initial: 0 }),
               loyaltyMod: new fields.NumberField({ initial: 0 }),
               tempMod: new fields.NumberField({ initial: 0 }),
            }),
         }),
      };
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
      this._prepareMods();
      this._prepareSpells();
      for (let [key, ability] of Object.entries(this.abilities)) {
         ability.total = ability.value + ability.tempMod;
      }
      this._prepareDerivedAbilities();
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
   }

   _prepareDerivedAbilities() {
      // For monsters
      const abilityScoreSetting = game.settings.get(game.system.id, "monsterAbilityScores");
      const hasAbilityScoreMods = abilityScoreSetting === "withmod";

      if (this.parent.type === 'character' || hasAbilityScoreMods === true) {
         // Initialize ability score modifiers
         const abilityScoreModSystem = game.settings.get(game.system.id, "abilityScoreModSystem");
         const adjustments = CONFIG.FADE.abilityScoreModSystem[abilityScoreModSystem]?.mods;
         for (let [key, ability] of Object.entries(this.abilities)) {
            let adjustment = adjustments.find(item => ability.total <= item.max);
            ability.mod = adjustment ? adjustment.value : adjustments[0].value;
         }
      }
   }

   /**
    * @protected
    */
   async _prepareMods() {
      this.mod.ac = 0;
      this.mod.baseAc = 0;
      this.mod.upgradeAc = null;
      this.mod.upgradeRangedAc = null;
      this.mod.acVsLarge = 0;
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
      // Saving throw mods
      this.mod.save = {};
      this.mod.save.all = 0;
   }

   /**
    * Prepares the spell slots used and max values.
    * @protected
    */
   _prepareSpells() {
      if (this.config.maxSpellLevel > 0) {
         this.spellSlots = Array.from({ length: this.config.maxSpellLevel }, (_, index) => ({
            spellLevel: index + 1,
            used: 0,
            max: this.spellSlots?.[index]?.max ?? 0
         }));
      } else {
         this.spellSlots = [];
      }
   }

   getParsedHD() {
      // Regular expression to check for a dice specifier like d<number>
      const diceRegex = /d(\d+)/;
      // Regular expression to capture the base number and any modifiers (+, -, *, /) that follow
      const modifierRegex = /([+\-*/]\d+)$/;

      const match = this.hp.hd.match(diceRegex);
      let dieSides = 8;
      if (match) {
         dieSides = parseInt(match[1], 10);
      } else {
         dieSides = 8;
      }

      // If no dice specifier is found, check if there's a modifier like +1, *2, etc.
      let base = this.hp.hd.replace(modifierRegex, ''); // Extract base number
      let modifier = this.hp.hd.match(modifierRegex)?.[0] || 0; // Extract modifier (if any)
      base = parseFloat(base);
      modifier = parseInt(modifier, 10);
      const sign = modifier <= 0 ? "" : "+";
      return { base, modifier, dieSides, sign };
   }
}