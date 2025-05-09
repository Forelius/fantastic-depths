const { DialogV2 } = foundry.applications.api;

export class AttackDialog {
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
      const attackerToken = caller.currentActiveToken ?? caller;
      const attackerName = caller.token?.name || caller.name;
      const masterySystem = game.fade.registry.getSystem("weaponMasterySystem");
      const toHitSystem = game.fade.registry.getSystem("toHitSystem");
      const targetToken = options.targetToken?.document ?? options.targetToken;
      const targetActor = options.targetToken?.actor;

      dialogData.attackRoll = "1d20";
      dialogData.extraRollOptions = game.settings.get(game.system.id, "extraRollOptions");
      dialogData.weapon = weapon;
      dialogData.label = game.user.isGM || weapon.system.isIdentified ? weapon.name : weapon.system.unidentifiedName;
      // Attack type includes melee, missile and breath.
      dialogData.attackTypes = weapon.getAttackTypes().reduce((acc, item) => {
         acc[item.value] = item.text; // Use the "id" as the key and "name" as the value
         return acc;
      }, {});
      dialogData.attackType = dialogData.attackTypes.melee ? "melee" : "missile";

      let ranges = weapon.system.range;
      if (masterySystem) {
         // Get the available target types.
         dialogData.targetWeaponTypes = masterySystem.getWeaponTypes(weapon, caller);
         // Determines which target weapon type to pick by default.
         dialogData.selectedWeaponType = masterySystem.getActorWeaponType(targetActor);
         ranges = masterySystem.getRanges(weapon);
      }

      const distance = AttackDialog.getDistance(attackerToken, targetToken);
      dialogData.attackDistance = distance;
      dialogData.rangeChoices = {
         short: `${game.i18n.localize("FADE.Weapon.range.short")} (${ranges.short})`,
         medium: `${game.i18n.localize("FADE.Weapon.range.medium")} (${ranges.medium})`,
         long: `${game.i18n.localize("FADE.Weapon.range.long")} (${ranges.long})`
      };
      dialogData.rangeSelected = AttackDialog.getRange(distance, ranges);
      dialogData.modifier = dialogData.attackType === "melee" ? 0 : toHitSystem.rangeModifiers[dialogData.rangeSelected];
      dialogData.rollChoices = {
         normal: "FADE.dialog.rollFormulaType.normal",
         advantage: "FADE.dialog.rollFormulaType.advantage",
         disadvantage: "FADE.dialog.rollFormulaType.disadvantage"
      };
      dialogData.rollSelected = "normal";

      const title = `${attackerName}: ${dialogData.label} ${game.i18n.localize("FADE.roll")}`;
      const template = "systems/fantastic-depths/templates/dialog/attack-roll.hbs";

      result = await DialogV2.wait({
         window: { title: title },
         position: {
            width: 400,
            height: "auto"
         },
         rejectClose: false,
         content: await renderTemplate(template, dialogData),
         buttons: [
            {
               action: "check",
               label: game.i18n.localize("FADE.roll"),
               default: true,
               callback: (event, button, dialog) => new FormDataExtended(button.form).object,
            },
         ],
         close: () => { },
         classes: ["fantastic-depths"],
         render: (event, dialog) => {
            dialog = dialog.element ?? dialog; // For V12/V13 compatibility.
            dialog.querySelector(`[name="attackType"]`).addEventListener("change", changeEvent => {
               AttackDialog._updateRange(changeEvent.target.value, dialog);
               const rangedSelectorDiv = dialog.querySelector("#rangeSelect");
               rangedSelectorDiv.style.display = changeEvent.target.value === "missile" ? "block" : "none";
            });
            dialog.querySelectorAll(`input[name="rangeType"]`).forEach(radio => {
               radio.addEventListener("change", changeEvent => {
                  AttackDialog._updateRange(dialog.querySelector(`[name="attackType"]`).value, dialog);
               });
            });
         }
      });
      return result;
   }

   static getDistance(token1, token2) {
      let result = 0;
      if (token1 && token2) {
         const waypoints = [token1.object.center, token2.object.center];
         result = canvas.grid.measurePath(waypoints)?.distance;
         if (token1.elevation !== token2.elevation) {
            const h_diff = token2.elevation > token1.elevation
               ? token2.elevation - token1.elevation
               : token1.elevation - token2.elevation;
            result = Math.sqrt(Math.pow(h_diff, 2) + Math.pow(result, 2));
         }
      }
      return Math.floor(result);
   }

   static getRange(distance, ranges) {
      let result = null;
      if (distance < 6) {
         result = "close";
      } else if (distance <= ranges.short) {
         result = "short";
      } else if (distance <= ranges.medium) {
         result = "medium";
      } else if (distance <= ranges.long) {
         result = "long";
      }
      return result;
   }

   static _updateRange(attackType, dialog) {
      const toHitSystem = game.fade.registry.getSystem("toHitSystem");
      const modInput = dialog.querySelector(`input[name="mod"]`);
      const selectedRange = dialog.querySelector(`input[name="rangeType"]:checked`)?.value;
      const isMissile = attackType === "missile";
      modInput.value = isMissile ? toHitSystem.rangeModifiers[selectedRange] : 0;
   }
}