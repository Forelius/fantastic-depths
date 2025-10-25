import { FDActorBaseDM } from "/systems/fantastic-depths/module/actor/dataModel/FDActorBaseDM.mjs";

export class FDCombatActorDM extends FDActorBaseDM {
   static defineSchema() {
      const { fields } = foundry.data;
      const baseSchema = super.defineSchema();
      let schema = {
         details: new fields.SchemaField({
            // This is how many attacks the actor gets per round.
            attacks: new fields.StringField({ initial: "1" }),
         }),
         config: new fields.SchemaField({
            // Ignored by multi-class character
            firstSpellLevel: new fields.NumberField({ required: false, initial: 1 }),
            maxSpellLevel: new fields.NumberField({ required: true, initial: 0 }),
         }),
         thac0: new fields.SchemaField({
            value: new fields.NumberField({ initial: CONFIG.FADE.ToHit.baseTHAC0 }),
            mod: new fields.SchemaField({
               missile: new fields.NumberField({ initial: 0 }),
               melee: new fields.NumberField({ initial: 0 }),
            }),
         }),
         thbonus: new fields.NumberField({ initial: 0 }),
         initiative: new fields.SchemaField({
            value: new fields.NumberField({ initial: 0 }),
         }),
         languages: new fields.StringField({ initial: "" }),
         combat: new fields.SchemaField({
            // If true the character or class has basic proficiency with all weapons.
            basicProficiency: new fields.BooleanField({ required: true, initial: false }),
            unskilledToHitMod: new fields.NumberField({ required: true, initial: -2 }),
            // This is how many attacks the character has made for the current round
            attacks: new fields.NumberField({ initial: 0 }),
            // This is how many times the character has been attack for the current round
            attAgainstH: new fields.NumberField({ initial: 0 }),
            attAgainstM: new fields.NumberField({ initial: 0 }),
            deathCount: new fields.NumberField({ initial: 0 }),
            isDead: new fields.BooleanField({ initial: false }),
            declaredAction: new fields.StringField({ initial: "attack" }),
         }),
         mod: new fields.SchemaField({
            // For items that modify AC (add/subtract only) but are not armor items.
            ac: new fields.NumberField({ initial: 0 }),
            // For items that modify ranged AC (add/subtract only) but are not armor items.
            // Cumulative with mod.ac, otherwise not backwards compatible.
            rangedAc: new fields.NumberField({ initial: 0 }),
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
               dmg: new fields.StringField({ nullable: true, initial: null }),
               // Scale melee total damage by multiplying
               dmgScale: new fields.NumberField({ initial: 1 }),
               toHitRanged: new fields.NumberField({ initial: 0 }),
               dmgRanged: new fields.StringField({ nullable: true, initial: null }),
               selfDmg: new fields.NumberField({ initial: 0 }),
               selfDmgRanged: new fields.NumberField({ initial: 0 }),
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
         // If enchanted, can only hit with magic weapons or spells.
         isEnchanted: new fields.BooleanField({ initial: false }),
      };
      foundry.utils.mergeObject(schema, baseSchema);
      return schema;
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
      this._prepareMods();
      for (let [key, ability] of Object.entries(this.abilities)) {
         ability.total = ability.value + ability.tempMod;
      }
   }

   /** @override */
   prepareDerivedData() {
      this._prepareDerivedAbilities();
      super.prepareDerivedData();
   }

   /**
    * Migrate source data from some prior format into a new specification.
    * The source parameter is either original data retrieved from disk or provided by an update operation.
    * @inheritDoc
    */
   static migrateData(source) {
      return super.migrateData(source);
   }

   _prepareDerivedAbilities() {
      // For monsters
      const abilityScoreSetting = game.settings.get(game.system.id, "monsterAbilityScores");
      const hasAbilityScoreMods = abilityScoreSetting === "withmod";

      // If this is a character or if monsters have ability score mods...
      if (this.parent.type === 'character' || hasAbilityScoreMods === true) {
         // Initialize ability score modifiers
         const abilityScoreMods = game.settings.get(game.system.id, "abilityScoreMods");
         const adjustments = game.fade.registry.getSystem("userTables")?.getJsonArray(`ability-mods-${abilityScoreMods}`);         
         for (let [key, ability] of Object.entries(this.abilities)) {
            let adjustment = adjustments.sort((a, b) => b.min - a.min).find(item => ability.total >= item.min);
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
      this.mod.combat.selfDmgRanged = 0;
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
}