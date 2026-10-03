const { NumberField, StringField } = foundry.data.fields;

/** A single actor movement mode (parent locomotion entry). */
export class MovementModeData extends foundry.abstract.DataModel {
   static defineSchema() {
      return {
         action: new StringField({
            required: true,
            initial: () => CONFIG.FADE?.Movement?.defaultAction ?? "walk",
         }),
         base: new NumberField({ nullable: true, initial: 120 }),
         turn: new NumberField({ nullable: true, initial: 120 }),
         round: new NumberField({ nullable: true, initial: null }),
         day: new NumberField({ nullable: true, initial: null }),
         run: new NumberField({ nullable: true, initial: null }),
      };
   }
}
