/**
 * Data model for a generic item inheriting from multiple templates.
 */
export class fadeItemDataModel extends foundry.abstract.TypeDataModel {
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
         quantity: new fields.NumberField({ required: false, initial: 1, nullable: true }),
         quantityMax: new fields.NumberField({ required: false, initial: 0, nullable: true }),
         weight: new fields.NumberField({ required: false, initial: 0 }),
         cost: new fields.NumberField({ required: false, initial: 0 }),
         totalWeight: new fields.NumberField({ required: false, initial: 0 }),
         totalCost: new fields.NumberField({ required: false, initial: 0 }),
         containerId: new fields.StringField({ required: false, initial: "" }),
         // Fields from the "equippable" template
         equipped: new fields.BooleanField({ required: false, initial: false }),
         // Additional properties specific to the "item" type
         treasure: new fields.BooleanField({ required: false, initial: false }),
         container: new fields.BooleanField({ required: false, initial: false }),
         equippable: new fields.BooleanField({ required: false, initial: false }),
         fuelType: new fields.StringField({ required: false, initial: "" }),
         ammoType: new fields.StringField({ required: false, initial: "" }),
         isAmmo: new fields.BooleanField({ required: false, initial: false }),
         unidentifiedName: new fields.StringField({ required: false, initial: "" }),
         unidentifiedDesc: new fields.StringField({ required: false, initial: "" }),
         isIdentified: new fields.BooleanField({ required: false, initial: true }),
         isCursed: new fields.BooleanField({ required: false, initial: false }),
      };
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
      this.unidentifiedDesc = this.unidentifiedDesc === '' ? this.description : this.unidentifiedDesc;
      if (this.quantity === 0) {
         this.equipped = false;
      }
      const qty = this.quantity > 0 ? this.quantity : 1;
      this.totalWeight = Math.round((this.weight * qty) * 100) / 100;
      this.totalCost = Math.round((this.cost * qty) * 100) / 100;
      this.isAmmo = this.ammoType?.length > 0;
   }
}