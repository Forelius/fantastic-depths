/**
 * Data model for a weapon item extending fadeItemDataModel.
 */
export class WeaponItemDataModel extends fadeItemDataModel {
   static defineSchema() {
      const { fields } = foundry.data;

      // Extend the schema from fadeItemDataModel
      const baseSchema = super.defineSchema();

      return {
         ...baseSchema, // Include fields from fadeItemDataModel

         // Fields specific to the "weapon" template
         damageRoll: new fields.StringField({ required: true, initial: "1d6" }),
         damageType: new fields.StringField({ required: true, initial: "physical" }),
         breath: new fields.BooleanField({ required: false, initial: false }),
         canMelee: new fields.BooleanField({ required: false, initial: true }),
         canRanged: new fields.BooleanField({ required: false, initial: false }),
         savingThrow: new fields.StringField({ nullable: true, initial: null }),
         saveDmgFormula: new fields.StringField({ nullable: true, initial: null }),
         mastery: new fields.StringField({ required: false, initial: "" }),
         weaponType: new fields.StringField({ required: false, initial: "" }),
         range: new fields.SchemaField({
            short: new fields.NumberField({ nullable: true, initial: null }),
            medium: new fields.NumberField({ nullable: true, initial: null }),
            long: new fields.NumberField({ nullable: true, initial: null })
         }),
         ammo: new fields.SchemaField({
            type: new fields.StringField({ nullable: true, initial: null }),
            load: new fields.NumberField({ nullable: true, initial: null }),
            maxLoad: new fields.NumberField({ nullable: true, initial: null })
         })
      };
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
   }
}
