import { fadeDialog } from './fadeDialog.mjs';
export class LightMgrDialog extends fadeDialog {
   static async getDialog(dataset, caller, opt) {
      const dialogData = {};
      const dialogResp = { caller };
      // Check if there are any items with the "light" tag
      const template = 'systems/fantastic-depths/templates/dialog/lightmgr.hbs';

      dialogData.label = dataset.label;
      dialogData.lightItems = opt.lightItems.reduce((acc, item) => {
         acc[item.id] = item.name; // Use the "id" as the key and "name" as the value
         return acc;
      }, {});;

      dialogResp.resp = await Dialog.wait({
         title: "Light Manager",
         content: await renderTemplate(template, dialogData),
         buttons: {
            ignite: {
               label: game.i18n.localize('FADE.dialog.ignite'),
               callback: (html) => ({
                  action: "ignite",
                  itemId: document.getElementById('lightItem').value,
               })
            },
            extinguish: {
               label: game.i18n.localize('FADE.dialog.extinguish'),
               callback: () => ({
                  action: "extinguish",
                  itemId: document.getElementById('lightItem').value,
               })
            },
            close: {
               label: game.i18n.localize('FADE.dialog.close')
            }
         },
         default: "close",
         close: () => { return null; }
      }, {
         classes: ["fantastic-depths", ...Dialog.defaultOptions.classes]
      });
      dialogResp.context = caller;
      return dialogResp;
   }
}