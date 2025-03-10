export class SpeciesItemDataModel extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      const { fields } = foundry.data;

      return {
         // Required Fields
         key: new fields.StringField({ required: true }),
         description: new fields.StringField({ required: false, initial: "" }),
      };
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
   }
}