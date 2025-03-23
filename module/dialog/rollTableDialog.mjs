import { fadeFinder } from '/systems/fantastic-depths/module/utils/finder.mjs';

export class rollTableDialog {
   async getDialog() {
      const template = 'systems/fantastic-depths/templates/dialog/select-rolltable.hbs';
      // First, get all folders that can contain roll tables.
      // In Foundry, folders have a "type" property that matches the document type they hold.
      // For roll tables, this is usually "RollTable". Adjust if your system uses a different type.
      const rollTableFolders = game.folders.filter(f => f.type === "RollTable");
      if (!rollTableFolders.length) {
         return ui.notifications.warn("No folders for Roll Tables were found.");
      }
      // Build folder dropdown options.
      const folderOptions = rollTableFolders
         .map(f => `<option value="${f.id}">${f.name}</option>`)
         .join("");
      // Use the first folder in the list as the default.
      const defaultFolderId = rollTableFolders[0].id;
      let initialRollTables = await this.getRollTablesForFolder(defaultFolderId);
      let tableOptions = initialRollTables.length
         ? initialRollTables.map(rt => `<option value="${rt.id}">${rt.name}</option>`).join("")
         : `<option value="">No Roll Tables in this folder</option>`;

      // Get all roll tables and sort them alphabetically by name
      /*const rollTables = game.tables.contents.sort((a, b) => a.name.localeCompare(b.name));*/

      // Get roll modes from the Foundry system
      const rollModes = Object.entries(CONFIG.Dice.rollModes).map(([key, value]) => {
         return `<option value="${key}">${game.i18n.localize(value)}</option>`;
      }).join('');

      const content = await renderTemplate(template, { folderOptions, tableOptions, rollModes });
      //console.debug(content);
      // Create the dialog
      new Dialog({
         title: "Roll Table with Modifier",
         content: content,
         buttons: {
            roll: {
               label: "Roll",
               callback: async (html) => this.clickRoll(html)
            },
            close: {
               label: "Close",
               callback: () => { }
            }
         },
         default: "close",
         close: () => { },
         render: (html) => {
            // When the folder dropdown changes, update the roll table dropdown.
            html.find("#folder-select").on("change", async (ev) => {
               const folderId = ev.currentTarget.value;
               const rollTables = await this.getRollTablesForFolder(folderId);
               let options = "";
               if (rollTables.length) {
                  options = rollTables.map(rt => `<option value="${rt.id}">${rt.name}</option>`).join("");
               } else {
                  options = `<option value="">No Roll Tables in this folder</option>`;
               }
               html.find("#table-select").html(options);
            });
         }
      }).render(true);
   }

   async clickRoll(html) {
      const selectedTableId = html.find("#table-select").val();
      const modifier = parseInt(html.find("#modifierInput").val()) || 0;
      const selectedRollMode = html.find("#rollModeSelect").val();

      // Get the selected roll table
      const rollTable = game.tables.get(selectedTableId);
      if (rollTable) {
         // Roll the table with the selected roll mode
         const rollResult = await rollTable.roll();

         // Calculate the total based on the roll's total and the modifier
         const rollTotal = rollResult.roll._total;
         const total = rollTotal + modifier;

         // Get the text descriptions of the rolled results
         const rolledResultsText = rollResult.results.map(r => r.text).join(', ');

         // Create a message to display the result
         const messageContent = `<h2>${rollTable.name}</h2><p>${rolledResultsText}</p><hr/><p>Total: <strong>${rollTotal} + ${modifier} = ${total}</strong></p>`;
         const chatMsgData = { content: messageContent, speaker: ChatMessage.getSpeaker() };
         ChatMessage.applyRollMode(chatMsgData, selectedRollMode);
         // Send the result to chat
         ChatMessage.create(chatMsgData);
      } else {
         ui.notifications.error("Selected roll table not found.");
      }
   }

   // Helper: Recursively gather folder IDs starting from a given folderId.
   async getChildFolderIds(folderId) {
      // Start with the provided folder.
      let ids = [folderId];
      // In v11, the folder's parent is stored directly in f.parent
      const children = game.folders.filter(f => f.parent === folderId).sort((a, b) => a.name.localeCompare(b.name));
      for (let child of children) {
         ids.push(...await this.getChildFolderIds(child.id));
      }
      return ids;
   }

   // Helper: Given a folderId, returns all roll tables located in that folder or in any child folder.
   async getRollTablesForFolder(folderId) {
      const folderIds = await this.getChildFolderIds(folderId);
      return game.tables.filter(rt => folderIds.includes(rt.folder?.id || ""));
   }
}