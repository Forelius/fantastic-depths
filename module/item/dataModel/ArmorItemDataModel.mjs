import { GearItemDataModel } from "./GearItemDataModel.mjs";

/**
 * Data model for an armor item extending GearItemDataModel.
 */
export class ArmorItemDataModel extends GearItemDataModel {
   static defineSchema() {
      const { fields } = foundry.data;

      // Extend the schema from GearItemDataModel
      const baseSchema = super.defineSchema();

      return {
         ...baseSchema,

         // Fields specific to the "armor" template
         ac: new fields.NumberField({ required: true, initial: 9 }),
         isShield: new fields.BooleanField({ required: false, initial: false }),
         dmgFormula: new fields.StringField({ nullable: true, initial: null }),
         armorWeight: new fields.StringField({ required: true, initial: "light" }),
         mod: new fields.NumberField({ required: true, initial: 0 }),
         totalAC: new fields.NumberField({ required: true, initial: 9 }),
         totalAAC: new fields.NumberField({ required: true, initial: 9 }),
         natural: new fields.BooleanField({ required: false, initial: false })
      };
   }

   /** @override */
   prepareBaseData() {
      this.mod = 0;
      this.equippable = true;
      super.prepareBaseData();
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
   }
}
