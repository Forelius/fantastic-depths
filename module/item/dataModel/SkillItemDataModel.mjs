import { fadeItemDataModel } from "./fadeItemDataModel.mjs";

/**
 * Data model for a skill item extending fadeItemDataModel.
 */
export class SkillItemDataModel extends fadeItemDataModel {
   static defineSchema() {
      const { fields } = foundry.data;

      // Extend the schema from fadeItemDataModel
      const baseSchema = super.defineSchema();

      return {
         ...baseSchema, // Include fields from fadeItemDataModel

         // Fields specific to the "skill" template
         ability: new fields.StringField({ required: true, initial: "str" }),
         level: new fields.NumberField({ required: true, initial: 1 }),
         rollMode: new fields.StringField({ required: false, initial: "" }),
         healFormula: new fields.StringField({ nullable: true, initial: null })
      };
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
   }
}
