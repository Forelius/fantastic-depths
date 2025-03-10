export class SpeciesItemDataModel extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      const { fields } = foundry.data;

      return {
         // Required Fields
         key: new fields.StringField({ required: true }),
         description: new fields.StringField({ required: false, initial: "" }),
         gm: new fields.SchemaField({
            notes: new fields.StringField({ required: false, initial: "" })
         }),
         abilities: new fields.ArrayField(
            new fields.SchemaField({
               name: new fields.StringField({ required: true, initial: '' }),
               level: new fields.NumberField({ required: true }),
               target: new fields.NumberField({ required: true, nullable: true }),
            }), {
            required: false,
         })
      };
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
   }
}