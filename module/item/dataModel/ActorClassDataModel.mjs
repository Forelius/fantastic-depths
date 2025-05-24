/**
 * A proxy class for ClassDefinitionDataModel.
 */
export class ActorClassDataModel extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      const { fields } = foundry.data;
      return {
         key: new fields.StringField({ required: true }),
         level: new fields.NumberField({ required: true }),
         xp: new fields.NumberField({ required: true, initial: 5 }),
         thac0: new fields.NumberField({ required: true, initial: CONFIG.FADE.ToHit.BaseTHAC0 }),
         thbonus: new fields.NumberField({ required: true, initial: 0 }),
         hd: new fields.StringField({ required: true, initial: '' }),
         hdcon: new fields.BooleanField({ required: true, initial: true }),
         title: new fields.StringField({ required: false, nullable: true }),
         attackRank: new fields.StringField({ required: false, nullable: true }),
      };
   }
}