import { fadeItemDataModel } from "./fadeItemDataModel.mjs";
/**
 * Data model for a special ability item extending fadeItemDataModel.
 */
export class SpecialAbilityDataModel extends fadeItemDataModel {
   static defineSchema() {
      const { fields } = foundry.data;

      // Extend the schema from fadeItemDataModel
      const baseSchema = super.defineSchema();

      return {
         ...baseSchema, // Include fields from fadeItemDataModel

         // Fields from the "rollable" template
         rollFormula: new fields.StringField({ required: false, initial: "" }),
         operator: new fields.StringField({ required: false, initial: "" }),
         target: new fields.NumberField({ required: false, initial: 0 }),
         rollMode: new fields.StringField({ required: false, initial: "publicroll" }),
         savingThrow: new fields.StringField({ nullable: true, initial: null }),

         // Fields specific to the "specialAbility" template
         dmgFormula: new fields.StringField({ nullable: true, initial: null }),
         healFormula: new fields.StringField({ nullable: true, initial: null }),
         damageType: new fields.StringField({ required: false, initial: "" })
      };
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
   }
}

