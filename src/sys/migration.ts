import { SYSTEM_ID } from './config.js';

/**
 * Sets the current game version in the system settings.
 * Intended for future use to handle data schema migrations between different game versions.
 * The function currently sets the game version to the system's version, preparing for future checks
 * and potential migrations.
 */
export class MySystemVersion {
   version: string;
   major: number;
   minor: number;
   patch: number;
   rc: number;
   constructor(version) {
      this.version = version;

      // Parse version string
      const [core, rc] = version?.split('-') ?? []; // Split into core version and rc (if present)
      const split = core?.split('.') ?? [];
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
         //console.debug("Versions are same.", this, version);
      }

      return result.isLessThan;
   }
}

export class DataMigrator {
   oldVersion: MySystemVersion;
   newVersion: MySystemVersion;
   constructor() {
      this.oldVersion = new MySystemVersion(game.settings.get(SYSTEM_ID, 'gameVer'));
      this.newVersion = new MySystemVersion(game.system.version);
   }

   async migrate() {
      if (game.user.isGM) {
         //console.debug("FADE Migrate", this.oldVersion, this.newVersion);
         //this.#testMigrate();

         if (this.oldVersion.lt(new MySystemVersion("1.4.2"))) {
            await this.migrateCustomSaveCodeToCustomCode();
            await this.migrateWeightEquippedFromWeight();
            await this.migrateClassAbilitiesToSpecialAbilities();
            ui.notifications.info("Fantastic Depths 1.4.2 data migration complete.");
         }

         // Set the new version after migration is complete
         await game.settings.set(SYSTEM_ID, 'gameVer', game.system.version);
      }
   }

