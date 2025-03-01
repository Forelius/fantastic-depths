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
      this.patch = parseInt(split[2]) ?? 0;
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
         return this.major === version.major && this.minor === version.minor && this.patch === version.build;
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
      const result = { isNextMajor: false, isNextMinor: false, isNextPatch: false, isNextRC: false, isLessThan: false };
      if (this.eq(version) === false) {
         // True if current rc has value, next rc has value, current rc is less than next rc
         //    and majors are same or current major less than next major
         //    and minors are same or current minor less than next minor
         //    and build are same or current build less than next build
         result.isNextRC = (this.rc > 0 && version.rc > 0 && this.rc < version.rc
            && (this.major === version.major || this.major < version.major)
            && (this.minor === version.minor || this.minor < version.minor)
            && (this.patch === version.build || this.patch < version.build));
         result.isNextMajor = this.major < version.major;
         result.isNextMinor = this.major == version.major && this.minor < version.minor;
         result.isNextPatch = this.minor == version.minor && this.patch < version.build;
         result.isLessThan = result.isNextMajor || result.isNextMinor || result.isNextPatch || result.isNextRC
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
         this.#testMigrate();

         //if (this.oldVersion.lt(new MySystemVersion("0.7.21-rc.7"))) {
         //   await this.fixUnidentified();
         //   ui.notifications.info("Fantastic Depths 0.7.21-rc.7 data migration complete.")
         //}
         //if (this.oldVersion.lt(new MySystemVersion("0.8.0-rc.1"))) {
         //   await this.fixTreasureItems();
         //   ui.notifications.info("Fantastic Depths 0.8.0-rc.1 data migration complete.")
         //}
         // Set the new version after migration is complete
         await game.settings.set(SYSTEM_ID, 'gameVer', game.system.version);
      }
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
      const v4 = new MySystemVersion("0.7.21-rc.7");
      const v5 = new MySystemVersion("0.8.0");
      const v7 = new MySystemVersion('0.8.0-rc.1');
      const v6 = new MySystemVersion("1.0.0");

      v1.lt(v2);
      v2.lt(v1);
      //v2.lt(v3);
      //v3.lt(v1);
      //v3.lt(v2);
      //v3.lt(v4);
      //v4.lt(v3);
      //v4.lt(v5);
      v4.lt(v7);
      v7.lt(v4);
   }
}