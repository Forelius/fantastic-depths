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
    * Are they the same version.
    * @param {any} version
    * @returns
    */
   eq(version, ignoreRC = false) {
      if (ignoreRC == false) {
         return this.version === version.version;
      } else {
         return this.major === version.major && this.minor === version.minor && this.build === version.build;
      }
   }

   /**
    * Is this version less than the specified version.
    * @param {any} version
    * @returns
    */
   lt(version) {
      if (!(version instanceof MySystemVersion)) {
         version = new MySystemVersion(version); // Normalize input
      }
      const result = { isNextBuild: false, isNextMajor: false, isNextMinor: false, isNextRC: false, isLessThan: false };
      if (this.eq(version) === false) {
         // True if current rc has value, next rc has value, current rc is less than next rc
         //    and majors are same or current major less than next major
         //    and minors are same or current minor less than next minor
         //    and build are same or current build less than next build
         result.isNextRC = (this.rc > 0 && version.rc > 0 && this.rc < version.rc
            && (this.major === version.major || this.major < version.major)
            && (this.minor === version.minor || this.minor < version.minor)
            && (this.build === version.build || this.build < version.build));
         result.isNextBuild = this.build < version.build;
         result.isNextMajor = this.major < version.major;
         result.isNextMinor = this.minor < version.minor;
         result.isLessThan = result.isNextMajor || result.isNextMinor || result.isNextBuild || result.isNextRC
            || this.rc !== null && version.rc === null && this.eq(version, true);
         //console.debug(this, version, result);
      } else {
         console.debug("Versions are same.", this, version);
      }

      return result.isLessThan;
   }
}

export class DataMigrator {
   constructor() {
      this.oldVersion = new MySystemVersion(game.settings.get(SYSTEM_ID, 'gameVer'));
      this.newVersion = new MySystemVersion(game.system.version);
   }

   async migrate() {
      if (game.user.isGM) {
         //console.debug("FADE Migrate", this.oldVersion, this.newVersion);
         //this.#testMigrate();

         if (this.oldVersion.lt(new MySystemVersion("0.7.20-rc.10"))) {
            await this.fixBreathWeapons();
         }
         if (this.oldVersion.lt(new MySystemVersion("0.7.21-rc.6"))) {
            await this.updateSizeForWeapons();
            await this.updateGripForWeapons();
            await this.updateCanSetForWeapons();
            ui.notifications.info("Fantastic Depths 0.7.21-rc.6 data migration complete.")
         }
         if (this.oldVersion.lt(new MySystemVersion("0.7.21-rc.7"))) {
            await this.fixUnidentified();
            ui.notifications.info("Fantastic Depths 0.7.21-rc.7 data migration complete.")
         }
         if (this.oldVersion.lt(new MySystemVersion("0.8.0-rc.1"))) {
            await this.fixTreasureItems();
            ui.notifications.info("Fantastic Depths 0.8.0-rc.1 data migration complete.")
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
                  //console.log(`Skipping update for ${actor ? `actor` : `world`} item: ${item.name} as grip is already set.`);
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

   async fixUnidentified() {
      const processItems = async (items, contextName) => {
         for (const item of items) {
            let isUpdated = false;
            if (item.type === 'weapon' || item.type === 'armor') {
               if (item.system.natural === true) {
                  await item.update({
                     "system.unidentifiedName": null,
                     "system.unidentifiedDesc": null,
                  });
               } else {
                  if (item.system.unidentifiedName === null || item.system.unidentifiedName === '') {
                     await item.update({ "system.unidentifiedName": item.name });
                     isUpdated = true;
                  }
                  if ((item.system.unidentifiedDesc === null || item.system.unidentifiedDesc === '') && item.system.description !== null && item.system.description !== '') {
                     await item.update({ "system.unidentifiedDesc": item.system.description });
                     isUpdated = true;
                  }
                  if (isUpdated === true) {
                     console.log(`[${contextName}] Updating ${item.name}(${item.type}): setting unidentified values`, item);
                  }
               }
            } else if (item.type === 'item' || item.type === 'light') {
               if (item.system.unidentifiedName === null || item.system.unidentifiedName === '') {
                  await item.update({ "system.unidentifiedName": item.name });
                  isUpdated = true;
               }
               if ((item.system.unidentifiedDesc === null || item.system.unidentifiedDesc === '') && item.system.description !== null && item.system.description !== '') {
                  await item.update({ "system.unidentifiedDesc": item.system.description });
                  isUpdated = true;
               }
               if (isUpdated === true) {
                  console.log(`[${contextName}] Updating ${item.name}(${item.type}): setting unidentified values`, item);
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

   async fixTreasureItems() {
      // Helper function to filter for treasure items.
      const findTreasureItems = items => items.filter(item => {
         // Only consider items of type "item" for this filter.
         if (item.type !== "item") return false;
         // Assume tags are stored in item.system.tags.
         const tags = item.system?.tags;
         if (!tags) return false;
         // If tags is an array, check if it includes "treasure".
         return Array.isArray(tags) ? tags.includes("treasure") : tags === "treasure";
      });

      // 1. Get world items from the global item collection.
      const worldItems = game.items.contents;
      const treasureWorldItems = findTreasureItems(worldItems);

      // 2. Get owned items from all actors.
      let actorOwnedItems = [];
      for (let actor of game.actors.contents) {
         actorOwnedItems.push(...actor.items.contents);
      }
      const treasureActorItems = findTreasureItems(actorOwnedItems);

      // Combine both collections.
      const allTreasureItems = [...treasureWorldItems, ...treasureActorItems];

      // Iterate over each treasure item and update its type to "treasure".
      for (let item of allTreasureItems) {
         console.log(`Updating item "${item.name}" (${item.id}) to type "treasure"`);
         try {
            await item.update({ type: "treasure" });
            await item.tagManager.popTag("treasure");
            console.log(`Item "${item.name}" updated successfully.`);
         } catch (error) {
            console.error(`Error updating item "${item.name}":`, error);
         }
      }
   }

   #testMigrate() {
      const v1 = new MySystemVersion("0.7.20");
      const v2 = new MySystemVersion("0.7.21");
      const v3 = new MySystemVersion("0.7.21-rc.1");
      const v4 = new MySystemVersion("0.7.21-rc.2");
      const v5 = new MySystemVersion("0.8.0");
      const v6 = new MySystemVersion("1.0.0");

      v1.lt(v2);
      v2.lt(v1);
      v2.lt(v3);
      v3.lt(v1);
      v3.lt(v2);
      v3.lt(v4);
      v4.lt(v3);
      v4.lt(v5);
   }
}