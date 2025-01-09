import { SYSTEM_ID } from './config.mjs';

/**
 * Sets the current game version in the system settings.
 * Intended for future use to handle data schema migrations between different game versions.
 * The function currently sets the game version to the system's version, preparing for future checks
 * and potential migrations.
 */
class MySystemVersion {
   constructor(version) {
      this.version = version;
      let split = version?.split('.');
      this.major = parseInt(split[0]) ?? 0;
      this.minor = parseInt(split[1]) ?? 0;
      this.build = parseInt(split[2]) ?? 0;
   }

   /**
    * Is this version greater than the specified version
    * @param {any} version
    */
   gt(version) {
      if (!(version instanceof MySystemVersion)) {
         version = new MySystemVersion(version); // Normalize input
      }
      return (
         this.major > version.major ||
         (this.major === version.major && this.minor > version.minor) ||
         (this.major === version.major && this.minor === version.minor && this.build > version.build)
      );
   }

   lt(version) {
      if (!(version instanceof MySystemVersion)) {
         version = new MySystemVersion(version); // Normalize input
      }
      return (
         this.major < version.major ||
         (this.major === version.major && this.minor < version.minor) ||
         (this.major === version.major && this.minor === version.minor && this.build < version.build)
      );
   }
}

export class DataMigrator {
   constructor() {
      this.oldVersion = new MySystemVersion(game.settings.get(SYSTEM_ID, 'gameVer'));
      this.newVersion = new MySystemVersion(game.system.version);
   }

   async migrate() {
      console.debug("FADE Migrate", this.oldVersion, this.newVersion);

      if (this.oldVersion.lt(new MySystemVersion("0.6.14"))) {
         await this.fixBreathWeapons();
      }
      if (this.oldVersion.lt(new MySystemVersion("0.7.18"))) {
         await this.fixLightItems();
      }
      if (this.oldVersion.lt(new MySystemVersion("0.7.20-rc.1"))) {
         //await this.fixAmmoItems();
      }
      // Set the new version after migration is complete
      await game.settings.set(SYSTEM_ID, 'gameVer', game.system.version);
   }

   async fixBreathWeapons() {
      console.log("-----------------------------------------------");
      console.log("Fixing Breath Weapons");
      console.log("-----------------------------------------------");
      // Helper function to process a collection of items
      const processItems = async (items, contextName) => {
         for (const item of items) {
            if (item.type === 'weapon') {
               const savingThrow = item.system.savingThrow;
               const newBreathValue = savingThrow === "breath" ? item.name.split(" ")[0] : null;
               // Update the item if necessary
               if (item.system.breath === "false" || item.system.breath !== newBreathValue) {
                  console.log(`[${contextName}] Updating ${item.name}: setting breath to ${newBreathValue}`);
                  await item.update({ "system.breath": newBreathValue });
               }
            }
         }
      };

      // Process all actor items
      for (const actor of game.actors) {
         const actorItems = actor.items;
         await processItems(actorItems, `Actor: ${actor.name}`);
      }

      // Process all world items
      const worldItems = game.items;
      await processItems(worldItems, "World Items");
   }

   async fixLightItems() {
      console.log("-----------------------------------------------");
      console.log("Fixing Light Items (with Cloned Collections)");
      console.log("-----------------------------------------------");

      // Take a snapshot (clone) of all current actors and world items
      const clonedActors = Array.from(game.actors);
      const clonedWorldItems = Array.from(game.items);

      // Function to process items
      const processItems = async (items, contextName) => {
         // Clone the item array so we don't iterate over newly created items
         const snapshot = Array.from(items);

         for (const item of snapshot) {
            // 1) Converting "item" -> "light" if it has 'light' tag or name 'Lantern'
            if (
               item.type === "item" &&
               (item.system.tags?.includes("light") || item.name === "Lantern")
            ) {
               console.log(`[${contextName}] Converting ${item.name} to type "light".`);

               // Duplicate the old item’s data using the correct Foundry utility
               const newItemData = foundry.utils.duplicate(item.toObject());

               // Remove the "light" tag (and/or "lantern-fuel" if you wish) before creation
               if (Array.isArray(newItemData.system?.tags)) {
                  newItemData.system.tags = newItemData.system.tags.filter(
                     (tag) => tag !== "light" && tag !== "lantern-fuel"
                  );
               }

               // Force system.light to exist
               newItemData.system.light = newItemData.system.light || {};
               console.debug(item.system);
               // Now set the default
               newItemData.system.light.fuelType = item.name == 'Lantern' ? 'lantern' : null;
               newItemData.system.light.type = "lantern";

               // Finally set the new item type
               newItemData.type = "light";

               // Create new item, then delete the old one
               if (item.isEmbedded) {
                  // Actor-owned (embedded) item
                  const actor = item.parent;
                  await actor.createEmbeddedDocuments("Item", [newItemData]);
                  await actor.deleteEmbeddedDocuments("Item", [item.id]);
               } else {
                  // World item
                  await Item.create(newItemData);
                  await item.delete();
               }
            }

            // 2) Updating "item" if it has 'lantern-fuel' tag or name 'Oil, flask'
            else if (
               item.type === "item" &&
               (item.system.tags?.includes("lantern-fuel") || item.name === "Oil, flask")
            ) {
               console.log(`[${contextName}] Updating ${item.name}: fuelType = lantern`);

               // Remove the "lantern-fuel" tag before updating
               let updatedTags = item.system.tags;
               if (Array.isArray(updatedTags)) {
                  updatedTags = updatedTags.filter((tag) => tag !== "lantern-fuel");
               }

               await item.update({
                  "system.fuelType": "lantern",
                  "system.tags": updatedTags
               });
            }
         }
      };

      // Process cloned actor items
      for (const actor of clonedActors) {
         await processItems(actor.items, `Actor: ${actor.name}`);
      }

      // Process cloned world items
      await processItems(clonedWorldItems, "World Items");
   }

   //async fixAmmoItems() {
   //   console.log("-----------------------------------------------");
   //   console.log("Fixing Ammo Items and Weapons");
   //   console.log("-----------------------------------------------");

   //   // Take a snapshot (clone) of all current actors and world items
   //   const clonedActors = Array.from(game.actors);
   //   const clonedWorldItems = Array.from(game.items);

   //   // Function to process items
   //   const processItems = async (items, contextName) => {
   //      // Clone the item array so we don't iterate over newly created items
   //      const snapshot = Array.from(items);

   //      for (const item of snapshot) {
   //         if (item.type === 'weapon') {

   //         } else if (item.type === 'item') {

   //         }
   //      }
   //   };

   //   // Process cloned actor items
   //   for (const actor of clonedActors) {
   //      await processItems(actor.items, `Actor: ${actor.name}`);
   //   }

   //   // Process cloned world items
   //   await processItems(clonedWorldItems, "World Items");
   //}
}