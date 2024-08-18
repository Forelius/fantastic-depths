/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class fadeItem extends Item {
   constructor(data, context) {
      /** @see CONFIG.Item.documentClasses in module/scripts/configure-documents */
      if (data.type in CONFIG.Item.documentClasses && !context?.extended) {
         /**
          * When the constructor for the new class will call it's super(),
          * the extended flag will be true, thus bypassing this whole process
          * and resume default behavior
          */
         return new CONFIG.Item.documentClasses[data.type](data, {
            ...{ extended: true },
            ...context
         })
      }
      /** Default behavior, just call super() and do all the default Item inits */
      super(data, context)
   }

   /**
    * Augment the basic Item data model with additional dynamic data.
    */
   /** @override */
   prepareData() {
      // As with the actor class, items are documents that can have their data
      // preparation methods overridden (such as prepareBaseData()).
      super.prepareData();
   }

   /** @override */
   prepareDerivedData() {
      if (this.type === "item") {
         this.system.totalWeight = this.system.weight * this.system.quantity;
      }
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
}
