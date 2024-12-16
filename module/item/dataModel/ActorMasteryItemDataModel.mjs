import { fadeItemDataModel } from "./fadeItemDataModel.mjs";

/**
 * Data model for an actor mastery item extending fadeItemDataModel.
 */
export class ActorMasteryItemDataModel extends fadeItemDataModel {
   static defineSchema() {
      const { fields } = foundry.data;

      // Extend the schema from fadeItemDataModel
      const baseSchema = super.defineSchema();

      return {
         ...baseSchema, // Include fields from fadeItemDataModel

         // Fields specific to the "mastery" template
         level: new fields.StringField({ required: true, initial: "basic" }),
         primaryType: new fields.StringField({ nullable: true, initial: null }),
         range: new fields.SchemaField({
            short: new fields.NumberField({ nullable: true, initial: null }),
            medium: new fields.NumberField({ nullable: true, initial: null }),
            long: new fields.NumberField({ nullable: true, initial: null })
         }),
         pDmgFormula: new fields.StringField({ nullable: true, initial: null }),
         sDmgFormula: new fields.StringField({ nullable: true, initial: null }),
         acBonusType: new fields.StringField({ nullable: true, initial: null }),
         acBonus: new fields.NumberField({ nullable: true, initial: 0 }),
         acBonusAT: new fields.NumberField({ nullable: true, initial: null }),
         special: new fields.StringField({ nullable: true, initial: null }),
         pToHit: new fields.NumberField({ required: true, initial: 0 }),
         sToHit: new fields.NumberField({ required: true, initial: 0 })
      };
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
   }
}