   /**
    * Persist specialAbility rename customSaveCode → customCode on world and embedded items.
    * Soft migrateData already maps the value in memory; this writes it and removes the legacy key.
    */
   async migrateCustomSaveCodeToCustomCode() {
      console.log("-----------------------------------------------");
      console.log("Migrating customSaveCode → customCode");
      console.log("-----------------------------------------------");

      await this.#migrateWorldAndEmbeddedItems(
         (item) => this.#buildCustomCodeMigrationUpdate(item),
         "specialAbility"
      );
   }

   /**
    * Persist GearItemDataModel soft default: null weightEquipped ← weight.
    * Enables removing that migrateData after worlds have passed this gate.
    */
   async migrateWeightEquippedFromWeight() {
      console.log("-----------------------------------------------");
      console.log("Migrating weightEquipped from weight");
      console.log("-----------------------------------------------");

      await this.#migrateWorldAndEmbeddedItems(
         (item) => this.#buildWeightEquippedMigrationUpdate(item),
         "gear weightEquipped"
      );
   }

   /**
    * Persist class rename classAbilities → specialAbilities on world and embedded items.
    * Soft migrateData already maps the array in memory; this writes it and removes the legacy key.
    */
   async migrateClassAbilitiesToSpecialAbilities() {
      console.log("-----------------------------------------------");
      console.log("Migrating classAbilities → specialAbilities");
      console.log("-----------------------------------------------");

      await this.#migrateWorldAndEmbeddedItems(
         (item) => this.#buildClassAbilitiesMigrationUpdate(item),
         "class specialAbilities"
      );
   }

   /**
    * Apply an update builder across world items and each actor's embedded items.
    * @param {(item: Item) => object|null} buildUpdate
    * @param {string} label For log messages
    */
   async #migrateWorldAndEmbeddedItems(buildUpdate, label) {
      const worldUpdates = [];
      for (const item of game.items) {
         const update = buildUpdate(item);
         if (update) worldUpdates.push(update);
      }
      if (worldUpdates.length > 0) {
         console.log(`Updating ${worldUpdates.length} world ${label} item(s).`);
         await Item.updateDocuments(worldUpdates);
      }

      for (const actor of game.actors) {
         const updates = [];
         for (const item of actor.items) {
            const update = buildUpdate(item);
            if (update) updates.push(update);
         }
         if (updates.length > 0) {
            console.log(`Updating ${updates.length} ${label} item(s) on actor "${actor.name}".`);
            await actor.updateEmbeddedDocuments("Item", updates);
         }
      }
   }

   /**
    * @param {Item} item
    * @returns {object|null} Document update payload including `_id`, or null if no change needed.
    */
   #buildCustomCodeMigrationUpdate(item) {
      if (item.type !== "specialAbility") return null;

      const src = item._source?.system ?? {};
      const legacy = src.customSaveCode;
      const hasLegacy = Object.prototype.hasOwnProperty.call(src, "customSaveCode");
      const code = (item.system?.customCode != null && item.system.customCode !== "")
         ? item.system.customCode
         : legacy;

      // Soft migrateData fills customCode in memory; force-persist whenever a code exists so disk
      // gets the new key even if Foundry already stripped customSaveCode from _source.
      if ((code == null || code === "") && !hasLegacy) return null;

      const update: Record<string, unknown> = { _id: item.id };
      if (code != null && code !== "") {
         update["system.customCode"] = code;
      }
      update["system.-=customSaveCode"] = null;
      return update;
   }

   static #gearWeightTypes = new Set(["item", "treasure", "armor", "light", "weapon"]);

   /**
    * @param {Item} item
    * @returns {object|null} Document update payload including `_id`, or null if no change needed.
    */
   #buildWeightEquippedMigrationUpdate(item) {
      if (!DataMigrator.#gearWeightTypes.has(item.type)) return null;

      const weight = item.system?.weight;
      const weightEquipped = item.system?.weightEquipped;

      // Same rule as GearItemDataModel.migrateData. Soft migrate may already have filled
      // weightEquipped in memory; persist when it matches weight so disk catches up.
      if (!weight) return null;
      if (weightEquipped === null || weightEquipped === undefined) {
         return { _id: item.id, "system.weightEquipped": weight };
      }
      if (weightEquipped === weight) {
         return { _id: item.id, "system.weightEquipped": weightEquipped };
      }
      return null;
   }

   /**
    * @param {Item} item
    * @returns {object|null} Document update payload including `_id`, or null if no change needed.
    */
   #buildClassAbilitiesMigrationUpdate(item) {
      if (item.type !== "class") return null;

      const src = item._source?.system ?? {};
      const legacy = src.classAbilities;
      const hasLegacy = Object.prototype.hasOwnProperty.call(src, "classAbilities");
      const specials = item.system?.specialAbilities;
      const value = (Array.isArray(specials) && specials.length > 0)
         ? specials
         : legacy;

      // Soft migrateData fills specialAbilities in memory; force-persist whenever an array
      // exists so disk gets the new key even if Foundry already stripped classAbilities.
      if (!(Array.isArray(value) && value.length > 0) && !hasLegacy) return null;

      const update: Record<string, unknown> = { _id: item.id };
      if (Array.isArray(value) && value.length > 0) {
         update["system.specialAbilities"] = value;
      }
      update["system.-=classAbilities"] = null;
      return update;
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
      async function importCompendium(compendiumName) {
         if (game.user.isGM === false) {
            ui.notifications.warn("You must be a GM to perform this operation.");
            return;
         }
         const compendium = game.packs.get(compendiumName);
         if (compendium) {
            // Import all items into a new folder
            //const importedDocuments = await compendium.importAll({ folderName: folderName, keepId: true });
         } else {
            ui.notifications.error(`Compendium '${compendiumName}' not found.`);
         }
      }

      // Main function to perform the operations
      async function performOperations(compendiumName, folderName, folderType, permissionLevel) {
         // Delete the 'FaDe Items' folder and its contents
         await deleteFolderAndContents(folderName, folderType);
         // Import the 'item-compendium' from the 'fade-compendiums' system into a new folder
         await importCompendium(compendiumName);
         if (permissionLevel > 0) {
            const folder = game.folders.find(f => f.name === folderName && f.type === folderType);
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
      //const v3 = new MySystemVersion("0.7.21-rc.1");
      const v4 = new MySystemVersion("0.7.21-rc.7");
      const v5 = new MySystemVersion("0.8.0");
      const v7 = new MySystemVersion('0.8.0-rc.1');
      //const v6 = new MySystemVersion("1.0.0");

      v1.lt(v2);
      v2.lt(v1);
      //v2.lt(v3);
      //v3.lt(v1);
      //v3.lt(v2);
      //v3.lt(v4);
      //v4.lt(v3);
      //v4.lt(v5);
      v4.lt(v7);
      v7.lt(v5);
      v7.lt(v4);
   }
}

/**
 * Foundry API shims and data-source migrations used across the system.
 */
export class CodeMigrate {
   static FormDataExtended = foundry.applications.ux.FormDataExtended;
   static RenderTemplate = foundry.applications.handlebars.renderTemplate;

