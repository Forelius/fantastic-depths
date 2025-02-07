import { fadeItemDataModel } from "./fadeItemDataModel.mjs";

/**
 * Data model for a spell item extending fadeItemDataModel.
 */
export class SpellItemDataModel extends fadeItemDataModel {
   static defineSchema() {
      const { fields } = foundry.data;

      // Extend the schema from fadeItemDataModel
      const baseSchema = super.defineSchema();

      return {
         ...baseSchema, // Include fields from fadeItemDataModel

         // Fields specific to the "spell" template
         spellLevel: new fields.NumberField({ required: true, initial: 1 }),
         range: new fields.StringField({ required: false, initial: ""}),
         duration: new fields.StringField({ required: false, initial: "Instant" }),
         effect: new fields.StringField({ required: false, initial: "" }),
         memorized: new fields.NumberField({ required: true, initial: 0 }),
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
   }
}
