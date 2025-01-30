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

      // Parse version string
      let [core, rc] = version?.split('-') ?? []; // Split into core version and rc (if present)
      let split = core?.split('.') ?? [];
      this.major = parseInt(split[0]) ?? 0;
      this.minor = parseInt(split[1]) ?? 0;
      this.build = parseInt(split[2]) ?? 0;
      // Handle RC version (null if not an RC)
      this.rc = rc ? parseInt(rc.replace('rc.', '')) : null;
   }

   /**
    * Is this version greater than the specified version
    * @param {any} version
    */
   gt(version) {
      if (!(version instanceof MySystemVersion)) {
         version = new MySystemVersion(version); // Normalize input
      }

      // Compare major, minor, and build numbers first
      if (this.major !== version.major) return this.major > version.major;
      if (this.minor !== version.minor) return this.minor > version.minor;
      if (this.build !== version.build) return this.build > version.build;

      // Compare RC versions
      if (this.rc === null && version.rc !== null) return true; // Full release > RC
      if (this.rc !== null && version.rc === null) return false; // RC < Full release
      if (this.rc !== null && version.rc !== null) return this.rc > version.rc; // Compare RC numbers

      return false;
   }

   lt(version) {
      if (!(version instanceof MySystemVersion)) {
         version = new MySystemVersion(version); // Normalize input
      }

      // Compare major, minor, and build numbers first
      if (this.major !== version.major) return this.major < version.major;
      if (this.minor !== version.minor) return this.minor < version.minor;
      if (this.build !== version.build) return this.build < version.build;

      // Compare RC versions
      if (this.rc === null && version.rc !== null) return false; // Full release > RC
      if (this.rc !== null && version.rc === null) return true; // RC < Full release
      if (this.rc !== null && version.rc !== null) return this.rc < version.rc; // Compare RC numbers

      return false;
   }
}

export class DataMigrator {
   constructor() {
      this.oldVersion = new MySystemVersion(game.settings.get(SYSTEM_ID, 'gameVer'));
      this.newVersion = new MySystemVersion(game.system.version);
   }

   async migrate() {
      if (game.user.isGM) {
         console.debug("FADE Migrate", this.oldVersion, this.newVersion);

         if (this.oldVersion.lt(new MySystemVersion("0.7.18"))) {
            await this.fixLightItems();
         }
         if (this.oldVersion.lt(new MySystemVersion("0.7.20-rc.10"))) {
            await this.fixBreathWeapons();
         }
         if (this.oldVersion.lt(new MySystemVersion("0.7.21"))) {
            await this.updateSizeForWeapons();
            await this.updateGripForWeapons();
            await this.updateCanSetForWeapons();
         }
         // Set the new version after migration is complete
         await game.settings.set(SYSTEM_ID, 'gameVer', game.system.version);
      }
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

   // Function to update size based on tags
   async updateSizeForWeapons() {
      // Map tags to size values
      const sizeMapping = {
         small: 'S',
         medium: 'M',
         large: 'L',
      };

      // Helper function to update items
      const processItems = async (items, actor = null) => {
         for (const item of items) {
            if (item.type === 'weapon') {
               const tags = item.system.tags || [];

               // Handle natural property
               if (item.system.natural === true) {
                  if (item.system.size !== null) {
                     console.log(`Setting size to null for ${actor ? `actor` : `world`} item: ${item.name}`);
                     await item.update({ 'system.size': null });
                  }
                  continue; // Skip further processing for natural items
               }

               // Skip if system.size already has a non-null value
               if (item.system.size !== null) {
                  console.log(`Skipping update for ${actor ? `actor` : `world`} item: ${item.name} as size is already set.`);
                  continue;
               }

               // Determine size based on tags or default to 'M'
               let newSize = sizeMapping.medium; // Default size
               for (const tag of tags) {
                  if (sizeMapping[tag]) {
                     newSize = sizeMapping[tag];
                     break;
                  }
               }

               // Update size if needed
               if (item.system.size !== newSize) {
                  console.log(`Updating ${actor ? `actor` : `world`} item: ${item.name} - Size: ${item.system.size} -> ${newSize}`);
                  await item.update({ 'system.size': newSize });
               }

               // Remove size-related tags
               const updatedTags = tags.filter(tag => !Object.keys(sizeMapping).includes(tag));
               if (tags.length !== updatedTags.length) {
                  await item.update({ 'system.tags': updatedTags });
                  console.log(`Removed size tags from ${actor ? `actor` : `world`} item: ${item.name}`);
               }
            }
         }
      };

      // Process world items
      await processItems(game.items);

      // Process actor items
      for (const actor of game.actors) {
         await processItems(actor.items, actor);
      }

      console.log("Size update process completed.");
   }

   async updateGripForWeapons() {
      console.log("Starting grip update for all items...");

      // Define mapping and tags to remove
      const gripTags = ['1-handed', '2-handed', 'two-handed'];
      const getGrip = tags => tags.includes('2-handed') || tags.includes('two-handed') ? '2H' : '1H';

      // Helper function to process items
      const processItems = async (items, actor = null) => {
         for (const item of items) {
            if (item.type === 'weapon') {
               // Handle natural property
               if (item.system.natural === true) {
                  if (item.system.grip !== null) {
                     console.log(`Setting grip to null for ${actor ? `actor` : `world`} item: ${item.name}`);
                     await item.update({ 'system.grip': null });
                  }
                  continue; // Skip further processing for natural items
               }

               // Skip if system.grip already has a non-null value
               if (item.system.grip !== null) {
                  console.log(`Skipping update for ${actor ? `actor` : `world`} item: ${item.name} as grip is already set.`);
                  continue;
               }

               const tags = item.system.tags || [];
               const newGrip = getGrip(tags);

               // Update grip if needed
               if (item.system.grip !== newGrip) {
                  console.log(`Updating ${actor ? `actor` : `world`} item: ${item.name} - Grip: ${item.system.grip} -> ${newGrip}`);
                  await item.update({ 'system.grip': newGrip });
               }

               // Remove grip-related tags
               const updatedTags = tags.filter(tag => !gripTags.includes(tag));
               if (tags.length !== updatedTags.length) {
                  await item.update({ 'system.tags': updatedTags });
                  console.log(`Removed grip tags from ${actor ? `actor` : `world`} item: ${item.name}`);
               }
            }
         }
      };

      // Process world items
      await processItems(game.items);

      // Process actor items
      for (const actor of game.actors) {
         await processItems(actor.items, actor);
      }

      console.log("Grip update process completed.");
   }

   async updateCanSetForWeapons() {
      console.log("Starting canSet update for all items...");

      // Helper function to process items
      const processItems = async (items, actor = null) => {
         for (const item of items) {
            if (item.type === 'weapon') {
               const tags = item.system.tags || [];
               const hasSetTag = tags.includes('set');

               // Update canSet property
               if (item.system.canSet !== hasSetTag) {
                  console.log(`Updating ${actor ? `actor` : `world`} item: ${item.name} - canSet: ${item.system.canSet} -> ${hasSetTag}`);
                  await item.update({ 'system.canSet': hasSetTag });
               }

               // Remove the 'set' tag if present
               if (hasSetTag) {
                  const updatedTags = tags.filter(tag => tag !== 'set');
                  await item.update({ 'system.tags': updatedTags });
                  console.log(`Removed 'set' tag from ${actor ? `actor` : `world`} item: ${item.name}`);
               }
            }
         }
      };

      // Process world items
      await processItems(game.items);

      // Process actor items
      for (const actor of game.actors) {
         await processItems(actor.items, actor);
      }

      console.log("canSet update process completed.");
   }
}