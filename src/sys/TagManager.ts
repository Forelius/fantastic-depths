export class TagManager {
   parentDocument: any;
   property: string;
   constructor(parentDocument, tagProperty='tags') {
      this.parentDocument = parentDocument; // Store the reference to the parent document
      this.property = tagProperty;
   }

   pushTag(value) {
      const systemData = this.parentDocument.system; // Access the system via the document
      systemData[this.property] = systemData[this.property] || [];

      const trimmedValue = value.trim();
      if (!systemData[this.property].includes(trimmedValue)) {
         systemData[this.property].push(trimmedValue);
      }

      const propertyName = `system.${this.property}`;
      let updates = {};
      updates[propertyName] = systemData[this.property];

      // Call update on the parent document
      return this.parentDocument.update(updates);
   }

   popTag(value) {
      const systemData = this.parentDocument.system; // Access the system via the document
      systemData[this.property] = systemData[this.property] || [];

      const index = systemData[this.property].indexOf(value);
      if (index > -1) {
         systemData[this.property].splice(index, 1);
      }
      const propertyName = `system.${this.property}`;
      let updates = {};
      updates[propertyName] = systemData[this.property];

      // Call update on the parent document
      return this.parentDocument.update(updates);
   }
}