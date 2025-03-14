/**
 * Data model for a weapon mastery item containing multiple mastery levels.
 */
export class MasteryDefinitionItemDataModel extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      const { fields } = foundry.data;
      return {
         name: new fields.StringField({ required: true }),
         weaponType: new fields.StringField({ required: false, initial: "handheld" }),
         primaryType: new fields.StringField({ required: true, initial: "all" }),
         levels: new fields.ArrayField(
            new fields.SchemaField({
               name: new fields.StringField({ required: true }),
               range: new fields.SchemaField({
                  short: new fields.NumberField({ required: true, initial: 0 }),
                  medium: new fields.NumberField({ required: true, initial: 0 }),
                  long: new fields.NumberField({ required: true, initial: 0 }),
               }),
               pDmgFormula: new fields.StringField({ nullable: true, initial: null }),
               sDmgFormula: new fields.StringField({ nullable: true, initial: null }),
               acBonusType: new fields.StringField({ nullable: true, initial: null }),
               acBonus: new fields.NumberField({ nullable: true, initial: null }),
               acBonusAT: new fields.NumberField({ nullable: true, initial: null }),
               pToHit: new fields.NumberField({ required: true, initial: 0 }),
               sToHit: new fields.NumberField({ required: true, initial: 0 }),
               special: new fields.StringField({ nullable: true, required: false }),
            }),
            {
               required: true,
               initial: Array.from({ length: CONFIG.FADE.MasteryLevels.length }, (_, index) => ({
                  name: CONFIG.FADE.MasteryLevels[index],
                  range: { short: 0, medium: 0, long: 0 },
                  pDmgFormula: null,
                  sDmgFormula: null,
                  acBonusType: null,
                  acBonus: null,
                  acBonusAT: null,
                  pToHit: 0,
                  sToHit: 0,
               }))
            }
         )
      };
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
      for (const level of this.levels) {
         level.acBonusType = level.acBonusType !== 'null' ? level.acBonusType : null
      }
   }
}
