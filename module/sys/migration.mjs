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
   if (oldVer !== newVer) {
      console.log(`Migrating from version ${oldVer} to ${newVer}`);

      // Iterate over all actors in the game
      for (let actor of game.actors.contents) {
         try {
            // Remove unused properties
            if (actor.system["retainer "]) {
               delete actor.system["retainer "];
               await actor.update({ "system.-=retainer ": null });  // Use -= to remove key in Foundry updates
            }

            // If the actor has spells then make sure they are configured to be a spellcaster
            const spells = actor.items.filter((item) => item.type === 'spell');
            if (spells?.length > 0) {
               actor.system.config.isSpellcaster = true;
               await actor.update({ "system.config.isSpellcaster": actor.system.config.isSpellcaster });
            }

            // Convert spellSlots to array if it's not already an array
            if (actor.system?.spellSlots && !Array.isArray(actor.system?.spellSlots)) {
               let newSlots = Object.entries(actor.system?.spellSlots);
               actor.system.spellSlots = [];
               newSlots.forEach((slot) => {
                  actor.system.spellSlots.push(slot[1]);
               });
               await actor.update({ "system.spellSlots": actor.system.spellSlots });
            }
         } catch (error) {
            console.error(`Failed to migrate Actor ${actor.name}:`, error);
         }
      }

      // Set the new version after migration is complete
      //await game.settings.set(SYSTEM_ID, 'gameVer', newVer);
      console.log("FaDe migration complete.");
   }
};

