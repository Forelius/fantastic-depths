import { fadeItemDataModel } from "./fadeItemDataModel.mjs";

/**
 * Data model for a skill item extending fadeItemDataModel.
 */
export class LightItemDataModel extends fadeItemDataModel {
   static defineSchema() {
      const { fields } = foundry.data;
      // Extend the schema from fadeItemDataModel
      const baseSchema = super.defineSchema();
      return {
         ...baseSchema, // Include fields from fadeItemDataModel
         isLight: new fields.BooleanField({ required: false, initial: true }),
         light: new fields.SchemaField({
            type: new fields.StringField({ required: false, initial: "" }),
            duration: new fields.NumberField({ required: false, initial: 6 }),
            radius: new fields.NumberField({ required: false, initial: 30 }),
            fuelType: new fields.StringField({ required: false, initial: "" }),
            turnsActive: new fields.NumberField({ required: false, initial: 0 }),
         })
      };
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
   }
}
