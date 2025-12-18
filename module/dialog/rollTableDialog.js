const { DialogV2 } = foundry.applications.api;
import { CodeMigrate } from "../sys/migration";
export class rollTableDialog {
    async getDialog() {
        const template = 'systems/fantastic-depths/templates/dialog/select-rolltable.hbs';
        //-------
        // In Foundry, folders have a "type" property that matches the document type they hold.
        // For roll tables, this is usually "RollTable". 
        let tableFolders = await game.fade.fadeFinder.getFolders("RollTable");
        if (!tableFolders.length) {
            return ui.notifications.warn("No folders for Roll Tables were found.");
        }
        let folders = tableFolders.sort((a, b) => a.name.localeCompare(b.name))
            .reduce((acc, item) => { acc[`${item.uuid}`] = item.name; return acc; }, {});
        //-------
        // Use the first folder in the list as the default.
        const defaultFolderId = tableFolders[0]?.uuid;
        let rollTables = await game.fade.fadeFinder.getDocsFromFolder(defaultFolderId, "RollTable");
        let tables = rollTables.sort((a, b) => a.name.localeCompare(b.name))
            .reduce((acc, item) => { acc[`${item.uuid}`] = item.name; return acc; }, {});
        // Get roll modes from the Foundry system
        const rollModes = Object.entries(CONFIG.Dice.rollModes).reduce((acc, [key, value]) => {
            acc[key] = game.i18n.localize(value.label ?? value);
            return acc;
        }, {});
        const result = await DialogV2.wait({
            window: { title: "Roll Table with Modifier" },
            rejectClose: false,
            position: { width: 400 },
            content: await CodeMigrate.RenderTemplate(template, { folders, tables, rollModes }),
            buttons: [
                {
                    action: 'roll',
                    label: game.i18n.localize('FADE.roll'),
                    callback: (event, button, dialog) => {
                        return {
                            action: button.dataset?.action,
                            data: new CodeMigrate.FormDataExtended(button.form).object
                        };
                    },
                    default: true
                },
                {
                    action: 'close',
                    label: game.i18n.localize('FADE.dialog.close'),
                    callback: function (event, button, dialog) { }
                }
            ],
            close: () => { },
            classes: ["fantastic-depths"],
            render: (event, dialog) => {
                dialog = dialog.element ?? dialog; // For V12/V13 compatibility.
                // When the folder dropdown changes, update the roll table dropdown.
                dialog.querySelector(`[name="folder"]`).addEventListener("change", async (changeEvent) => {
                    const folderId = changeEvent.currentTarget.value;
                    const rollTables = await game.fade.fadeFinder.getDocsFromFolder(folderId, "RollTable");
                    let options = "";
                    if (rollTables.length) {
                        options = rollTables.map(rt => `<option value="${rt.uuid}">${rt.name}</option>`).join("");
                    }
                    else {
                        options = `<option value="">No Roll Tables in this folder</option>`;
                    }
                    dialog.querySelector(`[name="table"]`).innerHTML = options;
                });
            }
        });
        if (result.action === "roll") {
            await this.clickRoll(result.data);
        }
    }
    async clickRoll(data) {
        // Get the selected roll table
        const rollTable = await fromUuid(data.table);
        if (rollTable) {
            // Roll the table with the selected roll mode
            const rollResult = await rollTable.roll();
            // Calculate the total based on the roll's total and the modifier
            const rollTotal = rollResult.roll._total;
            const total = rollTotal + data.modifier;
            // Get the text descriptions of the rolled results
            const rolledResultsText = rollResult.results.map(r => r.text).join(', ');
            // Create a message to display the result
            const messageContent = `<div class="text-size16">${rollTable.name}</div><p>${rolledResultsText}</p><hr/><p><strong>${rollTotal} + ${data.modifier} = ${total}</strong></p>`;
            const chatMsgData = { content: messageContent, speaker: ChatMessage.getSpeaker() };
            ChatMessage.applyRollMode(chatMsgData, data.rollMode);
            // Send the result to chat
            ChatMessage.create(chatMsgData);
        }
        else {
            ui.notifications.error("Selected roll table not found.");
        }
    }
}
