/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class fadeItem extends Item {
   constructor(data, context) {
      super(data, context);
      //console.log(`Item constructor: type=${data.type}`, this.name, context, this?.actor);
   }

   /** @override */
   prepareDerivedData() {      
      super.prepareDerivedData();
      if (this.type === "item") {
         this.system.totalWeight = this.system.weight * this.system.quantity;
      }
   }

   /**
 * Augment the basic Item data model with additional dynamic data.
 */
   /** @override */
   prepareData() {
      // As with the actor class, items are documents that can have their data
      // preparation methods overridden (such as prepareBaseData()).
      super.prepareData();
      //console.log("Item prepareData:", this.name, this?.parent, this?.actor);
   }

   /**
    * Prepare a data object which defines the data schema used by dice roll commands against this Item
    * @override
    */
   getRollData() {
      // Starts off by populating the roll data with a shallow copy of `this.system`
      const rollData = { ...this.system };

      // Quit early if there's no parent actor
      if (!this.actor) return rollData;

      // If present, add the actor's roll data
      rollData.actor = this.actor.getRollData();

      return rollData;
   }

   /**
    * Handle clickable rolls.
    * @param {Event} event   The originating click event
    * @private
    */
   async roll() {
      const item = this;

      // Initialize chat data.
      const speaker = ChatMessage.getSpeaker({ actor: this.actor });
      const rollMode = game.settings.get('core', 'rollMode');
      const label = `[${item.type}] ${item.name}`;

      console.log("fadeItem.roll", item);

      // If there's no roll data, send a chat message.
      if (!this.system.formula) {
         ChatMessage.create({
            speaker: speaker,
            rollMode: rollMode,
            flavor: label,
            content: item.system.description ?? '',
         });
      }
      // Otherwise, create a roll and send a chat message from it.
      else {
         // Retrieve roll data.
         const rollData = this.getRollData();

         // Invoke the roll and submit it to chat.
         const roll = new Roll(rollData.formula, rollData);
         // If you need to store the value first, uncomment the next line.
         // const result = await roll.evaluate();
         roll.toMessage({
            speaker: speaker,
            rollMode: rollMode,
            flavor: label,
         });
         return roll;
      }
   }

   pushTag(value) {
      // Ensure the system data exists and initialize tags array if it doesn't exist
      const systemData = this.system;
      systemData.tags = systemData.tags || [];

      // Clean up the value and log the operation
      const trimmedValue = value;

      // Add the trimmed value to the tags array
      systemData.tags.push(trimmedValue);

      // Persist the updated data to Foundry's database
      return this.update({ "system.tags": systemData.tags });
   }

   popTag(value) {
      const systemData = this.system;

      // Ensure tags exist and are an array
      if (!systemData.tags || !Array.isArray(systemData.tags)) return;

      // Filter out the tag that matches the value (case-sensitive)
      const updatedTags = systemData.tags.filter(tag => tag !== value.trim());

      // Update the item's tags and persist the change
      return this.update({ "system.tags": updatedTags });
   }
}
