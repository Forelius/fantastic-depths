// actor-character.mjs
import { fadeActor } from './actor.mjs';

export class characterActor extends fadeActor {

   constructor(data, context) {
     /** Default behavior, just call super() and do all the default Item inits */
      super(data, context)
   }

   /** @override */
   prepareData() {
      super.prepareData();
   }

   /** @override */
   prepareBaseData() {
      if (this.type === "character") {
         console.log("characterActor.prepareBaseData called");
      }
      super.prepareBaseData();
      this._prepareAbilities();
      this._prepareExploration();
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
      this._prepareArmorClass();
      this._prepareEncumbrance();

      // Wrestling skill
      const systemData = this.system;
      systemData.wrestling = Math.ceil(systemData.details.level / 2) + systemData.abilities.str.mod + systemData.abilities.dex.mod;
   }

   /** @override */
   getRollData() {
      const data = super.getRollData();

      // Copy the ability scores to the top level for character rolls
      if (data.abilities) {
         for (let [k, v] of Object.entries(data.abilities)) {
            data[k] = foundry.utils.deepClone(v);
         }
      }

      // Add level for easier access
      data.lvl = data.attributes?.level?.value || 0;

      return data;
   }

   _prepareAbilities() {
      const systemData = this.system;

      // Initialize abilities if missing
      systemData.abilities = systemData.abilities || {};

      const abilities = ["str", "dex", "con", "int", "wis", "cha"];
      abilities.forEach(ability => {
         systemData.abilities[ability] = systemData.abilities[ability] || { value: 10 };
      });

      const adjustments = CONFIG.FADE.AdjustmentTable;
      for (let [key, ability] of Object.entries(systemData.abilities)) {
         let mod = adjustments[0].value;
         for (let item of adjustments) {
            if (ability.value <= item.max) {
               mod = item.value;
               break;
            }
         }
         ability.mod = mod;
      }
   }

   _prepareArmorClass() {
      const systemData = this.system;

      let baseAC = CONFIG.FADE.Armor.acNaked;
      systemData.ac.naked = baseAC;

      const equippedArmor = this.items.filter(item =>
         item.type === 'armor' && item.system.equipped && !item.system.isShield
      );

      let armorAC = equippedArmor.reduce((currentBestAC, armor) => {
         const armorValue = armor.system.ac || currentBestAC;
         return Math.min(currentBestAC, armorValue);
      }, baseAC);

      const equippedShields = this.items.filter(item =>
         item.type === 'armor' && item.system.equipped && item.system.isShield
      );

      systemData.ac.shield = equippedShields.reduce((totalShieldAC, shield) => {
         return totalShieldAC + (shield.system.ac || 0);
      }, 0);

      systemData.ac.value = armorAC - systemData.abilities.dex.mod - systemData.ac.shield;
   }

   _prepareEncumbrance() {
      const systemData = this.system;
      systemData.encumbrance = systemData.encumbrance || {};
      let enc = 0;
      let max = CONFIG.FADE.Encumbrance.max;

      enc = this.items.reduce((sum, item) => {
         const itemWeight = item.system.weight || 0;
         const itemQuantity = item.system.quantity || 1;
         return sum + (itemWeight * itemQuantity);
      }, 0);
      systemData.encumbrance.value = enc;
      systemData.encumbrance.max = max;

      const encTier = CONFIG.FADE.Encumbrance.table.find(tier => enc <= tier.max)
         || CONFIG.FADE.Encumbrance.table[CONFIG.FADE.Encumbrance.table.length - 1];

      systemData.encumbrance.label = encTier.label;
      systemData.encumbrance.mv = encTier.mv;
   }

   _prepareExploration() {
      const systemData = this.system;
      let explore = systemData.exploration || {};
      explore.openDoor = explore.openDoor || Math.min(5 - systemData.abilities.str.mod, 6);
      explore.secretDoor = explore.secretDoor || 1;
      explore.listenDoor = explore.listenDoor || 2;
      explore.findTrap = explore.findTrap || 1;
      systemData.exploration = explore;
   }
}