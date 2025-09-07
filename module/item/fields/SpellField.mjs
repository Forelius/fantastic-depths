const { ArrayField, BooleanField, EmbeddedDataField, NumberField, SchemaField, SetField, StringField } = foundry.data.fields;

/**
 * Field for storing spell data.
 */
export class SpellField extends EmbeddedDataField {
   constructor(options) {
      super(SpellData, options);
   }
}

export class SpellData extends foundry.abstract.DataModel {
   /** @override */
   static defineSchema() {
      return {
         // Fields from the "base" template
         tags: new ArrayField(new StringField({ required: false }), { initial: [] }),
         description: new StringField({ required: false, initial: "" }),
         gm: new SchemaField({
            notes: new StringField({ required: false, initial: "" })
         }),
         // Fields specific to the "spell" template
         spellLevel: new NumberField({ required: true, initial: 1 }),
         range: new StringField({ required: false, initial: "" }),
         duration: new StringField({ required: false, initial: "Instant" }),
         effect: new StringField({ required: false, initial: "" }),
         // Acts as castMax
         memorized: new NumberField({ required: false, nullable: true, initial: 0 }),
         // How many times the spell has been cast or used
         cast: new NumberField({ required: true, initial: 0 }),
         targetSelf: new BooleanField({ required: false, initial: true }),
         targetOther: new BooleanField({ required: false, initial: true }),
         dmgFormula: new StringField({ nullable: true, initial: null }),
         healFormula: new StringField({ nullable: true, initial: null }),
         maxTargetFormula: new StringField({ required: false, initial: "1" }),
         // Specified in rounds (10 seconds)
         durationFormula: new StringField({ nullable: true, initial: null }),
         savingThrow: new StringField({ nullable: true, initial: null }),
         saveDmgFormula: new StringField({ nullable: true, initial: null }),
         attackType: new StringField({ required: false, initial: "" }),
         damageType: new StringField({ required: false, initial: "" }),
         conditions: new ArrayField(
            new SchemaField({
               name: new StringField({ required: true, initial: '' }),
               uuid: new StringField({ required: true, initial: '' }),
            }),
            {
               required: false,
               initial: []
            }),
         classes: new ArrayField(
            new SchemaField({
               name: new StringField({ required: true, initial: '' }),
               uuid: new StringField({ required: true, initial: '' }),
            }),
            {
               required: false,
               initial: []
            }),
      };
   }
}