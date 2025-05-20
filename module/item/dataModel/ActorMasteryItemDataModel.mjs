
/**
 * Data model for an actor mastery item.
 */
export class ActorMasteryItemDataModel extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      const { fields } = foundry.data;
      return {
         // Fields from the "base" template
         // Fields specific to the "mastery" template
         level: new fields.StringField({ required: true, initial: "basic" }),
         effectiveLevel: new fields.StringField({ initial: "basic" }),
         weaponType: new fields.StringField({ required: true, initial: "handheld" }),
         primaryType: new fields.StringField({ nullable: true, initial: null }),
         range: new fields.SchemaField({
            short: new fields.NumberField({ nullable: true, initial: null }),
            medium: new fields.NumberField({ nullable: true, initial: null }),
            long: new fields.NumberField({ nullable: true, initial: null })
         }),
         // Primary damage
         pDmgFormula: new fields.StringField({ nullable: true, initial: null }),
         // Secondary damage
         sDmgFormula: new fields.StringField({ nullable: true, initial: null }),
         // Type of weapon that AC bonus applies to
         acBonusType: new fields.StringField({ nullable: true, initial: null }),
         // The AC bonus
         acBonus: new fields.NumberField({ nullable: true, initial: 0 }),
         // The number of attacks the AC bonus applies to per round
         acBonusAT: new fields.NumberField({ nullable: true, initial: null }),
         special: new fields.StringField({ nullable: true, initial: null }),
         // Primary to-hit bonus
         pToHit: new fields.NumberField({ required: true, initial: 0 }),
         // Secondary to-hit bonus
         sToHit: new fields.NumberField({ required: true, initial: 0 }),
         // The number of advancement training attempts failed for the next level
         trainingFails: new fields.NumberField({ required: true, initial: 0 }),
         basicProficiency: new fields.BooleanField({ required: true, initial: false }),
         unskilledToHitMod: new fields.NumberField({ required: true, initial: -1 }),
      };
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
      this.acBonusType = this.acBonusType !== 'null' ? this.acBonusType : null
      this.canRanged = this.range.short > 0 || this.range.medium > 0 || this.range.long > 0;
   }
}
