/**
 * Data model for a generic item inheriting from multiple templates.
 */
export class GearItemDataModel extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      const { fields } = foundry.data;
      return {
         // Some item types use short name, like the saving throw.
         shortName: new fields.StringField({ required: false, initial: "" }),
         // Fields from the "base" template
         tags: new fields.ArrayField(new fields.StringField({ required: false }), { initial: [] }),
         description: new fields.StringField({ required: false, initial: "" }),
         gm: new fields.SchemaField({
            notes: new fields.StringField({ required: false, initial: "" })
         }),
         // Fields from the "physical" template
         quantity: new fields.NumberField({ required: true, initial: 1 }),
         quantityMax: new fields.NumberField({ required: false, initial: 0, nullable: true }),
         // Some items can be used multiple times and it doesn't effect the total weight or cost
         charges: new fields.NumberField({ required: true, initial: 0}),
         chargesMax: new fields.NumberField({ required: false, initial: 0, nullable: true }),
         weight: new fields.NumberField({ required: false, initial: 1 }),
         cost: new fields.NumberField({ required: false, initial: 0 }),
         totalWeight: new fields.NumberField({ required: false, initial: 0 }),
         totalCost: new fields.NumberField({ required: false, initial: 0 }),
         containerId: new fields.StringField({ required: false, initial: "" }),
         // Fields from the "equippable" template
         equipped: new fields.BooleanField({ required: false, initial: false }),
         // Additional properties specific to the "item" type
         container: new fields.BooleanField({ required: false, initial: false }),
         isOpen: new fields.BooleanField({ required: false, initial: false }),
         equippable: new fields.BooleanField({ required: false, initial: false }),
         // Indicates why type of fuel this item is, if any.
         fuelType: new fields.StringField({ required: false, initial: "" }),
         ammoType: new fields.StringField({ required: false, initial: "" }),
         isAmmo: new fields.BooleanField({ required: false, initial: false }),
         unidentifiedName: new fields.StringField({ required: false, initial: "" }),
         unidentifiedDesc: new fields.StringField({ required: false, initial: "" }),
         isIdentified: new fields.BooleanField({ required: false, initial: true }),
         isCursed: new fields.BooleanField({ required: false, initial: false }),
         isCarried: new fields.BooleanField({ required: true, initial: true }),
         // Items with associated actions
         savingThrow: new fields.StringField({ nullable: true, initial: null }),
         dmgFormula: new fields.StringField({ nullable: true, initial: null }),
         healFormula: new fields.StringField({ nullable: true, initial: null }),
         damageType: new fields.StringField({ required: false, initial: "" }),
         isUsable: new fields.BooleanField({ required: true, initial: false }),
         // Is the item considered to be treasure when calculating encumbrance.
         // Yes, even though not item.type='treasure'.
         isTreasure: new fields.BooleanField({ required: true, initial: false }),
      };
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
      this.isAmmo = this.ammoType?.length > 0;
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
      if (this.quantity === 0) {
         this.equipped = false;
      }

      if (this.chargesMax === null) {
         this.charges = 1;
      } else {
         this.charges = Math.min(this.charges, this.chargesMax);
      }

      // This allows for items to be usable even if there is no saving throw, damage formula or healing formula specified.
      // The purpose for making an item usable anyways, is that the usage would be tracked.
      this.isUsable = this.isUsable ||  (this.savingThrow || this.dmgFormula || this.healFormula)?.length > 0 || this.chargesMax > 0 || this.chargesMax === null;
   }  
}