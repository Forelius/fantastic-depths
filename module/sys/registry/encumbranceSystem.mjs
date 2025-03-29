export class EncumbranceSystem {

   /**
    * Prepares the actor's encumbrance values. Supports optional settings for different encumbrance systems.
    * @param {any} actor
    */
   prepareDerivedData(actor) {
      const encSetting = game.settings.get(game.system.id, "encumbrance");
      let encumbrance = actor.system.encumbrance || {};
      let enc = 0;

      //-- Caclulate how much is being carried/tracked --//
      // If using detailed encumbrance, similar to expert rules...
      if (encSetting === 'expert' || encSetting === 'classic') {
         enc = actor.items.reduce((sum, item) => {
            const itemWeight = item.system.weight > 0 ? item.system.weight : 0;
            const itemQuantity = item.system.quantity > 0 ? item.system.quantity : 0;
            return sum + (itemWeight * itemQuantity);
         }, 0);
         encumbrance.value = enc || 0;
      }
      // Else if using simple encumbrance, similar to basic rules...
      else if (encSetting === 'basic') {
         encumbrance.value = 0;
      } else {
         encumbrance.value = 0;
      }

      //-- Calculate movement and label --//
      // If max encumbrace is set to zero...
      if (encumbrance.max === 0) {
         encumbrance.mv = actor.system.movement.max;
         encumbrance.fly = actor.system.flight.max;
      } else {
         this.#calculateEncMovement(actor, enc, encumbrance, encSetting);
      }

      actor.system.encumbrance = encumbrance;
   }

   /**
    * Calculate movement rate based on encumbrance.
    * @protected
    * @param {any} actorType The actor.type
    * @param {number} enc The total encumbrance in coins.
    * @param {any} encumbrance The encumbrance object to set.
    * @param {encSetting} The current encumbrance setting.
    */
   #calculateEncMovement(actor, enc, encumbrance, encSetting) {
      let weightPortion = actor.system.encumbrance.max / enc;
      let table = [];
      switch (actor.type) {
         case "monster":
            table = CONFIG.FADE.Encumbrance.monster;
            break;
         case "character":
            if (encSetting === 'classic' || encSetting === 'basic') {
               table = CONFIG.FADE.Encumbrance.classicPC;
            } else if (encSetting === 'expert') {
               table = CONFIG.FADE.Encumbrance.expertPC;
            }
            break;
      }

      if (table.length > 0) {
         let encTier = table.length > 0 ? table[0] : null;
         if (encSetting === 'basic') {
            if (actor.system.equippedArmor?.system.armorWeight === 'light') {
               encTier = table[1];
            } else if (actor.system.equippedArmor?.system.armorWeight === 'heavy') {
               encTier = table[2];
            }
         } else {
            encTier = table.find(tier => weightPortion >= tier.wtPortion) || table[table.length - 1];
         }

         if (encTier) {
            encumbrance.label = game.i18n.localize(`FADE.Actor.encumbrance.${encTier.name}.label`);
            encumbrance.desc = game.i18n.localize(`FADE.Actor.encumbrance.${encTier.name}.desc`);
            encumbrance.mv = Math.floor(actor.system.movement.max * encTier.mvFactor);
            encumbrance.fly = Math.floor(actor.system.flight.max * encTier.mvFactor);
         }
      }
   }
}