import { FDItem } from './FDItem.mjs';

export class AmmoItem extends FDItem {
   constructor(data, context) {
      /** Default behavior, just call super() and do all the default Item inits */
      super(data, context);
   }

   get hasTargets() {
      return false;
   }

   get ownerToken() {
      //console.debug(`Get ownerToken ${this.name} (${this.actor?.name}/${this.parent.name})`);
      return this.actor ? this.actor.currentActiveToken : null;
   }

   get isContained() {
      return this.system.containerId?.length > 0;
   }

   /** A getter for dynamically calculating the total weight of this item, including contained items. */
   get totalEnc() {
      let result = 0;
      let weight = this.system.weight ?? 0;
      if (this.system.equipped) {
         weight = this.system.weightEquipped ?? 0;
      }
      const quantity = this.system.quantity > 0 ? this.system.quantity : 0;
      result += weight * quantity;
      return result;
   }

   get isDropped() {
      let current = this;
      let result = false;
      while (current) {
         if (current.system.isDropped) {
            result = true;
            current = null;
         } else if (this.actor && current.system.containerId) {
            current = this.actor.items.get(current.system.containerId);
         } else {
            current = null;
         }
      }
      return result;
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
      if (this.system.quantity !== undefined) {
         const qty = this.system.quantity > 0 ? this.system.quantity : 0;
         this.system.totalWeight = Math.round((this.system.weight * qty) * 100) / 100;
         //console.debug(`${this.actor?.name}: ${this.name} total weight: ${this.system.totalWeight} (${qty}x${this.system.weight})`);
         this.system.totalCost = Math.round((this.system.cost * qty) * 100) / 100;
      }
      // This can't be in data model, because name is a property of Item.
      this.system.unidentifiedName = this.system.unidentifiedName ?? this.name;
   }

   async getInlineDescription() {
      // TODO: Remove after v12 support.
      const textEditorImp = foundry?.applications?.ux?.TextEditor?.implementation ? foundry.applications.ux.TextEditor.implementation : TextEditor;

      let description = this.system.isIdentified === true ?
         await super.getInlineDescription()
         : await textEditorImp.enrichHTML(this.system.unidentifiedDesc, {
            secrets: false,
            // Necessary in v11, can be removed in v12
            async: true,
            rollData: this.getRollData(),
            // Relative UUID resolution
            relativeTo: this.actor,
         });
      if (description?.length <= 0) {
         description = '--';
      }
      return description;
   }
}