// actor-character.mjs
import { fadeActor } from './actor.mjs';

export class CharacterActor extends fadeActor {

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
      super.prepareBaseData();
      const systemData = this.system;
      systemData.details = systemData.details || {};
      this._prepareAbilities();
      this._prepareExploration();
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
      this._updateClassInfo(); 
      this._prepareArmorClass();
      this._prepareEncumbrance();

      // Wrestling skill
      const systemData = this.system;
      systemData.wrestling = Math.ceil(systemData.details.level / 2) + systemData.abilities.str.mod + systemData.abilities.dex.mod + systemData.ac.value;
   }

   /**
 * @override
 * Prepare all embedded Document instances which exist within this primary Document.
 * @memberof ClientDocumentMixin#
 * active effects are applied
 */
   prepareEmbeddedDocuments() {
      super.prepareEmbeddedDocuments();
      //console.log("CharacterActor.prepareEmbeddedDocuments", this);
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

   /** @override */
   async _onUpdate(changed, options, userId) {
      super._onUpdate(changed, options, userId);

      // Check if the class property has changed
      if (changed.system && changed.system.details && changed.system.details.class) {
         this._updateClassInfo(); 
      }
   }

   _updateClassInfo() {
      const systemData = this.system;
      const classNameInput = systemData.details.class.toLowerCase();
      const classes = CONFIG.FADE.Classes;
      let result = null;

      // Find a match in the FADE.Classes data
      for (const [key, classData] of Object.entries(classes)) {
         if (classData.name.toLowerCase() === classNameInput) {
            // Class match found
            result = classData; // Return the matched class data
            break;
         }
      }

      if (result !== null) {
         const currentLevel = systemData.details.level;
         const levelData = result.levels.find(level => level.level === currentLevel);
         const nextLevelData = result.levels.find(level => level.level === currentLevel + 1);
         const savesData = result.saves.find(save => currentLevel <= save.level);

         if (levelData) {
            systemData.hp.hd = levelData.hd;
            systemData.thac0.value = levelData.thac0;
         }
         if (nextLevelData) {
            systemData.details.xp.next = nextLevelData.xp;
         }
         if (savesData) {
            for (let saveType in systemData.savingThrows) {
               if (savesData.hasOwnProperty(saveType)) {
                  systemData.savingThrows[saveType].value = savesData[saveType];
               }
            }
         }
      }
            
      return result; // Return null if no match found
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
      systemData.ac.value = baseAC;
      systemData.ac.total = baseAC;
      systemData.ac.mod = 0;
      systemData.ac.shield = 0;

      const equippedArmor = this.items.find(item =>
         item.type === 'armor' && item.system.equipped && !item.system.isShield
      );
            
      const equippedShield = this.items.find(item =>
         item.type === 'armor' && item.system.equipped && item.system.isShield
      );

      // If an equipped armor is found
      if (equippedArmor) {
         systemData.ac.value = equippedArmor.system.ac;
         systemData.ac.mod = equippedArmor.system.mod ?? 0;
         systemData.ac.total = equippedArmor.system.totalAc - systemData.abilities.dex.mod;
         if (equippedShield) {
            systemData.ac.shield = equippedShield.system.ac + (equippedShield.system.ac.mod ?? 0);
            systemData.ac.total -= systemData.ac.shield;
         }         
      }
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