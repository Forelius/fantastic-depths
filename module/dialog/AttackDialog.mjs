const { DialogV2 } = foundry.applications.api;
//const { renderTemplate } = foundry.applications.handlebars;
//const { FormDataExtended } = foundry.applications.ux;
import { fadeDialog } from './fadeDialog.mjs';

export class AttackDialog extends fadeDialog {
   /**
    * Display a dialog allowing the caller to select a type of attack and attack roll modifier.
    * @param {any} weapon The attacker's weapon/spell item
    * @param {any} caller The owning actor, the attacker.
    * @param {object} options Additional options:
    *    targetToken: The targetted token
    * @returns
    */
   static async getDialog(weapon, caller, options) {
      const dialogData = { caller };
      let result = null;
      const weaponData = weapon.system;
      const callerName = caller.token?.name || caller.name;
      const weaponMasterySystem = game.fade.registry.getSystem('weaponMasterySystem');
      const targetActor = options.targetToken?.actor;

      dialogData.extraRollOptions = game.settings.get(game.system.id, 'extraRollOptions');
      dialogData.weapon = weaponData;
      dialogData.label = game.user.isGM || weapon.system.isIdentified ? weapon.name : weapon.system.unidentifiedName;
      // Attack type includes melee, missile and breath.
      dialogData.types = weapon.getAttackTypes().reduce((acc, item) => {
         acc[item.value] = item.text; // Use the "id" as the key and "name" as the value
         return acc;
      }, {});

      if (weaponMasterySystem) {
         // Get the available target types.
         dialogData.targetWeaponTypes = weaponMasterySystem.getWeaponTypes(weapon, caller);
         // Determines which target weapon type to pick by default.
         dialogData.selectedWeaponType = weaponMasterySystem.getActorWeaponType(targetActor);
      }

      dialogData.rollGroupName = "rollFormulaType";
      dialogData.rollChoices = {
         normal: "FADE.rollFormulaType.normal",
         advantage: "FADE.rollFormulaType.advantage",
         disadvantage: "FADE.rollFormulaType.disadvantage"
      };
      dialogData.rollChosen = "normal";

      const title = `${callerName}: ${dialogData.label} ${game.i18n.localize('FADE.roll')}`;
      const template = 'systems/fantastic-depths/templates/dialog/attack-roll.hbs';

      result = await DialogV2.wait({
         window: { title: title },
         position: {
            width: 350,
            height: 'auto'
         },
         rejectClose: false,
         content: await renderTemplate(template, dialogData),
         buttons: [
            {
               action: "check",
               label: game.i18n.localize('FADE.roll'),
               default: true,
               callback: (event, button, dialog) => new FormDataExtended(button.form).object,
            },
         ],
         close: () => {},
         classes: ["fantastic-depths"]
      });
      //result = caller;
      return result;
   }
}