export class ClassDataModel extends foundry.abstract.DataModel {
   static defineSchema() {
      const { fields } = foundry.data;

      return {
         // Required Fields
         name: new fields.StringField({ required: true }),
         species: new fields.StringField({ required: true }),
         maxLevel: new fields.NumberField({ required: true }),
         maxSpellLevel: new fields.NumberField({ required: true }),
         isSpellcaster: new fields.BooleanField({ required: true }),
         
         // Optional Fields
         alignment: new fields.StringField({ required: false, nullable: true }),
         minCon: new fields.NumberField({ required: false, nullable: true }),
         minInt: new fields.NumberField({ required: false, nullable: true }),
         minDex: new fields.NumberField({ required: false, nullable: true }),
         minWis: new fields.NumberField({ required: false, nullable: true }),

         primeReqs: new fields.ArrayField(
            new fields.SchemaField({
               ability: new fields.StringField({ required: true }),
               xpBonus5: new fields.NumberField({ required: true }),
               xpBonus10: new fields.NumberField({ required: true }),
            }),
            { required: true }
         ),

         levels: new fields.ArrayField(
            new fields.SchemaField({
               level: new fields.NumberField({ required: true }),
               xp: new fields.NumberField({ required: true }),
               thac0: new fields.NumberField({ required: true }),
               hd: new fields.StringField({ required: true }),
               hdcon: new fields.BooleanField({ required: true }),
               title: new fields.StringField({ required: false, nullable: true }),
               femaleTitle: new fields.StringField({ required: false, nullable: true }),
               attackRank: new fields.StringField({ required: false, nullable: true }),
            }),
            { required: true }
         ),

         saves: new fields.ArrayField(
            new fields.SchemaField({
               level: new fields.NumberField({ required: true }),
               death: new fields.NumberField({ required: true }),
               wand: new fields.NumberField({ required: true }),
               paralysis: new fields.NumberField({ required: true }),
               breath: new fields.NumberField({ required: true }),
               spell: new fields.NumberField({ required: true }),
            }),
            { required: true }
         ),

         // Spells Field Adjusted to Be Optional
         spells: new fields.ArrayField(
            new fields.ArrayField(
               new fields.NumberField({ required: true })
            ),
            { required: false, nullable: true }
         ),

         // Add other optional fields as needed, ensuring they are marked as required: false and nullable: true
      };
   }
}