/**
 * Data model for a generic item inheriting from multiple templates.
 */
export class ConditionItemDataModel extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      const { fields } = foundry.data;
      return {
         key: new fields.StringField({ required: true, initial: "" }),
         shortName: new fields.StringField({ required: false, initial: "" }),
         description: new fields.StringField({ required: false, initial: "" }),
         addStatusEffect: new fields.BooleanField({ required: false, initial: false }),
      };
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
   }
}
