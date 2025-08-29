/**
 * Data model for a special ability item.
 */
export class SpecialAbilityDataModel extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      const { fields } = foundry.data;
      return {
         // Fields from the "base" template
         tags: new fields.ArrayField(new fields.StringField({ required: false }), { initial: [] }),
         description: new fields.StringField({ required: false, initial: "" }),
         gm: new fields.SchemaField({
            notes: new fields.StringField({ required: false, initial: "" })
         }),
         rollFormula: new fields.StringField({ required: false, initial: "" }),
         operator: new fields.StringField({ required: false, initial: "" }),
         target: new fields.StringField({ required: false, initial: "" }),
         rollMode: new fields.StringField({ required: false, initial: "publicroll" }),
         autoSuccess: new fields.NumberField({ required: false, initial: null, nullable: true }),
         autoFail: new fields.NumberField({ required: false, initial: null, nullable: true }),
         abilityMod: new fields.StringField({ required: false, initial: "" }),
         // Fields specific to the "specialAbility" template
         savingThrow: new fields.StringField({ nullable: true, initial: null }),
         dmgFormula: new fields.StringField({ nullable: true, initial: null }),
         healFormula: new fields.StringField({ nullable: true, initial: null }),
         damageType: new fields.StringField({ required: false, initial: "" }),
         category: new fields.StringField({ required: false, initial: "" }),
         // Some item types use short name, like the saving throw.
         shortName: new fields.StringField({ required: false, initial: "" }),
         // The type of combat maneuver this represents
         combatManeuver: new fields.StringField({ required: false, nullable: true, initial: null }),
         // The type of saving throw this represents. Only use if this is a saving throw item
         customSaveCode: new fields.StringField({ required: false, nullable: true, initial: null }),
         classKey: new fields.StringField({ required: false, nullable: true, initial: null }),
         showResult: new fields.BooleanField({ required: false, initial: true }),
         quantity: new fields.NumberField({ required: false, initial: 1, nullable: true }),
         quantityMax: new fields.NumberField({ required: false, initial: null, nullable: true }),
         conditions: new fields.ArrayField(
            new fields.SchemaField({
               name: new fields.StringField({ required: true, initial: '' }),
               durationFormula: new fields.StringField({ required: false, nullable:true, initial: null }),
               uuid: new fields.StringField({ required: true, initial: '' }),
            }),
            {
               required: false,
               initial: []
            })
      };
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
      this.savingThrow = this.savingThrow === '' ? null : this.savingThrow;
   }
}