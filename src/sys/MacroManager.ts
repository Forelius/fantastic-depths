export class MacroManager {
   static validTypes = ["weapon", "item", "light", "specialAbility", "skill", "spell"];

   // Helper method to get or create a folder
   static async getOrCreateFolder(folderName, parentFolderId = null) {
      // Find the folder by name and type, ignoring parent
      let folder = game.folders.find(f => f.name === folderName && f.type === "Macro");

      // If the folder doesn't exist, create it under the specified parent (or root if parentFolderId is null)
      if (!folder) {
         folder = await Folder.create({
            name: folderName,
            type: "Macro",
            parent: parentFolderId || null // Use parentFolderId if provided, otherwise root (null)
         });
      }

      return folder;
   }

   // Helper method to create a macro if it doesn't exist
   static async createMacro(macroData, assignToHotbar = false) {
      console.log(`Creating macro: ${macroData.name}`);

      const existingMacro = game.macros.find(m => m.name === macroData.name);
      if (!existingMacro) {
         const macro = await Macro.create(macroData);

         // Assign to the next available hotbar slot if assignToHotbar is true
         if (assignToHotbar && game.user.isGM) {
            await MacroManager.assignMacroToHotbar(macro);
         }
      }
   }

   // Helper method to assign macro to the next available hotbar slot
   static async assignMacroToHotbar(macro) {
      const hotbar = game.user.getHotbarMacros();
      for (let slot = 1; slot <= 50; slot++) {
         const hotbarSlot = slot % 10 || 10; // Slot index between 1 and 10
         if (!hotbar[hotbarSlot - 1]?.macro) {
            await game.user.assignHotbarMacro(macro, hotbarSlot);
            return;
         }
      }
      ui.notifications.warn("No available hotbar slots for the macro.");
   }

   /* -------------------------------------------- */
   /*  Hotbar Macros                               */
   /* -------------------------------------------- */
   /**
    * Create a Macro from an Item drop.
    * Get an existing item macro if one exists, otherwise create a new one.
    * @param {Object} data The dropped data
    * @param {number} slot The hotbar slot to use
    * @returns {Promise}
    */
   static async createItemMacro(data, slot) {
      if (data.type === "Macro") {
         return game.user.assignHotbarMacro(await fromUuid(data.uuid), slot);
      }
      if (data.type === "RollTable") {
         const command = `game.fade.MacroManager.rollTableMacro("${data.uuid}");`;
         const table = await fromUuid(data.uuid);
         const macro = await Macro.create({
            name: table.name,
            type: "script",
            img: table.img,
            command,
            flags: { "fantastic-depths.tableMacro": true },
         });
         return game.user.assignHotbarMacro(macro, slot);
      }
      if (data.type !== "Item" || data.uuid.indexOf("Item.") <= 0) {
         return ui.notifications.warn(`You can only create macro buttons for owned Items.`);
      }

      const item = await Item.fromDropData(data);

      if (MacroManager.validTypes.includes(item.type) === false) {
         return ui.notifications.warn(`That type of item is not supported (${item.type}).`);
      }

      // Create the macro command
      const command = `game.fade.MacroManager.rollItemMacro("${item.name}");`;
      let macro = game.macros.contents.find((m) => m.name === item.name && m.command === command);
      if (!macro || macro.ownership[game.userId] === undefined) {
         macro = await Macro.create({
            name: item.name,
            type: "script",
            img: item.img,
            command,
            flags: { "fantastic-depths.itemMacro": true },
         });
      }
      return game.user.assignHotbarMacro(macro, slot);
   }

   static rollTableMacro(tableUuid) {
      fromUuid(tableUuid).then((table) => {
         if (table === null) {
            ui.notifications.error(`Rollable table not found. ${tableUuid}`);
         } else {
            table.draw({ displayChat: true });
         }
      });
   }

   /**
    * Roll the Item macro.
    * @param {string} iteName
    */
   static rollItemMacro(itemName) {
      const speaker = ChatMessage.getSpeaker();
      // Active actor, or inactive actor + token on scene allowed
      if (!(speaker.actor && speaker.scene))
         return ui.notifications.warn("No token owned in scene.");

      let actor;
      if (speaker.token) actor = game.actors.tokens[speaker.token];
      if (!actor) actor = game.actors.get(speaker.actor);

      // Get matching items
      const items = actor ? actor.items.filter((i) => MacroManager.validTypes.includes(i.type) && i.name === itemName) : [];
      if (items.length > 1) {
         ui.notifications.warn(`${actor.name} has more than one item named ${itemName}.`);
      } else if (items.length === 0) {
         return ui.notifications.error(`${actor.name} does not own a ${itemName}.`);
      }
      const item = items[0];

      // Trigger the item roll
      return item.roll();
   }
}