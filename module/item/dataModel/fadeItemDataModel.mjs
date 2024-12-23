/**
 * Data model for a generic item inheriting from multiple templates.
 */
export class fadeItemDataModel extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      const { fields } = foundry.data;
      return {
         // Fields from the "base" template
         tags: new fields.ArrayField(new fields.StringField({ required: false }), { initial: [] }),
         description: new fields.StringField({ required: false, initial: "" }),
         gm: new fields.SchemaField({
            notes: new fields.StringField({ required: false, initial: "" })
         }),

         // Fields from the "physical" template
         quantity: new fields.NumberField({ required: false, initial: 1 }),
         quantityMax: new fields.NumberField({ required: false, initial: 0 }),
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
         equippable: new fields.BooleanField({ required: false, initial: false })
      };
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
      this.totalWeight = Math.round((this.weight * this.quantity) * 100) / 100;
      this.totalCost = Math.round((this.cost * this.quantity) * 100) / 100;
   }   
}