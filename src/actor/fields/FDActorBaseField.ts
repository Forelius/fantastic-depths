const { ArrayField, EmbeddedDataField, SchemaField, StringField } = foundry.data.fields;

/**
 * Field for storing FDActorBase data.
 */
export class FDActorBaseField extends EmbeddedDataField {
   constructor(options) {
      super(FDActorBaseData, options);
   }
}

export class FDActorBaseData extends foundry.abstract.DataModel {
   static defineSchema() {
      return {        
         tags: new ArrayField(new StringField({ required: false }), { initial: [] }),
         biography: new StringField({ initial: "" }),
         details: new SchemaField({
            weight: new StringField({ initial: "" }),
            size: new StringField({ initial: "M" }),
         }),
         gm: new SchemaField({
            notes: new StringField({ initial: "", gmOnly: true }),
         }),
         activeLight: new StringField({ nullable: true, required: false, initial: null }),
         // Stores one or more values from FADE.ActorGroups.
         actorGroups: new ArrayField(new StringField(), { required: false, initial: [] }),
      };
   }
}
