
/**
 * Data model for a spell item.
 */
export class SpellItemDataModel extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      const { fields } = foundry.data;
      return {
         // Fields from the "base" template
         tags: new fields.ArrayField(new fields.StringField({ required: false }), { initial: [] }),
         description: new fields.StringField({ required: false, initial: "" }),
         gm: new fields.SchemaField({
            notes: new fields.StringField({ required: false, initial: "" })
         }),
         // Fields specific to the "spell" template
         spellLevel: new fields.NumberField({ required: true, initial: 1 }),
         range: new fields.StringField({ required: false, initial: "" }),
         duration: new fields.StringField({ required: false, initial: "Instant" }),
         effect: new fields.StringField({ required: false, initial: "" }),
         memorized: new fields.NumberField({ nullable: true, initial: 0 }),
         cast: new fields.NumberField({ required: true, initial: 0 }),
         targetSelf: new fields.BooleanField({ required: false, initial: true }),
         targetOther: new fields.BooleanField({ required: false, initial: true }),
         dmgFormula: new fields.StringField({ nullable: true, initial: null }),
         healFormula: new fields.StringField({ nullable: true, initial: null }),
         maxTargetFormula: new fields.StringField({ required: false, initial: "1" }),
         // Specified in rounds (10 seconds)
         durationFormula: new fields.StringField({ nullable: true, initial: null }),
         savingThrow: new fields.StringField({ nullable: true, initial: null }),
         saveDmgFormula: new fields.StringField({ nullable: true, initial: null }),
         attackType: new fields.StringField({ required: false, initial: "" }),
         damageType: new fields.StringField({ required: false, initial: "" })
      };
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
      this.spellLevel = this.spellLevel !== null ? Math.max(0, this.spellLevel) : 1;
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
      this.savingThrow = this.savingThrow === '' ? null : this.savingThrow;
   }
}
