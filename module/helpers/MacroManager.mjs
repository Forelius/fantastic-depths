export class MacroManager {
   // Method to create all macros if they don't exist
   static async createAllMacros() {
      const folder = await MacroManager.getOrCreateFolder("GM Only");
      await MacroManager.createMacro({
         name: "Open Turn Tracker",
         type: "script",
         command: `if (game.user.isGM) {
                  if (!window.turnTracker) window.turnTracker = new window.fade.TurnTrackerForm();
                  if (window.turnTracker.rendered) window.turnTracker.close();
                  else window.turnTracker.render(true);
                } else { 
                  ui.notifications.warn("Only the GM can open the Turn Tracker.");
                }`,
         img: "icons/magic/time/clock-analog-gray.webp",
         folder: folder.id, // Place macro in the GM Only folder
      }, true); // true indicates it should be assigned to the hotbar

      await MacroManager.createMacro({
         name: "Light Manager",
         type: "script",
         command: `if (game.user.isGM) {
                  window.fade.LightManager.showLightDialog();
                } else { 
                  ui.notifications.warn("Only the GM can use this macro.");
                }`,
         img: "icons/magic/light/orb-lightbulb-gray.webp",
         folder: folder.id,
      }, true);  // Set to false if you don't want automatic hotbar assignment
   }


   // Helper method to get or create a folder
   static async getOrCreateFolder(folderName) {
      let folder = game.folders.find(f => f.name === folderName && f.type === "Macro");
      if (!folder) {
         folder = await Folder.create({ name: folderName, type: "Macro", parent: null });
      }
      return folder;
   }

   // Helper method to create a macro if it doesn't exist
   static async createMacro(macroData, assignToHotbar = false) {
      console.log(`Creating macro: ${macroData.name}`);

      let existingMacro = game.macros.find(m => m.name === macroData.name);
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
         if (!hotbar[hotbarSlot-1]?.macro) {
            await game.user.assignHotbarMacro(macro, hotbarSlot);
            return;
         }
      }
      ui.notifications.warn("No available hotbar slots for the macro.");
   }

}