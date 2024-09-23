// actor-character.mjs
import { fadeActor } from './fadeActor.mjs';
import Formatter from '../utils/Formatter.mjs';

export class CharacterActor extends fadeActor {

   constructor(data, context) {
      /** Default behavior, just call super() and do all the default Item inits */
      super(data, context);
   }

   /** @override */
   prepareData() {
      super.prepareData();
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
      this._prepareAbilities();
      this._prepareExploration();
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
      this._prepareClassInfo();
      this._prepareEncumbrance();
      this._prepareWrestling();
   }

 /**
 * @override
 * Prepare all embedded Document instances which exist within this primary Document.
 * @memberof ClientDocumentMixin#
 * active effects are applied
 */
   prepareEmbeddedDocuments() {
      super.prepareEmbeddedDocuments();
   }

   /** @override */
   getRollData() {
      const data = super.getRollData();
      return data;
   }

   /** @override */
   async _onUpdate(changed, options, userId) {
      super._onUpdate(changed, options, userId);

      // Check if the class property has changed
      if (changed.system && changed.system.details && changed.system.details.class) {
         this._prepareClassInfo();
      }
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
         let adjustment = adjustments.find(item => ability.value <= item.max);
         ability.mod = adjustment ? adjustment.value : adjustments[0].value;
      }

      // Retainer
      systemData.retainer = systemData.retainer || {};
      systemData.retainer.max = 4 + systemData.abilities.cha.mod;
      systemData.retainer.morale = 5 + systemData.abilities.cha.mod;
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

   _prepareClassInfo() {
      const systemData = this.system;
      // Replace hyphen with underscore for "Magic-User"
      const classNameInput = systemData.details.class?.toLowerCase();
      const classLevel = systemData.details.level;
      const classes = CONFIG.FADE.Classes;
      let classData = null;

      // Find a match in the FADE.Classes data
      for (const [key, cdata] of Object.entries(classes)) {
         if (cdata.name.toLowerCase() === classNameInput) {
            // Class match found
            classData = cdata; // Return the matched class data
            break;
         }
      }

      if (classData !== null) {
         const currentLevel = classLevel;
         const levelData = classData.levels.find(level => level.level === currentLevel);
         const nextLevelData = classData.levels.find(level => level.level === currentLevel + 1);
         const nameLevel = classData.levels.find(level => level.level === 9);

         // Level Bonus
         const { pr5Count, pr10Count } = classData.primeReqs.reduce((counts, primeReq) => {
            const value = systemData.abilities[primeReq.ability].value;
            if (value >= primeReq.xpBonus5) counts.pr5Count++;
            if (value >= primeReq.xpBonus10) counts.pr10Count++;
            return counts;
         }, { pr5Count: 0, pr10Count: 0 });
         systemData.details.xp.bonus = pr10Count === classData.primeReqs.length ? 10 : pr5Count === classData.primeReqs.length ? 5 : 0;

         if (levelData) {
            systemData.hp.hd = levelData.hd;
            systemData.thac0.value = levelData.thac0;
            if (systemData.details.title == "" || systemData.details.title == null) {
               let ordinalized = Formatter.formatOrdinal(currentLevel);
               systemData.details.title = levelData.title === undefined ? `${ordinalized} Level ${nameLevel.title}` : levelData.title;
            }
         }
         if (nextLevelData) {
            systemData.details.xp.next = nextLevelData.xp;
         }
         systemData.details.species = classData.species;

         // Saving throws
         super.prepareSavingThrows(classNameInput, currentLevel);         
      }

      return classData; // Return null if no match found
   }

   _prepareWrestling() {
      // Wrestling skill
      const systemData = this.system;
      systemData.wrestling = Math.ceil(systemData.details.level / 2) + systemData.ac.value;
      systemData.wrestling += systemData.abilities.str.mod + systemData.abilities.dex.mod;
   }
}