const { DialogV2 } = foundry.applications.api;
import { CodeMigrate } from "../sys/migration.js";

export class DamageTypeDialog {
   static async getDialog(_dataset, _caller, _options) {
      const dialogData = { damageTypes: null };
      let dialogResp = null;

      const title = game.i18n.localize('FADE.Weapon.damage.type');
      const template = 'systems/fantastic-depths/templates/dialog/damage-type.hbs';

      const damageTypes = []
      damageTypes.push(...CONFIG.FADE.DamageTypes.map((type) => {
         return { value: type, text: game.i18n.localize(`FADE.DamageTypes.types.${type}`) }
      }));
      dialogData.damageTypes = damageTypes.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});

      const content = await CodeMigrate.RenderTemplate(template, dialogData);
      dialogResp = await DialogV2.wait({
         window: { title },
         rejectClose: false,
         content,
         buttons: [{
            action: "apply",
            default: true,
            label: game.i18n.localize('FADE.Chat.apply'),
            callback: (_event, button, _dialog) => new CodeMigrate.FormDataExtended(button.form).object,
         }],
         close: () => { },
         classes: ["fantastic-depths"]
      });
      return dialogResp;
   }
}