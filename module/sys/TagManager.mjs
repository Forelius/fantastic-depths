export class TagManager {
   constructor(parentDocument) {
      this.parentDocument = parentDocument; // Store the reference to the parent document
   }

   pushTag(value) {
      const systemData = this.parentDocument.system; // Access the system via the document
      systemData.tags = systemData.tags || [];

      const trimmedValue = value.trim();
      if (!systemData.tags.includes(trimmedValue)) {
         systemData.tags.push(trimmedValue);
      }

      let updates = { "system.tags": systemData.tags };

      if (trimmedValue === "light" && !systemData.light) {
         updates["system.light"] = {
            duration: 6,
            radius: 30,
            fuel: "none",
            type: "torch"
         };
      }

      // Call update on the parent document
      return this.parentDocument.update(updates);
   }

   popTag(value) {
      const systemData = this.parentDocument.system; // Access the system via the document
      systemData.tags = systemData.tags || [];

      const index = systemData.tags.indexOf(value);
      if (index > -1) {
         systemData.tags.splice(index, 1);
      }

      let updates = { "system.tags": systemData.tags };

      if (value === "light") {
         updates["system.light"] = null;
      }

      // Call update on the parent document
      return this.parentDocument.update(updates);
   }
}
