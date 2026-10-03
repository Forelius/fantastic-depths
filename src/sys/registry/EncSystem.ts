/**
 * None or armor-only if used by itself.
 */
export class BasicEncumbrance {
   options: { encSetting: string };;
   CONFIG: { tableMonster: null, tablePC: null, defaultGearEnc: 0 };

   constructor(options) {
      this.options = options;
      this.CONFIG = CONFIG.FADE.Encumbrance.Basic;
   }

   /**
    * Prepares an actor's encumbrance data.
    * @param {any} actor The actor who's encumbrance is being prepared
    */
   prepareDerivedData(actor) {
      const encumbrance: {
         value: number;
         max: number;
         label?: string;
         desc?: string;
      } = { value: 0, max: 0 };

      Object.assign(encumbrance, actor.system.encumbrance);

      // Recalc total encumbrance
      encumbrance.value = this._getTotalEnc(actor);

      const movement = actor.system.movement ?? { modifiers: {}, modes: [] };
      if (!movement.modifiers) movement.modifiers = {};

      // Default: no encumbrance scaling
      movement.modifiers.encumbrance = 1;

      //-- Calculate movement modifiers and label --//
      if (encumbrance.max > 0) {
         const encTier = this._getEncTier(actor, encumbrance.value);
         const encMove = this._calculateEncMovement(actor, encTier);
         encumbrance.label = encMove.label;
         encumbrance.desc = encMove.desc;
         if (encMove.factor != null) movement.modifiers.encumbrance = encMove.factor;
      }

      actor.system.movement = movement;
      actor.system.encumbrance = encumbrance;
   }

   /**
    * Calculate encumbrance for different categories.
    * @param {any} items The items to calculate encumbrance with.
    */
   // eslint-disable-next-line @typescript-eslint/no-unused-vars
   calcCategoryEnc(items) {
      return {};
   }

   /**
    * Calculated separately from totalEnc getter because some items may not be carried or this might
    * be an alternate encumbrance system that only counts certain items.
    * @param {any} actor
    * @returns
    */
   // eslint-disable-next-line @typescript-eslint/no-unused-vars
   _getTotalEnc(actor) {
      return 0;
   }

   // eslint-disable-next-line @typescript-eslint/no-unused-vars
   _getEncTier(actor, totalEnc) {
      let table;

      if (actor.type === "monster" || actor.type === "vehicle") {
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
    * Calculate movement modifiers based on encumbrance tier.
    * @protected
    * @param {any} actor The actor
    * @param {any} encTier
    * @returns {{ label: string, desc: string, factor?: number }}
    */
   _calculateEncMovement(actor, encTier) {
      return {
         label: game.i18n.localize(`FADE.Actor.encumbrance.${encTier.name}.label`),
         desc: game.i18n.localize(`FADE.Actor.encumbrance.${encTier.name}.desc`),
         factor: encTier.mvFactor ?? 1,
      };
   }
}

export class ClassicEncumbrance extends BasicEncumbrance {
   /**
    * Calculate encumbrance for different categories.
    * @param {any} items The items to calculate encumbrance with.
    */
   calcCategoryEnc(items) {
      const results = { gearEnc: 0, weaponsEnc: 0, ammoEnc: 0, armorEnc: 0 };

      // Gear
      results.gearEnc = this.CONFIG.defaultGearEnc + items.filter(item => item.type === "treasure" || item.system.isTreasure === true).reduce((sum, item) => {
         return sum + this._getItemEncumbrance(item);
      }, 0);
      // Weapons
      results.weaponsEnc = items.filter(item => item.type === "weapon").reduce((sum, item) => {
         return sum + this._getItemEncumbrance(item); // (item.system.weight || 0);
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
      if (actor.type === "monster" || actor.type === "vehicle") {
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
