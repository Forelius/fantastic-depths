
/**
 * Data model for an actor mastery item.
 */
export class ActorMasteryItemDataModel extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      const { fields } = foundry.data;
      return {
         // Fields from the "base" template
         tags: new fields.ArrayField(new fields.StringField({ required: false }), { initial: [] }),
         description: new fields.StringField({ required: false, initial: "" }),
         gm: new fields.SchemaField({
            notes: new fields.StringField({ required: false, initial: "" })
         }),
         // Fields specific to the "mastery" template
         level: new fields.StringField({ required: true, initial: "basic" }),
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
         sToHit: new fields.NumberField({ required: true, initial: 0 })
      };
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
      this.canRanged = this.range.short > 0 || this.range.medium > 0 || this.range.long > 0;
   }
}
