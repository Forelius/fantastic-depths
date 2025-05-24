export class SpeciesItemDataModel extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      const { fields } = foundry.data;

      return {
         // Required Fields
         key: new fields.StringField({ required: true }),
         description: new fields.StringField({ required: false, initial: "" }),
         languages: new fields.ArrayField(new fields.StringField({ required: false }), { initial: [] }),
         baseMovement: new fields.NumberField({ required: true }),
         heightFormulaM: new fields.StringField({ nullable: true }),
         weightFormulaM: new fields.StringField({ nullable: true }),
         heightFormulaF: new fields.StringField({ nullable: true }),
         weightFormulaF: new fields.StringField({ nullable: true }),
         ageFormula: new fields.StringField({ nullable: true }),
         // If true the character or class has basic proficiency with all weapons.
         basicProficiency: new fields.BooleanField({ required: true, initial: false }),
         classes: new fields.ArrayField(
            new fields.SchemaField({
               name: new fields.StringField({ required: true, initial: '' }),
               maxLevel: new fields.NumberField({ required: true })               
            }), {
            required: false,
         }),
         abilities: new fields.SchemaField({
            str: new fields.SchemaField({
               min: new fields.NumberField({ initial: 3 }),
            }),
            int: new fields.SchemaField({
               min: new fields.NumberField({ initial: 3 }),
            }),
            wis: new fields.SchemaField({
               min: new fields.NumberField({ initial: 3 }),
            }),
            dex: new fields.SchemaField({
               min: new fields.NumberField({ initial: 3 }),
            }),
            con: new fields.SchemaField({
               min: new fields.NumberField({ initial: 3 }),
            }),
            cha: new fields.SchemaField({
               min: new fields.NumberField({ initial: 3 }),
            })
         }),
         // Special abilities
         specialAbilities: new fields.ArrayField(
            new fields.SchemaField({
               name: new fields.StringField({ required: true, initial: '' }),
               classKey: new fields.StringField({ nullable: true }),
               target: new fields.StringField({ nullable: true, initial: null }),
               changes: new fields.StringField({ required: true, initial: '' })
            }), {
            required: false,
         }),
         ancestryItems: new fields.ArrayField(
            new fields.SchemaField({
               level: new fields.NumberField({ required: true, nullable: false }),
               name: new fields.StringField({ required: true, initial: '' }),
               type: new fields.StringField({ required: true, initial: '' }),
               changes: new fields.StringField({ required: true, initial: '' }),
            }),
            {
               required: false,
               initial: []
            }),
      };
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
   }
}