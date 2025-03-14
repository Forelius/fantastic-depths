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
         charges: new fields.NumberField({ required: false, initial: null, nullable: true }),
         maxCharges: new fields.NumberField({ required: false, initial: null, nullable: true }),
         // Fields from the "physical" template
         quantity: new fields.NumberField({ required: false, initial: 1, nullable: true }),
         quantityMax: new fields.NumberField({ required: false, initial: 0, nullable: true }),
         weight: new fields.NumberField({ required: false, initial: 1 }),
         cost: new fields.NumberField({ required: false, initial: 0 }),
         totalWeight: new fields.NumberField({ required: false, initial: 0 }),
         totalCost: new fields.NumberField({ required: false, initial: 0 }),
         containerId: new fields.StringField({ required: false, initial: "" }),
         // Fields from the "equippable" template
         equipped: new fields.BooleanField({ required: false, initial: false }),
         // Additional properties specific to the "item" type
         container: new fields.BooleanField({ required: false, initial: false }),
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
   }  
}