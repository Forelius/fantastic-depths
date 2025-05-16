const { DialogV2 } = foundry.applications.api;

export class LightMgrDialog {
   static async getDialog(dataset, caller, opt) {
      const dialogData = {};
      // Check if there are any items with the "light" tag
      const template = "systems/fantastic-depths/templates/dialog/lightmgr.hbs";

      dialogData.label = dataset.label;
      dialogData.lightItems = opt.lightItems.reduce((acc, item) => {
         acc[item.id] = item.name; // Use the "id" as the key and "name" as the value
         return acc;
      }, {});
      dialogData.lightItem = opt.lightItems[0]?.id;

      const result = await DialogV2.wait({
         window: { title: game.i18n.localize("FADE.dialog.lightManager.title") },
         rejectClose: false,
         content: await renderTemplate(template, dialogData),
         buttons: [
            {
               action: "ignite",
               label: game.i18n.localize("FADE.dialog.lightManager.ignite"),
               callback: (event, button, dialog) => { return { action: "ignite", ...(new FormDataExtended(button.form).object) } },
            },
            {
               action: "extinguish",
               label: game.i18n.localize("FADE.dialog.lightManager.extinguish"),
               callback: (event, button, dialog) => { return { action: "extinguish", ...(new FormDataExtended(button.form).object) } },
            },
            {
               action: "close",
               label: game.i18n.localize("FADE.dialog.close")
            }
         ],
         default: "close",
         close: () => { },
         classes: ["fantastic-depths"]
      });
      return result;
   }
}