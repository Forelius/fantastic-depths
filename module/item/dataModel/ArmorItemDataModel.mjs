/**
 * Data model for an armor item extending fadeItemDataModel.
 */
export class ArmorItemDataModel extends fadeItemDataModel {
   static defineSchema() {
      const { fields } = foundry.data;

      // Extend the schema from fadeItemDataModel
      const baseSchema = super.defineSchema();

      return {
         ...baseSchema, // Include fields from fadeItemDataModel

         // Fields specific to the "armor" template
         ac: new fields.NumberField({ required: true, initial: 9 }),
         isShield: new fields.BooleanField({ required: false, initial: false }),
         dmgFormula: new fields.StringField({ nullable: true, initial: null }),
         armorWeight: new fields.StringField({ required: true, initial: "light" })
      };
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
   }
}
