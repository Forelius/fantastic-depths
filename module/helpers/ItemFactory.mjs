export class ItemFactory {
   static createItem(data, context) {
      // Determine the appropriate item class based on the item type
      const ItemClass = CONFIG.Item.documentClasses[data.type] || fadeItem;
      // Return a new instance of the appropriate item class
      return new ItemClass(data, context);
   }
}