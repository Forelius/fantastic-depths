export class MacroManager {
   // Method to create all macros if they don't exist
   static async createAllMacros() {
      const fdPath = `systems/fantastic-depths/assets/img/`;

      const gmFolder = await MacroManager.getOrCreateFolder("GM Only");
      const miscFolder = await MacroManager.getOrCreateFolder("Misc");

      await MacroManager.createMacro({
         name: "Open Party Tracker",
         type: "script",
         command: `if (game.user.isGM) {
   if (!window.partyTracker) window.partyTracker= new game.fade.PartyTrackerForm();
   if (window.partyTracker.rendered) window.partyTracker.close();
   else window.partyTracker.render(true);
} else { 
   ui.notifications.warn("Only the GM can open the Party Tracker.");
}`,
         img: "icons/skills/melee/weapons-crossed-swords-black-gray.webp",
         folder: gmFolder.id, // Place macro in the GM Only folder
      }, true); // true indicates it should be assigned to the hotbar

      await MacroManager.createMacro({
         name: "Open Turn Tracker",
         type: "script",
         command: `if (game.user.isGM) {
   if (!window.turnTracker) window.turnTracker = new game.fade.TurnTrackerForm();
   if (window.turnTracker.rendered) window.turnTracker.close();
   else window.turnTracker.render(true);
} else { 
   ui.notifications.warn("Only the GM can open the Turn Tracker.");
}`,
         img: "icons/magic/time/clock-analog-gray.webp",
         folder: gmFolder.id, // Place macro in the GM Only folder
      }, true); // true indicates it should be assigned to the hotbar

//      await MacroManager.createMacro({
//         name: "Open Active EFfect Library",
//         type: "script",
//         command: `if (game.user.isGM) {
//   if (!window.effectLibrary) window.effectLibrary = new game.fade.EffectLibraryForm();
//   if (window.effectLibrary.rendered) window.effectLibrary.close();
//   else window.effectLibrary.render(true);
//} else { 
//   ui.notifications.warn("Only the GM can open the Effect Library.");
//}`,
//         img: "icons/svg/paralysis.svg",
//         folder: gmFolder.id, // Place macro in the GM Only folder
//      }, true); // true indicates it should be assigned to the hotbar

      await MacroManager.createMacro({
         name: "Light Manager",
         type: "script",
         command: `if (game.user.isGM) {
   game.fade.LightManager.showLightDialog();
} else { 
   ui.notifications.warn("Only the GM can use this macro.");
}`,
         img: "icons/magic/light/orb-lightbulb-gray.webp",
         folder: gmFolder.id,
      }, true);  // Set to false if you don't want automatic hotbar assignment

      await MacroManager.createMacro({
         name: "Roll Abilty Scores 4d6kh",
         type: "script",
         command: "let results = ''; \
let accum = 0; \
for(let i = 0; i < 6; i++) { \
let roll; \
do { \
  roll = new Roll('4d6kh3'); \
  await roll.evaluate(); \
} while (roll.total < 6); \
accum += roll.total; \
results += `Roll ${i + 1}: ${roll.total}<br>`; \
} \
let average = Math.round(accum / 6, 2); \
results += `<strong>Average:</strong> ${average}`; \
ChatMessage.create({content: results, flavor: 'Ability Score Rolls'});",
         img: `${fdPath}/ui/import.webp`,
         folder: miscFolder.id
      }, false);

      await MacroManager.createMacro({
         name: "Attack",
         type: "script",
         command: "game.fade.fadeDialog.getSelectAttackDialog();",
         img: `icons/svg/dice-target.svg`,
         folder: miscFolder.id
      }, false);      
      await MacroManager.createMacro({
         name: "Attack Equipped",
         type: "script",
         command: "game.fade.fadeDialog.getSelectAttackDialog(true);",
         img: `icons/svg/dice-target.svg`,
         folder: miscFolder.id
      }, false);

//      await MacroManager.createMacro({
//         name: "Set Token Display Mode",
//         type: "script",
//         command: `
//(async () => {
//  // Define the resource key for HP
//  const hpResourceKey = "hp";

//  // Map of display mode options using Foundry's constants
//  const displayModeOptions = {
//    [CONST.TOKEN_DISPLAY_MODES.NONE]: "None",
//    [CONST.TOKEN_DISPLAY_MODES.HOVER]: "Hovered by Anyone",
//    [CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER]: "Hovered by Owner",
//    [CONST.TOKEN_DISPLAY_MODES.CONTROL]: "Controlled",
//    [CONST.TOKEN_DISPLAY_MODES.OWNER]: "Always for Owner",
//    [CONST.TOKEN_DISPLAY_MODES.ALWAYS]: "Always for Anyone"
//  };

//  // Map of token selection options
//  const tokenFilterOptions = {
//    all: "All Tokens on Canvas",
//    friendly: "Friendly Tokens",
//    hostile: "Hostile Tokens",
//    selected: "Selected Tokens"
//  };

//  // Create a dialog to let the user select options
//  const content = \`
//    <form>
//      <div class="form-group">
//        <label for="display-mode">Choose Display Mode:</label>
//        <select id="display-mode" name="display-mode">
//          \${Object.entries(displayModeOptions)
//            .map(([value, label]) => \`<option value="\${value}">\${label}</option>\`)
//            .join("")}
//        </select>
//      </div>
//      <div class="form-group">
//        <label for="token-filter">Choose Token Filter:</label>
//        <select id="token-filter" name="token-filter">
//          \${Object.entries(tokenFilterOptions)
//            .map(([value, label]) => \`<option value="\${value}">\${label}</option>\`)
//            .join("")}
//        </select>
//      </div>
//    </form>
//  \`;

//  // Display the dialog
//  new Dialog({
//    title: "Set Token Display Mode and Filter",
//    content,
//    buttons: {
//      apply: {
//        label: "Apply",
//        callback: async (html) => {
//          const selectedMode = parseInt(html.find("#display-mode").val(), 10);
//          const tokenFilter = html.find("#token-filter").val();

//          // Filter tokens based on the user's choice
//          let tokensToUpdate = [];
//          switch (tokenFilter) {
//            case "all":
//              tokensToUpdate = canvas.tokens.placeables;
//              break;
//            case "friendly":
//              tokensToUpdate = canvas.tokens.placeables.filter(t => t.document.disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY);
//              break;
//            case "hostile":
//              tokensToUpdate = canvas.tokens.placeables.filter(t => t.document.disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE);
//              break;
//            case "selected":
//              tokensToUpdate = canvas.tokens.controlled;
//              break;
//          }

//          // Prepare updates for the filtered tokens
//          const updates = tokensToUpdate.map(token => ({
//            _id: token.id,
//            "bar1.attribute": hpResourceKey,
//            displayBars: selectedMode
//          }));

//          // Apply the updates
//          if (updates.length > 0) {
//            await canvas.scene.updateEmbeddedDocuments("Token", updates);
//            ui.notifications.info(
//              \`Updated \${updates.length} token(s) to display HP bars with mode: \${displayModeOptions[selectedMode]}.\`
//            );
//          } else {
//            ui.notifications.warn("No tokens matched the selected filter.");
//          }
//        }
//      },
//      cancel: {
//        label: "Cancel",
//        callback: () => ui.notifications.info("Operation canceled.")
//      }
//    },
//    default: "apply"
//  }).render(true);
//})();
//  `,
//         img: `icons/svg/dice-target.svg`,
//         folder: gmFolder.id
//      }, false);

   }

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

      // Prevent Foundry's default behavior from creating an additional macro
      if (data.type !== 'Item') return;
      if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.')) {
         return ui.notifications.warn(
            'You can only create macro buttons for owned Items'
         );
      }

      // Stop the default Foundry behavior
      const item = await Item.fromDropData(data);

      // Create the macro command using the item's UUID.
      const command = `game.fade.MacroManager.rollItemMacro("${data.uuid}");`;

      // Check if a macro with the same name and command already exists
      let macro = game.macros.find((m) => m.name === item.name && m.command === command);
      if (!macro) {
         macro = await Macro.create({
            name: item.name,
            type: 'script',
            img: item.img,
            command: command,
            flags: { 'fantastic-depths.itemMacro': true },
         });
      }

      // Assign the created macro to the hotbar slot
      await game.user.assignHotbarMacro(macro, slot);

      return false;  // Prevent further handling of the drop event
   }

   /**
    * Roll the Item macro.
    * @param {string} itemUuid
    */
   static rollItemMacro(itemUuid) {
      // Reconstruct the drop data so that we can load the item.
      const dropData = {
         type: 'Item',
         uuid: itemUuid,
      };

      // Load the item from the uuid.
      Item.fromDropData(dropData).then((item) => {
         // Determine if the item loaded and if it's an owned item.
         if (!item || !item.parent) {
            const itemName = item?.name ?? itemUuid;
            return ui.notifications.warn(
               `Could not find item ${itemName}. You may need to delete and recreate this macro.`
            );
         }

         // Trigger the item roll
         item.roll();
      });
   }
}