/** 
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class fadeActor extends Actor {
   /** @override */
   async _preCreate(data, options, userId) {
      const allowed = await super._preCreate(data, options, userId);

      const changeData = {};

      switch (this.type) {
         case "character":
            Object.assign(changeData, {
               "prototypeToken.sight": {
                  "enabled": true,
                  "visonMode": "basic",
               },
               "prototypeToken.disposition": CONST.TOKEN_DISPOSITIONS.FRIENDLY,
               "prototypeToken.actorLink": true,
               "prototypeToken.displayName": CONST.TOKEN_DISPLAY_MODES.HOVER
            });
            break;
         case "monster":
            break;
         case "npc":
            break;
      }

      await this.updateSource(changeData);

      return allowed;
   }

   /** @override */
   prepareData() {
      // Prepare data for the actor. Calling the super version of this executes
      // the following, in order: data reset (to clear active effects),
      // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
      // prepareDerivedData().
      super.prepareData();
   }

   /** @override */
   prepareBaseData() {
      // Data modifications in this step occur before processing embedded
      // documents or derived data.
   }

   /**
    * @override
    * Augment the actor source data with additional dynamic data. Typically,
    * you'll want to handle most of your calculated/derived data in this step.
    * Data calculated in this step should generally not exist in templates.
    */
   prepareDerivedData() {
      const actorData = this;
      const systemData = actorData.system;

      // Initialize attributes if missing
      systemData.attributes = systemData.attributes || {};

      // Initialize movement
      let movement = systemData.movement || {};
      movement.turn = movement.turn || 120;
      movement.round = Math.floor(movement.turn / 3);
      movement.day = Math.floor(movement.turn / 5);
      movement.run = movement.turn;
      systemData.movement = movement;

      // Initialize saving throws if missing
      systemData.savingThrows = systemData.savingThrows || {};
      const savingThrows = ["death", "wand", "paralysis", "breath", "spell"];
      savingThrows.forEach(savingThrow => {
         systemData.savingThrows[savingThrow] = systemData.savingThrows[savingThrow] || { value: 15 };
      });

      // Prepare each Actor type (character, npc, etc.) to keep things organized.
      this._prepareCharacterData(actorData);
      this._prepareNpcData(actorData);
   }

   _prepareAbilities(actorData) {
      // Make modifications to data here. For example:
      const systemData = actorData.system;

      // Initialize abilities if missing
      systemData.abilities = systemData.abilities || {};

      // Ensure all abilities have default values if missing
      const abilities = ["str", "dex", "con", "int", "wis", "cha"];
      abilities.forEach(ability => {
         systemData.abilities[ability] = systemData.abilities[ability] || { value: 10 };
      });
      
      // Access CONFIG for your system
      const adjustments = CONFIG.FADE.AdjustmentTable;
      // Loop through ability scores, and add their modifiers to our sheet output.
      for (let [key, ability] of Object.entries(systemData.abilities)) {
         let mod = adjustments[0].value;
         for (let item of adjustments) {
            if (ability.value <= item.max) {
               mod = item.value;
               break; // Break out of the loop once the correct modifier is found
            }
         }
         ability.mod = mod;
      }
   }

   _prepareArmorClass(actorData) {
      const systemData = actorData.system;

      // Base AC when no armor is equipped
      let baseAC = CONFIG.FADE.Armor.acNaked;
      systemData.ac.naked = baseAC;

      // Get all items and filter for equipped armor that is not a shield
      const equippedArmor = actorData.items.filter(item =>
         item.type === 'armor' && item.system.equipped && !item.system.isShield
      );

      // Find the best (lowest) armor AC from the equipped armor
      let armorAC = equippedArmor.reduce((currentBestAC, armor) => {
         const armorValue = armor.system.ac || currentBestAC;
         return Math.min(currentBestAC, armorValue);
      }, baseAC);

      // Get all equipped shields
      const equippedShields = actorData.items.filter(item =>
         item.type === 'armor' && item.system.equipped && item.system.isShield
      );

      // Calculate total shield AC by summing the AC values of all equipped shields
      let shieldAC = equippedShields.reduce((totalShieldAC, shield) => {
         return totalShieldAC + (shield.system.ac || 0);
      }, 0);

      // Final AC is the best armor AC minus the dex modifier minus the total shield AC
      systemData.ac.value = armorAC - systemData.abilities.dex.mod - shieldAC;
   }

   _prepareEncumbrance(actorData) {
      const systemData = actorData.system;
      systemData.encumbrance = systemData.encumbrance || {};
      let enc = 0;
      let max = CONFIG.FADE.Encumbrance.max;
      // Sum the weights of all items
      enc = actorData.items.reduce((sum, item) => {
         const itemWeight = item.system.weight || 0; // Default to 0 if weight is not defined
         const itemQuantity = item.system.quantity || 1; // Default to 1 if quantity is not defined
         return sum + (itemWeight * itemQuantity);
      }, 0);
      systemData.encumbrance.value = enc;
      systemData.encumbrance.max = max;

      const encTier = CONFIG.FADE.Encumbrance.table.find(tier => enc <= tier.max)
         || CONFIG.FADE.Encumbrance.table[CONFIG.FADE.Encumbrance.table.length - 1];
      // Set the label and movement for the current encumbrance tier
      systemData.encumbrance.label = encTier.label;
      systemData.encumbrance.mv = encTier.mv;
   }

   /**
    * Prepare Character type specific data
    */
   _prepareCharacterData(actorData) {
      if (actorData.type !== 'character') return;
      console.log("_prepareCharacterData");
      // Make modifications to data here. For example:
      const systemData = actorData.system;

      this._prepareAbilities(actorData);
      this._prepareArmorClass(actorData);
      this._prepareEncumbrance(actorData);

      // Initialize exploration tests if missing
      let explore = systemData.exploration || {};
      explore.openDoor = explore.openDoor || Math.min(5 - systemData.abilities.str.mod, 6);
      explore.secretDoor = explore.secretDoor || 1;
      explore.listenDoor = explore.listenDoor || 2;
      explore.findTrap = explore.findTrap || 1;
      systemData.exploration = explore;

      // Wrestling skill
      systemData.wrestling = Math.ceil(systemData.details.level / 2) + systemData.abilities.str.mod + systemData.abilities.dex.mod;
   }

   /**
    * Prepare NPC type specific data.
    */
   _prepareNpcData(actorData) {
      if (actorData.type !== 'npc') return;

      // Make modifications to data here. For example:
      const systemData = actorData.system;
      systemData.xp = systemData.cr * systemData.cr * 100;
   }

   /**
    * Override getRollData() that's supplied to rolls.
    */
   getRollData() {
      // Starts off by populating the roll data with a shallow copy of `this.system`
      const data = { ...this.system };

      // Ensure attributes are initialized
      data.attributes = data.attributes || {};

      // Prepare character roll data.
      this._getCharacterRollData(data);
      this._getNpcRollData(data);

      return data;
   }

   /**
    * Prepare character roll data.
    */
   _getCharacterRollData(data) {
      if (this.type !== 'character') return;

      // Copy the ability scores to the top level, so that rolls can use
      // formulas like `@str.mod + 4`.
      if (data.abilities) {
         for (let [k, v] of Object.entries(data.abilities)) {
            data[k] = foundry.utils.deepClone(v);
         }
      }

      // Add level for easier access, or fall back to 0.
      data.lvl = data.attributes.level?.value || 0;
   }

   /**
    * Prepare NPC roll data.
    */
   _getNpcRollData(data) {
      if (this.type !== 'npc') return;

      // Process additional NPC data here.
   }
}
