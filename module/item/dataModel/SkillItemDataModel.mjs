import { fadeItemDataModel } from "./fadeItemDataModel.mjs";

/**
 * Data model for a skill item.
 */
export class SkillItemDataModel extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      const { fields } = foundry.data;
      return {
         // Fields from the "base" template
         tags: new fields.ArrayField(new fields.StringField({ required: false }), { initial: [] }),
         description: new fields.StringField({ required: false, initial: "" }),
         gm: new fields.SchemaField({
            notes: new fields.StringField({ required: false, initial: "" })
         }),
         // Fields specific to the "skill" template
         ability: new fields.StringField({ required: true, initial: "str" }),
         targetFormula: new fields.StringField({ required: true, initial: "@rollTarget" }),
         operator: new fields.StringField({ required: true, initial: "lte" }),
         rollFormula: new fields.StringField({ required: true, initial: "1d20" }),
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
