/**
 * Data model for a generic item inheriting from multiple templates.
 */
export class EffectItemDataModel extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      const { fields } = foundry.data;
      return {
         key: new fields.StringField({ required: true, initial: "" }),
         shortName: new fields.StringField({ required: false, initial: "" }),
         description: new fields.StringField({ required: false, initial: "" }),
         gm: new fields.SchemaField({
            notes: new fields.StringField({ required: false, initial: "" })
         }),
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