const { DialogV2 } = foundry.applications.api;
import { fadeDialog } from './fadeDialog.mjs';

export class AbilityCheckDialog extends fadeDialog {
   static async getDialog(dataset, caller) {
      const dialogData = {};
      let dialogResp = null;

      dialogData.ability = dataset.ability;
      dialogData.formula = dataset.formula;
      const localizeAbility = game.i18n.localize(`FADE.Actor.Abilities.${dataset.ability}.long`);
      const title = `${caller.name}: ${localizeAbility} ${game.i18n.localize('FADE.roll')}`;
      const template = 'systems/fantastic-depths/templates/dialog/generic-roll.hbs';

      dialogResp = await DialogV2.wait({
         window: { title },
         rejectClose: false,
         content: await renderTemplate(template, dialogData),
         buttons: [
            {
               action: 'check',
               label: game.i18n.localize('FADE.dialog.abilityCheck'),
               callback: (event, button, dialog) => new FormDataExtended(button.form).object,
               default: true
            },
         ],
         close: () => {},
         classes: ["fantastic-depths"]
      });
      return dialogResp;
   }
}