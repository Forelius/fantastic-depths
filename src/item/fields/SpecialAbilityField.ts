const { ArrayField, BooleanField, EmbeddedDataField, NumberField, SchemaField, SetField, StringField } = foundry.data.fields;

/**
 * Field for storing SpecialAbility data.
 */
export class SpecialAbilityField extends EmbeddedDataField {
   constructor(options) {
      super(SpecialAbilityData, options);
   }
}

export class SpecialAbilityData extends foundry.abstract.DataModel {
   /** @override */
   static defineSchema() {
      return {
         // Fields from the "base" template
         tags: new ArrayField(new StringField({ required: false }), { initial: [] }),
         description: new StringField({ required: false, initial: "" }),
         gm: new SchemaField({
            notes: new StringField({ required: false, initial: "" })
         }),
         rollFormula: new StringField({ required: false, initial: "" }),
         operator: new StringField({ required: false, initial: "" }),
         target: new StringField({ required: false, initial: "" }),
         rollMode: new StringField({ required: false, initial: "publicroll" }),
         autoSuccess: new NumberField({ required: false, initial: null, nullable: true }),
         autoFail: new NumberField({ required: false, initial: null, nullable: true }),
         abilityMod: new StringField({ required: false, initial: "" }),
         // Fields specific to the "specialAbility" template
         savingThrow: new StringField({ nullable: true, initial: null }),
         dmgFormula: new StringField({ nullable: true, initial: null }),
         healFormula: new StringField({ nullable: true, initial: null }),
         damageType: new StringField({ required: false, initial: "" }),
         category: new StringField({ required: false, initial: "" }),
         // Some item types use short name, like the saving throw.
         shortName: new StringField({ required: false, initial: "" }),
         // The type of combat maneuver this represents
         combatManeuver: new StringField({ required: false, nullable: true, initial: null }),
         // The type of saving throw this represents. Only use if this is a saving throw item
         customSaveCode: new StringField({ required: false, nullable: true, initial: null }),
         classKey: new StringField({ required: false, nullable: true, initial: null }),
         showResult: new BooleanField({ required: false, initial: true }),
         quantity: new NumberField({ required: false, initial: 1, nullable: true }),
         quantityMax: new NumberField({ required: false, initial: null, nullable: true }),
         conditions: new ArrayField(
            new SchemaField({
               name: new StringField({ required: true, initial: '' }),
               durationFormula: new StringField({ required: false, nullable: true, initial: null }),
               uuid: new StringField({ required: true, initial: '' }),
            }),
            {
               required: false,
               initial: []
            })
      };
   }
}
