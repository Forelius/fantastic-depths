import { FDActorBaseDM } from "../dataModel/FDActorBaseDM.mjs";
import { MonsterTHAC0Calculator } from '../../utils/MonsterTHAC0Calculator.mjs';
const { ArrayField, BooleanField, EmbeddedDataField, NumberField, SchemaField, SetField, StringField, ObjectField } = foundry.data.fields;

export class FDVehicleDM extends FDActorBaseDM {
   static defineSchema() {
      const baseSchema = super.defineSchema();
      const combatSchema = {
         cost: new NumberField({ required: false, initial: 0 }),
         capacity: new StringField({ required: false, initial: "" }),
         vehicleType: new StringField({ required: false, initial: "mount" }),
         details: new SchemaField({
            // This is how many attacks the actor gets per round.
            attacks: new StringField({ initial: "1" }),
            int: new NumberField({ initial: 2 }),
            morale: new NumberField({ initial: 8 }),
         }),
         config: new SchemaField({
            // Ignored by multi-class character
            firstSpellLevel: new NumberField({ required: false, initial: 1 }),
            maxSpellLevel: new NumberField({ required: true, initial: 0 })
         }),
         thac0: new SchemaField({
            value: new NumberField({ required: false, initial: CONFIG.FADE.ToHit.baseTHAC0 }),
            mod: new SchemaField({
               missile: new NumberField({ initial: 0 }),
               melee: new NumberField({ initial: 0 }),
            }),
         }),
         thbonus: new NumberField({ initial: 0 }),
         initiative: new SchemaField({
            value: new NumberField({ initial: 0 }),
         }),
         languages: new StringField({ initial: "" }),
         combat: new SchemaField({
            // If true the character or class has basic proficiency with all weapons.
            basicProficiency: new BooleanField({ required: true, initial: true }),
            // This is how many attacks the character has made for the current round
            attacks: new NumberField({ initial: 0 }),
            // This is how many times the character has been attack for the current round
            attAgainstH: new NumberField({ initial: 0 }),
            attAgainstM: new NumberField({ initial: 0 }),
            deathCount: new NumberField({ initial: 0 }),
            isDead: new BooleanField({ initial: false }),
            declaredAction: new StringField({ initial: "moveOnly" }),
         }),
         mod: new SchemaField({
            // For items that modify AC (add/subtract only) but are not armor items.
            ac: new NumberField({ initial: 0 }),
            // For items that modify ranged AC (add/subtract only) but are not armor items.
            // Cumulative with mod.ac, otherwise not backwards compatible.
            rangedAc: new NumberField({ initial: 0 }),
            // Modifies the natural/naked AC.
            baseAc: new NumberField({ initial: 0 }),
            // Upgrades the AC if better, otherwise does nothing.
            upgradeAc: new NumberField({ nullable: true, initial: null }),
            // Upgrades the ranged AC if better, otherwise does nothing.
            upgradeRangedAc: new NumberField({ nullable: true, initial: null }),
            initiative: new NumberField({ initial: 0 }),
            combat: new SchemaField({
               toHit: new NumberField({ initial: 0 }),
               dmg: new StringField({ nullable: true, initial: null }),
               // Scale melee total damage by multiplying
               dmgScale: new NumberField({ initial: 1 }),
               toHitRanged: new NumberField({ initial: 0 }),
               dmgRanged: new StringField({ nullable: true, initial: null }),
               selfDmg: new NumberField({ initial: 0 }),
               selfDmgRanged: new NumberField({ initial: 0 }),
               selfDmgBreath: new NumberField({ initial: 0 }),
               selfDmgBreathScale: new NumberField({ initial: 0 }),
               selfDmgMagic: new NumberField({ initial: 0 }),
               selfDmgFrost: new NumberField({ initial: 0 }),
               selfDmgFire: new NumberField({ initial: 0 }),
               selfToHit: new NumberField({ initial: 0 }),
               selfToHitRanged: new NumberField({ initial: 0 }),
            }),
            save: new ObjectField({
               all: new NumberField({ initial: 0 }),
            }),
         }),
      };
      foundry.utils.mergeObject(baseSchema, combatSchema);
      return baseSchema;
   }

   prepareBaseData() {
      super.prepareBaseData();
      this.encumbrance.max = this.encumbrance.max || 0;
      this._prepareMods();
      // Default all monsters with basic proficiency.
      this.combat.basicProficiency = true;
      this._prepareTHAC0ToHitBonus();
      // Maybe this is the wrong place to do this. We may need to wait until after init.
      this.thbonus = CONFIG.FADE.ToHit.baseTHAC0 - this.thac0.value;
      this._prepareHitPoints();
   }

   /**
    * @protected
    */
   async _prepareMods() {
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

   /**
    * Calculate average hitpoints based on hitdice.
    */
   _prepareHitPoints() {
      const classSystem = game.fade.registry.getSystem("classSystem");
      if (this.hp.max == null) {
         // Not valid for formulas with * modifier sign
         const { numberOfDice, numberOfSides, modifier } = classSystem.getParsedHD(this.hp.hd);
         this.hp.value = Math.ceil(((numberOfSides + 1) / 2) * numberOfDice) + modifier;
         this.hp.max = this.hp.value;
      }
   }

   _prepareTHAC0ToHitBonus() {
      if (this.thac0?.value == null) {
         // Not valid for formulas with * modifier sign
         const thac0Calc = new MonsterTHAC0Calculator();
         this.thac0.value = thac0Calc.getTHAC0(this.hp.hd);
      }
   }
}