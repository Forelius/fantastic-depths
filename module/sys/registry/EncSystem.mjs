export class EncumbranceInterface {
   async calcCategoryEnc(items) { throw new Error("Method not implemented."); }
   async prepareDerivedData(actor) { throw new Error("Method not implemented."); }
}

/**
 * None or armor-only if used by itself.
 */
export class BasicEncumbrance extends EncumbranceInterface {
   constructor(options) {
      super(options);
      this.options = options;
      this.CONFIG = CONFIG.FADE.Encumbrance.Basic;
   }

   /**
    * Prepares an actor's encumbrance data.
    * @param {any} actor The actor who's encumbrance is being prepared
    */
   prepareDerivedData(actor) {
      let encumbrance = {};
      Object.assign(encumbrance, actor.system.encumbrance);
      Object.assign(encumbrance, {
         mv: actor.system.movement.max,
         mv2: actor.system.movement2.max
      });

      // Recalc total encumbrance
      encumbrance.value = this._getTotalEnc(actor);

      //-- Calculate movement and label --//
      // If max encumbrace is set to zero...
      if (encumbrance.max !== 0) {
         const encTier = this._getEncTier(actor, encumbrance.value);
         Object.assign(encumbrance, this._calculateEncMovement(actor, encTier));
      }

      actor.system.encumbrance = encumbrance;
   }

   /**
    * Calculate encumbrance for different categories.
    * @param {any} items The items to calculate encumbrance with.
    */
   calcCategoryEnc(items) {
      return {};
   }

   /**
    * Calculated separately from totalEnc getter because some items may not be carried or this might
    * be an alternate encumbrance system that only counts certain items.
    * @param {any} actor
    * @returns
    */
   _getTotalEnc(actor) {
      return 0;
   }

   _getEncTier(actor, totalEnc) {
      let table;

      if (actor.type === "monster") {
         table = this.CONFIG.tableMonster;
      } else {
         table = this.CONFIG.tablePC;
      }

      let result = table[0];
      if (this.options?.encSetting === "basic") {
         const equippedArmor = actor.items.find(item => item.type === "armor" && item.system.equipped === true);
         if (equippedArmor?.system.armorWeight === "light") {
            result = table[1];
         } else if (equippedArmor?.system.armorWeight === "heavy") {
            result = table[2];
         }
      }

      return result;
   }

   /**
    * Calculate movement rate based on encumbrance tier.
    * @protected
    * @param {any} actor The actor
    * @param {number} encTier
    */
   _calculateEncMovement(actor, encTier) {
      return {
         label: game.i18n.localize(`FADE.Actor.encumbrance.${encTier.name}.label`),
         desc: game.i18n.localize(`FADE.Actor.encumbrance.${encTier.name}.desc`),
         mv: Math.floor(actor.system.movement.max * encTier.mvFactor),
         mv2: Math.floor(actor.system.movement2.max * encTier.mvFactor)
      };
   }
}

export class ClassicEncumbrance extends BasicEncumbrance {
   /**
    * Calculate encumbrance for different categories.
    * @param {any} items The items to calculate encumbrance with.
    */
   calcCategoryEnc(items) {
      const results = {};

      // Gear
      results.gearEnc = this.CONFIG.defaultGearEnc + items.filter(item => item.type === "treasure" || item.system.isTreasure === true).reduce((sum, item) => {
         return sum + this._getItemEncumbrance(item);
      }, 0);
      // Weapons
      results.weaponsEnc = items.filter(item => item.type === "weapon").reduce((sum, item) => {
         return sum + (item.system.weight || 0);
      }, 0);
      // Ammo
      results.ammoEnc = items.filter(item => item.type === "ammo").reduce((sum, item) => {
         return sum + this._getItemEncumbrance(item);
      }, 0);
      // Armor
      results.armorEnc = items.filter(item => item.type === "armor").reduce((sum, item) => {
         return sum + (item.system.weight || 0);
      }, 0);

      return results;
   }

   /**
    * Calculated separately from totalEnc getter because some items may not be carried or this might
    * be an alternate encumbrance system that only counts certain items.
    * @param {any} actor
    * @returns
    */
   _getTotalEnc(actor) {
      return actor.items.filter(item => ["weapon", "ammo", "armor", "treasure"].includes(item.type) || item.system.isTreasure === true)
         .reduce((sum, item) => {
            return sum + this._getItemEncumbrance(item);
         }, this.CONFIG.defaultGearEnc);
   }

   _getItemEncumbrance(item) {
      let result = 0;
      if (item.isDropped === false) {
         let itemWeight = 0;
         if (item.system.equipped === true) {
            itemWeight = item.system.weightEquipped ?? 0;
         } else if (item.system.weight > 0) {
            itemWeight = item.system.weight;
         }
         const itemQuantity = item.system.quantity > 0 ? item.system.quantity : 0;
         result = (itemWeight * itemQuantity);
      }
      return result;
   }

   _getEncTier(actor, totalEnc) {
      let table;
      if (actor.type === "monster") {
         table = this.CONFIG.tableMonster;
      } else {
         table = this.CONFIG.tablePC;
      }
      const weightPortion = actor.system.encumbrance.max / totalEnc;
      return table.find(tier => weightPortion >= tier.wtPortion) || table[table.length - 1];
   }
}

export class ExpertEncumbrance extends ClassicEncumbrance {
   constructor(options) {
      super(options);
      this.CONFIG = CONFIG.FADE.Encumbrance.Expert;
   }

   /**
    * Calculate encumbrance for different categories.
    * @param {any} items The items to calculate encumbrance with.
    */
   calcCategoryEnc(items) {
      const results = super.calcCategoryEnc(items);
      // Gear
      const itemTypes = ["item", "light", "treasure", "ammo"]
      results.gearEnc = items.filter(item => itemTypes.includes(item.type))
         .reduce((sum, item) => {
            return sum + this._getItemEncumbrance(item);
         }, 0);
      return results;
   }

   /**
    * Calculated separately from totalEnc getter because some items may not be carried or this might
    * be an alternate encumbrance system that only counts certain items.
    * @param {any} actor
    * @returns
    */
   _getTotalEnc(actor) {
      return actor.items.reduce((sum, item) => {
         return sum + this._getItemEncumbrance(item);
      }, 0);
   }
}