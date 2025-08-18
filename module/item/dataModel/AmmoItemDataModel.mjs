import { GearItemDataModel } from "./GearItemDataModel.mjs";

/**
 * Data model for an ammo item extending GearItemDataModel.
 */
export class AmmoItemDataModel extends GearItemDataModel {
   static defineSchema() {
      const { fields } = foundry.data;

      // Extend the schema from GearItemDataModel
      const baseSchema = super.defineSchema();

      return {
         ...baseSchema,
         // Fields specific to the "ammo" template
         isTreasure: new fields.BooleanField({ required: true, initial: false }),
         isAmmo: new fields.BooleanField({ required: false, initial: true }),
         mod: new fields.SchemaField({
            dmgRanged: new fields.NumberField({ initial: 0 }),
            toHitRanged: new fields.NumberField({ initial: 0 }),
            vsGroup: new fields.ObjectField({}),
         })
      };
   }

   /** @override */
   prepareBaseData() {
      this.equippable = true;
      this.isAmmo = true;
      super.prepareBaseData();
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
   }
}