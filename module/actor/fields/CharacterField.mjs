const { ArrayField, BooleanField, EmbeddedDataField, NumberField, SchemaField, SetField, StringField } = foundry.data.fields;

/**
 * Field for storing Character data.
 */
export class CharacterField extends EmbeddedDataField {
   constructor(options) {
      super(CharacterData, options);
   }
}

export class CharacterData extends foundry.abstract.DataModel {
   /** @override */
   static defineSchema() {
      return {
         isRetainer: new BooleanField({ initial: false }),
         details: new SchemaField({
            morale: new NumberField({ initial: 9 }),
            alignment: new StringField({ initial: "Neutral" }),
            // Aka ancestry
            species: new StringField({ initial: "" }),
            age: new NumberField({ initial: 20 }),
            sex: new StringField({ initial: "" }),
            height: new StringField({ initial: "" }),            
            eyes: new StringField({ initial: "" }),
            hair: new StringField({ initial: "" }),
            //---------------------------------------------------
            level: new StringField({ initial: "1" }),
            xp: new SchemaField({
               value: new StringField({ initial: "0" }),
               bonus: new StringField({ initial: "0" }),
               next: new StringField({ initial: "0" }),
            }),
            class: new StringField({ initial: "" }),
            title: new StringField({ initial: "" }),
            // Only the class key, not the level like monster does for castAs
            classKey: new StringField({ required: false, nullable: true, initial: null }),
            castAsKey: new StringField({ nullable: true, required: false, initial: null }),
            //---------------------------------------------------
         }),
         retainer: new SchemaField({
            max: new NumberField({ initial: 0 }),
            morale: new NumberField({ initial: 0 }),
            loyalty: new NumberField({ initial: 0 }),
            wage: new StringField({ initial: "" }),
         }),
      };
   }
}