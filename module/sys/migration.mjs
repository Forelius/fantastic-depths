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
}

