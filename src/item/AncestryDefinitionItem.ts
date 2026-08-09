import { FDItem } from "./FDItem.js";
import { TagManager } from "../sys/TagManager.js";

export class AncestryDefinitionItem extends FDItem {
   static ValidItemTypes = ["item", "weapon", "armor"];
   languageManager: TagManager;

   constructor(data, context) {
      super(data, context);
      this.languageManager = new TagManager(this, "languages"); // Initialize TagManager
   }

   async createClass() {
      // Retrieve the array
      const item = this.system.classes || [];
      // Define the new data
      const newItem = {
         name: "",
         maxLevel: 1
      };
      // Add the new item to the array
      item.push(newItem);
      await this.update({ "system.classes": item });
   }

   /**
    * Ancestry items are things like gear items. It is not referring to actor ancestry.
    * @param {any} name
    * @param {any} type
    */
   async createItem(name = "", type = null) {
      // Retrieve the array
      const items = this.system.ancestryItems || [];

      // Define the new data
      const newItem = {
         level: 1,
         name,
         type,
         changes: ""
      };

      // Add the new item to the array
      items.push(newItem);
      await this.update({ "system.ancestryItems": items });
   }
}

