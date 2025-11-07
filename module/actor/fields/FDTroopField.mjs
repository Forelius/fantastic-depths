const { ArrayField, BooleanField, EmbeddedDataField, NumberField, SchemaField, SetField, StringField } = foundry.data.fields;

/**
 * Field for storing FDActorBase data.
 */
export class FDTroopField extends EmbeddedDataField {
   constructor(options) {
      super(FDTroopData, options);
   }
}

export class FDTroopData extends foundry.abstract.DataModel {
   /** @override */
   static defineSchema() {
      return {        
         tags: new ArrayField(new StringField({ required: false }), { initial: [] }),
         biography: new StringField({ initial: "" }),         
         gm: new SchemaField({
            notes: new StringField({ initial: "", gmOnly: true }),
         }),
         activeLight: new StringField({ nullable: true, required: false, initial: null }),
      };
   }
}