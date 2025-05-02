const { DialogV2 } = foundry.applications.api;

export class LightMgrDialog {
   static async getDialog(dataset, caller, opt) {
      const dialogData = {};
      const dialogResp = { caller };
      // Check if there are any items with the "light" tag
      const template = 'systems/fantastic-depths/templates/dialog/lightmgr.hbs';

      dialogData.label = dataset.label;
      dialogData.lightItems = opt.lightItems.reduce((acc, item) => {
         acc[item.id] = item.name; // Use the "id" as the key and "name" as the value
         return acc;
      }, {});

      dialogResp.resp = await DialogV2.wait({
         window: { title: game.i18n.localize('FADE.dialog.lightManager.title') },
         rejectClose: false,
         content: await renderTemplate(template, dialogData),
         buttons: [
            {
               action: 'ignite',
               label: game.i18n.localize('FADE.dialog.lightManager.ignite'),
               callback: (event, button, dialog) => ({
                  action: 'ignite',
                  itemId: dialog.querySelector('#lightItem').value,
               })
            },
            {
               action: 'extinguish',
               label: game.i18n.localize('FADE.dialog.lightManager.extinguish'),
               callback: (event, button, dialog) => ({
                  action: 'extinguish',
                  itemId: dialog.querySelector('#lightItem').value,
               })
            },
            {
               action: 'close',
               label: game.i18n.localize('FADE.dialog.close')
            }
         ],
         default: "close",
         close: () => { return null; },
         classes: ["fantastic-depths"]
      });
      dialogResp.context = caller;
      return dialogResp;
   }
}