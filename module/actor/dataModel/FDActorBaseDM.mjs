export class FDActorBaseDM extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      const { fields } = foundry.data;
      return {        
         tags: new fields.ArrayField(new fields.StringField({ required: false }), { initial: [] }),
         biography: new fields.StringField({ initial: "" }),         
         details: new fields.SchemaField({
            weight: new fields.StringField({ initial: "" }),
            size: new foundry.data.fields.StringField({ initial: "M" }),
         }),         
         gm: new fields.SchemaField({
            notes: new fields.StringField({ initial: "", gmOnly: true }),
         }),
         activeLight: new fields.StringField({ nullable: true, required: false, initial: null }),
         hp: new fields.SchemaField({
            hd: new fields.StringField({ initial: "1d8" }),
            value: new fields.NumberField({ initial: 5 }),
            max: new fields.NumberField({ initial: 5 }),
         }),
         movement: new fields.SchemaField({
            turn: new fields.NumberField({ initial: 120 }),
            max: new fields.NumberField({ initial: 120 }),
            round: new fields.NumberField({ initial: 0 }),
            day: new fields.NumberField({ initial: 0 }),
            run: new fields.NumberField({ initial: 0 }),
         }),
         movement2: new fields.SchemaField({
            turn: new fields.NumberField({ initial: 0 }),
            max: new fields.NumberField({ initial: 0 }),
            round: new fields.NumberField({ initial: 0 }),
            day: new fields.NumberField({ initial: 0 }),
            run: new fields.NumberField({ initial: 0 }),
         }),
         encumbrance: new fields.SchemaField({
            value: new fields.NumberField({ initial: 0 }),
            max: new fields.NumberField({ initial: 2400 }),
            mv: new fields.NumberField({ initial: 0 }),
            mv2: new fields.NumberField({ initial: 0 }),
            label: new fields.StringField(),
            desc: new fields.StringField(),
         }),
         acDigest: new fields.ArrayField(new fields.StringField(), { required: false, initial: [] }),
         ac: new fields.SchemaField({
            naked: new fields.NumberField({ initial: 9 }),
            nakedRanged: new fields.NumberField({ initial: 9 }),
            nakedAAC: new fields.NumberField({ initial: 10 }),
            nakedRangedAAC: new fields.NumberField({ initial: 10 }),
            // This is the raw AC based on armor and no modifiers applied. Used for wrestling.
            value: new fields.NumberField({ initial: 9 }),
            // For melee attacks
            total: new fields.NumberField({ initial: 9 }),
            // For ranged attacks
            totalRanged: new fields.NumberField({ initial: 9 }),
            // Same for ascending armor class
            totalAAC: new fields.NumberField({ initial: 10 }),
            totalRangedAAC: new fields.NumberField({ initial: 10 }),
            // AV is armor value and represents how many points of damage armor stops.
            // Assumes one AV for all body parts.
            av: new fields.StringField({ initial: "0" }),
            shield: new fields.NumberField({ initial: 0 }),
            // mod is an accumulator for armor AC mods only. All other items that modify armor must do so via actor's system.mod.ac.
            mod: new fields.NumberField({ initial: 0 })
         }),
      };
   }

   /**
    * Migrate source data from some prior format into a new specification.
    * The source parameter is either original data retrieved from disk or provided by an update operation.
    * @inheritDoc
    */
   static migrateData(source) {
      // TODO: Remove someday.
      if (!source.movement2) {
         source.movement2 = source.flight;
      }
      return super.migrateData(source);
   }
}