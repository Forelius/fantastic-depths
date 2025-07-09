/**
 * A proxy class for ClassDefinitionDataModel.
 */
export class ActorClassDataModel extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      const { fields } = foundry.data;
      return {
         classUuid: new fields.StringField({ required: true }),
         isPrimary: new fields.BooleanField({ required: true, initial: true }),
         // The class key
         key: new fields.StringField({ required: true }),
         level: new fields.NumberField({ required: true }),
         firstLevel: new fields.NumberField({ required: true, initial: 1 }),
         maxLevel: new fields.NumberField({ required: true, initial: 1 }),
         firstSpellLevel: new fields.NumberField({ required: true, initial: 1 }),
         maxSpellLevel: new fields.NumberField({ required: true, initial: 0 }),
         // Only the class key, not the level like monster does for castAs
         castAsKey: new fields.StringField({ nullable: true, required: false, initial: null }),
         xp: new fields.SchemaField({
            value: new fields.NumberField({ initial: 0 }),
            bonus: new fields.NumberField({ initial: 0 }),
            next: new fields.NumberField({ initial: 0 }),
         }),
         basicProficiency: new fields.BooleanField({ required: true, initial: false }),
         unskilledToHitMod: new fields.NumberField({ required: true, initial: -2 }),
         thac0: new fields.NumberField({ required: true, initial: CONFIG.FADE.ToHit.BaseTHAC0 }),
         thbonus: new fields.NumberField({ required: true, initial: 0 }),
         hd: new fields.StringField({ required: true, initial: "" }),
         hdcon: new fields.BooleanField({ required: true, initial: true }),
         title: new fields.StringField({ required: false, nullable: true }),
         attackRank: new fields.StringField({ required: false, nullable: true }),
      };
   }
}