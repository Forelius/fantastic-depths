const { DialogV2 } = foundry.applications.api;
import { CodeMigrate } from "../sys/migration.js";

export class WrestlingDialog {
   static async getDialog(dataset, caller, options) {
      const { attackers, defender, states } = options;

      // Find the maximum WR among the attackers
      const maxWR = Math.max(...attackers.map(a => a.actor.system.wrestling));
      let primaryAttackerId = attackers.find(a => a.actor.system.wrestling === maxWR).id;

      // Prepare dialog data
      const dialogData = {
         wrestlingStates: states,
         attackers: attackers.map((token) => ({
            id: token.id,
            name: token.name,
            wrestling: token.actor.system.wrestling,
            isPrimary: token.id === primaryAttackerId
         })),
         wrestlingState: 'free',
         defender,
      };

      // Render dialog
      const template = 'systems/fantastic-depths/templates/dialog/wrestling.hbs';
      const content = await CodeMigrate.RenderTemplate(template, dialogData);

      let dialogResp = await DialogV2.wait({
         window: { title: game.i18n.localize("FADE.dialog.wrestling.wrestlingContest") },
         rejectClose: false,
         content,
         buttons: [
            {
               action: 'roll',
               label: game.i18n.localize('FADE.roll'),
               default: true,
               callback: (event, button, dialog) => {
                  return { action: button.dataset.action, ...(new CodeMigrate.FormDataExtended(button.form).object) }
               }
            },
            {
               action: 'cancel',
               label: game.i18n.localize("FADE.dialog.cancel"),
               callback: () => { }
            }
         ],
         close: () => { }
      }, {
         classes: ["fantastic-depths", ...DialogV2.DEFAULT_OPTIONS.classes]
      });

      return dialogResp;
   }
}

