const { ArrayField, BooleanField, EmbeddedDataField, NumberField, SchemaField, SetField, StringField, ObjectField } = foundry.data.fields;

/**
 * Field for storing FDCombatActor data.
 */
export class FDCombatActorField extends EmbeddedDataField {
   constructor(options) {
      super(FDCombatActorData, options);
   }
}

export class FDCombatActorData extends foundry.abstract.DataModel {
   static defineSchema() {
      const schema = {
         details: new SchemaField({
            // This is how many attacks the actor gets per round.
            attacks: new StringField({ initial: "1" }),
         }),
         config: new SchemaField({
            // Ignored by multi-class character
            firstSpellLevel: new NumberField({ required: false, initial: 1 }),
            maxSpellLevel: new NumberField({ required: true, initial: 0 }),
         }),
         thac0: new SchemaField({
            value: new NumberField({ initial: CONFIG.FADE.ToHit.baseTHAC0 }),
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
            basicProficiency: new BooleanField({ required: true, initial: false }),
            unskilledToHitMod: new NumberField({ required: true, initial: -2 }),
            // This is how many attacks the character has made for the current round
            attacks: new NumberField({ initial: 0 }),
            // This is how many times the character has been attack for the current round
            attAgainstH: new NumberField({ initial: 0 }),
            attAgainstM: new NumberField({ initial: 0 }),
            deathCount: new NumberField({ initial: 0 }),
            isDead: new BooleanField({ initial: false }),
            declaredAction: new StringField({ initial: "attack" }),
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
            // Wrestling Rating modifier
            wrestling: new NumberField({ nullable: true, initial: null }),
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
            masteryLevelOverride: new StringField({ nullable: true, initial: null }),
         }),
         wrestling: new NumberField({ initial: 0 }),
         // If enchanted, can only hit with magic weapons or spells.
         isEnchanted: new BooleanField({ initial: false }),
         abilities: null
      };

      const abilityScoreSys = game.fade.registry.getSystem("abilityScore");
      schema.abilities = abilityScoreSys.defineSchemaForActor();

      return schema;
   }
}