   /**
    * Convert legacy dual movement / encumbrance mirrors on a physical actor system source.
    * Safe to call from actor DataModel migrateData (system root) or nested physical data.
    */
   static migratePhysicalActorSource(source: Record<string, any>) {
      if (!source || typeof source !== "object") return;

      // Drop legacy encumbrance movement mirrors (rates live on movement.modes)
      const enc = source.encumbrance;
      if (enc && typeof enc === "object") {
         delete enc.mv;
         delete enc.mv2;
      }

      const movement = source.movement;
      if (!movement || typeof movement !== "object") return;

      // Drop short-lived core escape hatch; absolute primary rates belong in modules (e.g. WB)
      if (movement.modifiers && typeof movement.modifiers === "object") {
         delete movement.modifiers.fixedPrimary;
      }

      // Already on modes[] shape — remap retired action ids
      if (Array.isArray(movement.modes)) {
         CodeMigrate.#remapMovementModeActions(movement.modes);
         return;
      }

      // Legacy shape: flat max/turn on movement (and optional movement2)
      const hasLegacyPrimary = Object.prototype.hasOwnProperty.call(movement, "max")
         || Object.prototype.hasOwnProperty.call(movement, "turn");
      if (!hasLegacyPrimary) return;

      const modes = [CodeMigrate.#legacyRatesToMode(movement, "primary")];
      if (CodeMigrate.#isMeaningfulLegacySecondary(source.movement2)) {
         modes.push(CodeMigrate.#legacyRatesToMode(source.movement2, "secondary"));
      }

      source.movement = {
         modifiers: {
            encumbrance: 1,
         },
         modes,
      };
      delete source.movement2;
   }

   /** Remap stored movement mode action ids (e.g. walk → ground). */
   static #remapMovementModeActions(modes: Record<string, unknown>[]) {
      for (const mode of modes) {
         if (!mode || typeof mode !== "object") continue;
         if (mode.action === "walk") mode.action = "ground";
      }
   }

   static #legacyRatesToMode(legacy: Record<string, unknown> | null | undefined, action: string) {
      const actorMovement = game.fade.registry.getSystem("actorMovement");
      if (!legacy || typeof legacy !== "object") {
         return actorMovement.createDefaultMode(action, { base: 0, turn: 0 });
      }
      return {
         action,
         base: legacy.max !== undefined ? legacy.max : (action === "ground" || action === "primary" ? 120 : 0),
         turn: legacy.turn ?? null,
         round: legacy.round ?? null,
         day: legacy.day ?? null,
         run: legacy.run ?? null,
      };
   }

   static #isMeaningfulLegacySecondary(legacy: Record<string, unknown> | null | undefined): boolean {
      if (!legacy || typeof legacy !== "object") return false;
      const max = legacy.max as number | null | undefined;
      const turn = Number(legacy.turn) || 0;
      if (typeof max === "number" && max > 0) return true;
      if (max === null) {
         return [legacy.turn, legacy.round, legacy.day, legacy.run].some((v) => v != null && v !== 0);
      }
      return turn > 0;
   }

   static getEffectStart(cls: typeof ActiveEffect): object {
      return (cls as any).getEffectStart?.() ?? { time: game.time.worldTime };
   }

   static setEffectDurationProps(duration: any, remaining: number, expired: boolean): void {
      duration.remaining = remaining;
      duration.expired = expired;
   }

   static rollEvaluateSync(roll) {
      roll.evaluateSync();
   }

   static async rollEvaluate(roll) {
      await roll.evaluate();
   }

   static applyChatRollMode(chatMessageData: Record<string, unknown>, rollMode: string): void {
      const modeMap: Record<string, string> = {
         roll: "public",
         publicroll: "public",
         gmroll: "gm",
         blindroll: "blind",
         selfroll: "self"
      };
      const mode = modeMap[rollMode] ?? rollMode;
      ChatMessage.applyMode(chatMessageData, mode);
   }

   static getDefaultChatMode(): string {
      return game.settings.get("core", "messageMode") as string ?? "public";
   }

   static getRollModeSetting(): string {
      return this.getDefaultChatMode();
   }

   static async getTableResultText(result): Promise<string> {
      const html = await result.getHTML();
      const div = document.createElement("div");
      div.innerHTML = html;
      return div.textContent ?? "";
   }
}

