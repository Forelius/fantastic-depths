/**
 * None or armor-only if used by itself.
 */
export class BasicEncumbrance {
   constructor(options) {
      this.options = options;
      this.CONFIG = {
         armorChoices: {
            none: "none",
            light: "light",
            heavy: "heavy"
         },
         maxMove: 120, // The default maximum movement rate per turn for an unencumbered character.
         maxLoad: 1600, // The default maximum load (cn) that a character can carry.
         tablePC: [
            { wtPortion: 6, mvFactor: 1.0, name: "unencumbered" },
            { wtPortion: 3, mvFactor: 0.75, name: "lightly" },
            { wtPortion: 2, mvFactor: 0.5, name: "moderately" },
            { wtPortion: 1, mvFactor: 0.25, name: "encumbered" },
            { wtPortion: 0, mvFactor: 0, name: "over" },
         ],
         tableMonster: [
            { wtPortion: 2, mvFactor: 1.0, name: "unencumbered" },
            { wtPortion: 1, mvFactor: 0.5, name: "moderately" },
            { wtPortion: 0, mvFactor: 0, name: "over" },
         ]
      };
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

   _getTotalEnc(actor) {
      return 0;
   }

   _getEncTier(actor, totalEnc) {
      let table;

      if (actor.type === 'monster') {
         table = this.CONFIG.tableMonster;
      } else {
         table = this.CONFIG.tablePC;
      }

      let result = table[0];
      if (this.options?.encSetting === 'basic') {
         const equippedArmor = actor.items.find(item => item.type === 'armor' && item.system.equipped === true);
         if (equippedArmor?.system.armorWeight === 'light') {
            result = table[1];
         } else if (equippedArmor?.system.armorWeight === 'heavy') {
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
      results.gearEnc = 80 + items.filter(item => item.type === 'treasure' || item.system.isTreasure === true).reduce((sum, item) => {
         const itemWeight = item.system.weight || 0;
         const itemQuantity = item.system.quantity || 1;
         return sum + (itemWeight * itemQuantity);
      }, 0);
      // Weapons
      results.weaponsEnc = items.filter(item => item.type === 'weapon').reduce((sum, item) => {
         return sum + (item.system.weight || 0);
      }, 0);
      // Armor
      results.armorEnc = items.filter(item => item.type === 'armor').reduce((sum, item) => {
         return sum + (item.system.weight || 0);
      }, 0);

      return results;
   }

   _getTotalEnc(actor) {
      return actor.items.filter(item => ['weapon', 'armor', 'treasure'].includes(item.type) || item.system.isTreasure === true)
         .reduce((sum, item) => {
            const itemWeight = item.system.weight > 0 ? item.system.weight : 0;
            const itemQuantity = item.system.quantity > 0 ? item.system.quantity : 0;
            return sum + (itemWeight * itemQuantity);
         }, 80);
   }

   _getEncTier(actor, totalEnc) {
      let table;
      if (actor.type === 'monster') {
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
      this.CONFIG.maxLoad = 2400;
      this.CONFIG.tablePC = [
         { wtPortion: 6, mvFactor: 1.0, name: "unencumbered" },
         { wtPortion: 3, mvFactor: 0.75, name: "lightly" },
         { wtPortion: 2, mvFactor: 0.5, name: "moderately" },
         { wtPortion: 1.5, mvFactor: 0.25, name: "encumbered" },
         { wtPortion: 1, mvFactor: 0.125, name: "heavily" },
         { wtPortion: 0, mvFactor: 0, name: "over" }
      ];
   }

   /**
    * Calculate encumbrance for different categories.
    * @param {any} items The items to calculate encumbrance with.
    */
   calcCategoryEnc(items) {
      const results = super.calcCategoryEnc(items);

      // Gear
      const itemTypes = ['item', 'light', 'treasure']
      results.gearEnc = items.filter(item => itemTypes.includes(item.type))
         .reduce((sum, item) => {
            const itemWeight = item.system.weight || 0;
            const itemQuantity = item.system.quantity || 1;
            return sum + (itemWeight * itemQuantity);
         }, 0);      

      return results;
   }

   _getTotalEnc(actor) {
      return actor.items.reduce((sum, item) => {
         const itemWeight = item.system.weight > 0 ? item.system.weight : 0;
         const itemQuantity = item.system.quantity > 0 ? item.system.quantity : 0;
         return sum + (itemWeight * itemQuantity);
      }, 0);
   }
}