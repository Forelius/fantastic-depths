import { SYSTEM_ID } from './config.mjs';

/**
 * Sets the current game version in the system settings.
 * Intended for future use to handle data schema migrations between different game versions.
 * The function currently sets the game version to the system's version, preparing for future checks
 * and potential migrations.
 */
export const migrateData = async function migrate() {
   const oldVer = game.settings.get(SYSTEM_ID, 'gameVer');
   const newVer = game.system.version;

   // Only proceed if a migration is needed
   if (true || oldVer < "0.4.7") {
      console.log(`Migrating from version ${oldVer} to ${newVer}`);

      // Iterate over all actors in the game
      for (let actor of game.actors.contents) {
         try {
            let updateData = {};

            // Remove unused properties
            if (actor.system["retainer "]) {  // Double-check the space after "retainer"
               updateData["system.-=retainer "] = null;  // Use -= to remove key in Foundry updates
            }

            // If the actor has spells, ensure they are configured as a spellcaster
            const spells = actor.items.filter((item) => item.type === 'spell');
            if (spells?.length > 0) {
               actor.system.config.isSpellcaster = true;
               updateData["system.config.isSpellcaster"] = true;
            }

            // Convert spellSlots to an array if it is not already an array
            if (actor.system?.spellSlots && !Array.isArray(actor.system?.spellSlots)) {
               let newSlots = Object.entries(actor.system?.spellSlots).map((slot) => slot[1]);
               updateData["system.spellSlots"] = newSlots;
            }

            // Migrate actor items
            for (let item of actor.items) {
               if (item.system["equippable"]) {
                  await item.update({ "system.-=equippable": null });  // Remove equippable
               }
               if (item.system["isEquippable"]) {
                  await item.update({ "system.-=isEquippable": null });  // Remove isEquippable
               }
            }

            // Perform batch update for actor system properties
            if (Object.keys(updateData).length > 0) {
               await actor.update(updateData);
            }

         } catch (error) {
            console.error(`Failed to migrate Actor ${actor.name}:`, error);
         }
      }

      // Migrate world items
      for (let item of game.items.contents) {
         try {
            let itemUpdateData = {};

            if (item.system["equippable"]) {
               itemUpdateData["system.-=equippable"] = null;  // Remove equippable
            }
            if (item.system["isEquippable"]) {
               itemUpdateData["system.-=isEquippable"] = null;  // Remove isEquippable
            }

            // Perform batch update for item system properties
            if (Object.keys(itemUpdateData).length > 0) {
               await item.update(itemUpdateData);
            }

         } catch (error) {
            console.error(`Failed to migrate item ${item.name}:`, error);
         }
      }
   }

   if (oldVer < "0.5.1") {
      console.log(`Migrating from version ${oldVer} to ${newVer}`);

      async function fixRollFormula(specialAbility, actorName = "World Item") {
         try {
            if (specialAbility.system.rollFormula === undefined || specialAbility.system.rollFormula === null) {
               // Set rollFormula to roll value and remove the old roll key in a single update call
               const updatedData = {
                  "system.rollFormula": specialAbility.system.roll,
                  "system.-=roll": null  // Remove roll key
               };
               await specialAbility.update(updatedData);
            }
         } catch (error) {
            console.error(`Failed to migrate special ability: ${specialAbility.name} (${actorName})`, error);
         }
      }

      // Iterate over all actors in the game
      for (let actor of game.actors) {
         // If the actor has spells then make sure they are configured to be a spellcaster
         const specialAbilities = actor.items.filter((item) => item.type === 'specialAbility');
         for (let specialAbility of specialAbilities) {
            await fixRollFormula(specialAbility, actor.name);
         }
      }

      // Fix world items
      const specialAbilities = game.items.filter((item) => item.type === 'specialAbility');
      for (let specialAbility of specialAbilities) {
         await fixRollFormula(specialAbility);
      }
   }

   // Set the new version after migration is complete
   await game.settings.set(SYSTEM_ID, 'gameVer', newVer);
   console.log("FaDe migration complete.");
};

