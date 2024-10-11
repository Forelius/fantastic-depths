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

      this._prepareDetails();
      this._prepareAbilities();
      this._prepareExploration();
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
      this._prepareDerivedAbilities();
      this._prepareDerivedMovement();
      this._prepareClassInfo();
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

   /**
    * get changes and send to GM
    * @param {any} updateData
    * @param {any} oldData - The old state of the actor before the update
    * @param {any} user
    * @param {any} parentKey
    * @returns
    */
   logActorChanges(updateData, oldData, user, type, parentKey = '') {
      let changes = [];
      const ignore = ["_stats", "_id", "flags"];

      if (type === "property") {
         for (let key in updateData) {
            const fullKey = parentKey ? `${parentKey}.${key}` : key;

            if (ignore.includes(fullKey) === false) {
               const oldValue = foundry.utils.getProperty(oldData, fullKey);
               const newValue = foundry.utils.getProperty(updateData, key);
               if (typeof newValue === 'object' && newValue !== null && !Array.isArray(newValue)) {
                  // Recursively log changes for nested objects
                  this.logActorChanges(newValue, oldData, user, type, fullKey);
               } else if (oldValue) {
                  changes.push({ field: fullKey, oldValue: oldValue, newValue: newValue });
               }
            }
         }
      } else {
         changes.push(updateData);
      }

      if (changes.length > 0) {
         this._sendChangeMessageToGM(changes, user, type);
      }

      return changes;  // This allows recursion to accumulate changes
   }

   // Helper function to send a change message to the GM
   _sendChangeMessageToGM(changes, user, type) {
      let changeDescs = null;
      if (type === "property") {
         changeDescs = changes.map(change => {
            return `${change.field}: <strong>${change.newValue}</strong>`;
         }).join("<br>");
      } else if (type === "addItem") {
         const item = changes[0];
         changeDescs = `Added ${item.type}: ${item.name}`;
      } else if (type === "deleteItem") {
         const item = changes[0];
         changeDescs = `Removed ${item.type}: ${item.name}`;
      }

      if (changeDescs) {
         // Create a chat message only visible to the GM
         ChatMessage.create({
            user: game.user.id,
            content: `<p>Player ${user.name} updated ${this.name}:</p><p>${changeDescs}</p>`,
            whisper: ChatMessage.getWhisperRecipients("GM"), // Whisper to all active GMs
         });
      }
   }

   /**
    * @override
    * @param {any} changed
    * @param {any} options
    * @param {any} userId
    */
   _onUpdate(changed, options, userId) {
      super._onUpdate(changed, options, userId);

      // Check if the class property has changed
      //if (changed.system && changed.system.details && changed.system.details.class) {
      //   console.log("CharacterActor._onUpdate");
      //   this._prepareClassInfo();         
      //}
   }

   _prepareDetails() {
      let systemData = this.system;
      systemData.details.level = systemData.details.level || 0;
      systemData.details.xp = systemData.details.xp || {};
      systemData.details.xp.value = systemData.details.xp.value || 0;
      systemData.details.xp.bonus = systemData.details.xp.bonus || 0;
      systemData.details.xp.next = systemData.details.xp.next || 0;
      systemData.details.class = systemData.details.class || "Fighter";
      systemData.details.species = systemData.details.species || "";
      systemData.details.alignment = systemData.details.alignment || "Neutral";
      systemData.details.title = systemData.details.title || "";
      systemData.details.age = systemData.details.age || 18;
      systemData.details.sex = systemData.details.sex || "";
      systemData.details.height = systemData.details.height || "";
      systemData.details.weight = systemData.details.weight || "";
      systemData.details.eyes = systemData.details.eyes || "";
      systemData.details.hair = systemData.details.hair || "";
      systemData.details.deathCount = systemData.details.deathCount || 0;
   }

   _prepareAbilities() {
      const systemData = this.system;

      // Initialize abilities if missing
      let abilities = systemData.abilities || {};

      const abilityTypes = ["str", "int", "wis", "dex", "con", "cha"];
      // Create a new ordered abilities object
      const orderedAbilities = {};
      abilityTypes.forEach(ability => {
         // Ensure each ability has a default value if missing
         orderedAbilities[ability] = abilities[ability] || { value: 10 };
      });

      // Replace the original abilities object with the ordered one
      systemData.abilities = orderedAbilities;
   }

   _prepareDerivedAbilities() {
      const systemData = this.system;
      // Initialize abilities if missing
      const abilityTypes = ["str", "int", "wis", "dex", "con", "cha"];
      const adjustments = CONFIG.FADE.AdjustmentTable;
      for (let [key, ability] of Object.entries(systemData.abilities)) {
         let adjustment = adjustments.find(item => ability.value <= item.max);
         ability.mod = adjustment ? adjustment.value : adjustments[0].value;
      }

      // Retainer
      let charisma = systemData.abilities.cha.value;
      let adjustment = adjustments.find(item => charisma <= item.max);
      let retainer = systemData.retainer || {};
      retainer.max = adjustment.maxRetainers;
      retainer.morale = adjustment.retainerMorale;
      systemData.retainer = retainer;
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
      let details = systemData.details || {};
      // Replace hyphen with underscore for "Magic-User"
      const classNameInput = details.class?.toLowerCase();
      const classLevel = details.level;
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
         details.xp.bonus = pr10Count === classData.primeReqs.length ? 10 : pr5Count === classData.primeReqs.length ? 5 : 0;

         if (levelData) {
            systemData.hp.hd = levelData.hd;
            systemData.thac0.value = levelData.thac0;

            if (details.title == "" || details.title == null) {
               let ordinalized = Formatter.formatOrdinal(currentLevel);
               details.title = levelData.title === undefined ? `${ordinalized} Level ${nameLevel.title}` : levelData.title;
            }
         }
         if (nextLevelData) {
            details.xp.next = nextLevelData.xp;
         }
         details.species = classData.species;

         systemData.details = details;
         
         // Saving throws
         super._prepareSavingThrows(classNameInput, currentLevel);
      }

      return classData; // Return null if no match found
   }

   _prepareWrestling() {
      // Wrestling skill
      const systemData = this.system;
      let wrestling = systemData.wrestling || {};
      wrestling = Math.ceil(systemData.details.level / 2) + systemData.ac.value;
      wrestling += systemData.abilities.str.mod + systemData.abilities.dex.mod;
      systemData.wrestling = wrestling;
   }   
}