import { SYSTEM_ID } from './config.mjs';

/**
 * Sets the current game version in the system settings.
 * Intended for future use to handle data schema migrations between different game versions.
 * The function currently sets the game version to the system's version, preparing for future checks
 * and potential migrations.
 */
export class MySystemVersion {
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
         return this.major === version.major && this.minor === version.minor && this.patch === version.patch;
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
         //    and patch are same or current patch less than next patch
         result.isNextRC = (this.rc > 0 && version.rc > 0 && this.rc < version.rc
            && (this.major === version.major || this.major < version.major)
            && (this.minor === version.minor || this.minor < version.minor)
            && (this.patch === version.patch || this.patch < version.patch));
         result.isNextMajor = this.major < version.major;
         result.isNextMinor = this.major == version.major && this.minor < version.minor;
         result.isNextPatch = this.minor == version.minor && this.patch < version.patch;
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
         //this.#testMigrate();

         if (this.oldVersion.lt(new MySystemVersion("0.10.0-rc.1"))) {
            await this.fixMonsterAbilities();
            const msg = "Fantastic Depths 0.10.0-rc.1 data migration complete.";
            ui.notifications.info(msg);
         }
         // Set the new version after migration is complete
         game.settings.set(SYSTEM_ID, 'gameVer', game.system.version);
      }
   }

   async fixMonsterAbilities() {
      let monsters = await game.fade.fadeFinder._getWorldSource("actor").filter(actor=>actor.type==='monster');
      for (let monster of monsters) {
         if (Number(monster.system.details.intelligence)) {
            await monster.update({
               "system.abilities.int.value": parseInt(monster.system.details.intelligence ?? 1),
               "system.abilities.int.total": parseInt(monster.system.details.intelligence ?? 1),
               "system.abilities.con.value": parseInt(monster.system.getParsedHD().base * 2 ?? 10),
               "system.abilities.con.total": parseInt(monster.system.getParsedHD().base * 2 ?? 10),
            });
         }
      }
      monsters = (await game.fade.fadeFinder._getPackSource("actor")).filter(actor => actor.type === 'monster');
      for (let monster of monsters) {
         if (Number(monster.system.details.intelligence)) {
            await monster.update({
               "system.abilities.int.value": parseInt(monster.system.details.intelligence ?? 1),
               "system.abilities.int.total": parseInt(monster.system.details.intelligence ?? 1),
               "system.abilities.con.value": parseInt(monster.system.getParsedHD().base * 2 ?? 10),
               "system.abilities.con.total": parseInt(monster.system.getParsedHD().base * 2 ?? 10),
            });
         }
      }
   }

   static async importCompendiums() {
      // Function to delete a folder and its contents recursively
      async function deleteFolderAndContents(folderName, folderType) {
         const folder = game.folders.find(f => f.name === folderName && f.type === folderType);

         if (folder) {
            // Delete the folder itself
            await folder.delete({ deleteSubfolders: true, deleteContents: true });
            ui.notifications.info(`Deleted folder '${folderName}' and its contents.`);
         }
      }

      // Function to import a compendium
      async function importCompendium(compendiumName, folderName) {
         if (game.user.isGM === false) {
            ui.notifications.warn("You must be a GM to perform this operation.");
            return;
         }
         const compendium = game.packs.get(compendiumName);
         if (compendium) {
            // Import all items into a new folder
            const importedDocuments = await compendium.importAll({ folderName: folderName, keepId: true });
         } else {
            ui.notifications.error(`Compendium '${compendiumName}' not found.`);
         }
      }

      // Main function to perform the operations
      async function performOperations(compendiumName, folderName, folderType, permissionLevel) {
         // Delete the 'FaDe Items' folder and its contents
         await deleteFolderAndContents(folderName, folderType);
         // Import the 'item-compendium' from the 'fade-compendiums' system into a new folder
         await importCompendium(compendiumName, folderName);
         if (permissionLevel > 0) {
            let folder = game.folders.find(f => f.name === folderName && f.type === folderType);
            ui.notifications.info(`Setting permissions. This could take a few minutes. You will be notified when the process completes.`);
            await updatePermissions(folder, permissionLevel, folderType);
         }
         ui.notifications.info(`Imported compendium '${compendiumName}' successfully into folder '${folderName}'.`);
      }

      // Recursive Permission Update for Folders and Their Contents
      async function updatePermissions(folder, level, folderType) {
         const actualFolder = game.folders.get(folder.id);
         if (!actualFolder) {
            console.error("Invalid folder encountered:", folder);
            return;
         }

         try {
            // Update folder permissions
            await actualFolder.update({ ownership: { default: level } });
            console.log(`Updated permissions for folder: ${actualFolder.name}`);

            // Update permissions for all items/actors in the folder
            const contents = folderType === "Actor" ? game.actors : game.items;
            const folderContents = contents.filter(i => i.folder?.id === folder.id);
            for (const item of folderContents) {
               await item.update({ ownership: { default: level } });
               //console.log(`Updated permissions for item: ${item.name}`);
            }
         } catch (err) {
            console.error(`Failed to update permissions for folder "${actualFolder.name}" or its contents`, err);
         }

         // Process child folders recursively
         for (const childWrapper of folder.children) {
            const childFolder = game.folders.get(childWrapper.folder._id);
            if (childFolder) {
               await updatePermissions(childFolder, level, folderType);
            } else {
               console.error("Failed to resolve child folder:", childWrapper);
            }
         }
      }

      // Execute the main function
      await performOperations('fade-compendiums.item-compendium', 'FaDe Items', 'Item', 1);
      await performOperations('fade-compendiums.actor-compendium', 'FaDe Actors', 'Actor', 0);
      await performOperations('fade-compendiums.roll-table-compendium', 'FaDe Roll Tables', 'RollTable', 0);
      await performOperations('fade-compendiums.macro-compendium', 'FaDe Macros', 'Macro', 0);
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