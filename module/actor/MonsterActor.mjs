// actor-character.mjs
import { fadeActor } from './fadeActor.mjs';
import { TagManager } from '../sys/TagManager.mjs';

export class MonsterActor extends fadeActor {

   constructor(data, context) {
      /** Default behavior, just call super() and do all the default Item inits */
      super(data, context);
      this.tagManager = new TagManager(this); // Initialize TagManager
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
      const systemData = this.system;

      systemData.details = systemData.details || {};
      systemData.details.xpAward = !isNaN(systemData.details.xpAward) ? systemData.details.xpAward : 5;
      systemData.details.abilityCount = !isNaN(systemData.details.abilityCount) ? systemData.details.abilityCount : 0;
      systemData.details.intelligence = systemData.details.intelligence || 6;
      systemData.details.size = systemData.details.size || "M";
      systemData.details.monsterType = systemData.details.monsterType || "Monster (Common)";
      systemData.details.attacks = systemData.details.attacks || 1;
      systemData.details.alignment = systemData.details.alignment || "Chaotic";
      systemData.thac0.value = systemData.thac0.value ?? 19;
      systemData.na = systemData.na || {};
      systemData.na.wandering = systemData.na.wandering || "1d4";
      systemData.na.lair = systemData.na.lair || "1d6";

      systemData.treasure = systemData.treasure || "";
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
      this._prepareWrestling();
      this._prepareSavingThrows();
   }

   _prepareWrestling() {
      // Wrestling skill
      const systemData = this.system;
      const hitDice = systemData.hp.hd?.match(/^\d+/)[0];
      let wrestling = systemData.ac.value;
      if (hitDice) {
         wrestling = Math.ceil(hitDice * 2) + systemData.ac.value;
      }
      systemData.wrestling = wrestling;
   }

   _prepareSavingThrows() {
      const systemData = this.system;
      const saveAs = systemData.details.saveAs ?? null;
      if (saveAs) {
         // Extract class identifier and level from the input
         const classId = saveAs[0].toLowerCase(); // First character as class identifier
         const level = parseInt(saveAs.slice(1)); // Remaining part as level

         // Find the class whose key starts with the classId
         const classKey = Object.keys(CONFIG.FADE.Classes).find(key => key[0].toLowerCase() === classId);

         if (classKey !== undefined && isNaN(level) == false) {
            super._prepareSavingThrows(classKey, level);
         }
      }
   }

   /**
    * @override
    * Calculate average hitpoints based on hitdice.
    */
   _prepareHitPoints() {
      super._prepareHitPoints();
      const systemData = this.system;

      if (systemData.hp.max == 0) {
         let hd = systemData.hp.hd;

         // Regular expression to check for a dice specifier like d<number>
         const diceRegex = /d(\d+)/;
         // Regular expression to capture the base number and any modifiers (+, -, *, /) that follow
         const modifierRegex = /([+\-*/]\d+)$/;

         const match = hd.match(diceRegex);
         let dieSides = 8;
         if (match) {
            dieSides = parseInt(match[1], 10);
         } else {
            dieSides = 8;
         }

         // If no dice specifier is found, check if there's a modifier like +1, *2, etc.
         let base = hd.replace(modifierRegex, ''); // Extract base number
         let modifier = hd.match(modifierRegex)?.[0] || 0; // Extract modifier (if any)
         base = parseInt(base);
         modifier = parseInt(modifier, 10);

         systemData.hp.value = Math.ceil((((dieSides + 1) / 2) + modifier) * base);
         systemData.hp.max = systemData.hp.value;
      }
   }
}