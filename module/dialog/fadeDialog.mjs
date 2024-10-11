//function getDialogData() {
//   return {
//      rollModes: CONFIG.Dice.rollModes,
//      rollMode: game.settings.get('core', 'rollMode'),
//   };
//}

function focusById(id) {
   return setTimeout(() => { document.getElementById(id).focus(); }, 50);
}

export class fadeDialog {
   static async getAttackDialog(weapon, caller) {
      const dialogData = { caller };
      const dialogResp = {};

      dialogData.weapon = weapon.system;
      dialogData.label = weapon.name;
      const title = `${caller.name}: ${dialogData.label} ${game.i18n.localize('FADE.roll')}`;
      const template = 'systems/fantastic-depths/templates/dialog/attack-roll.hbs';

      dialogResp.resp = await Dialog.wait({
         title: title,
         content: await renderTemplate(template, dialogData),
         render: () => focusById('mod'),
         buttons: {
            check: {
               label: game.i18n.localize('FADE.roll'),
               callback: () => ({
                  mod: parseInt(document.getElementById('mod').value, 10) || 0,
                  attackType: document.getElementById('attackType').value
               }),
            },
         },
         default: 'check'
      });
      dialogResp.context = caller;
      return dialogResp;
   }

   static async getGenericDialog(dataset, caller) {
      const dialogData = {};
      const dialogResp = { caller };

      dialogData.label = dataset.label;
      const title = `${caller.name}: ${dialogData.label} ${game.i18n.localize('FADE.roll')}`;
      const template = 'systems/fantastic-depths/templates/dialog/generic-roll.hbs';

      dialogResp.resp = await Dialog.wait({
         title: title,
         content: await renderTemplate(template, dialogData),
         render: () => focusById('mod'),
         buttons: {
            check: {
               label: game.i18n.localize('FADE.roll'),
               callback: () => ({
                  mod: parseInt(document.getElementById('mod').value, 10) || 0,
               }),
            },
         },
         default: 'check'
      });
      dialogResp.context = caller;
      return dialogResp;
   }

   static async getAbilityDialog(dataset, caller) {
      const dialogData = {};
      const dialogResp = { caller };

      dialogData.ability = dataset.ability;
      const localizeAbility = game.i18n.localize(`FADE.Actor.Abilities.${dataset.ability}.long`);
      const title = `${caller.name}: ${localizeAbility} ${game.i18n.localize('FADE.roll')}`;
      const template = 'systems/fantastic-depths/templates/dialog/ability-roll.hbs';

      dialogResp.resp = await Dialog.wait({
         title: title,
         rejectClose: true,
         content: await renderTemplate(template, dialogData),
         render: () => focusById('mod'),
         buttons: {
            check: {
               label: game.i18n.localize('FADE.dialog.abilityCheck'),
               callback: () => ({
                  rolling: true,
                  mod: parseInt(document.getElementById('mod').value, 10) || 0,
               }),
            },
         },
         default: 'check'
      });
      dialogResp.context = caller;
      return dialogResp;
   }

   static async getContentImportDialog(dataset, caller) {
      const dialogData = { config: CONFIG.FADE };
      const dialogResp = { caller };

      const title = `Import content from text`;
      const template = 'systems/fantastic-depths/templates/dialog/import-content.hbs';

      dialogResp.resp = await Dialog.wait({
         title: title,
         rejectClose: true,
         content: await renderTemplate(template, dialogData),
         render: () => focusById('importText'),
         buttons: {
            import: {
               label: "Import",
               callback: async () => ({
                  type: document.getElementById('type').value,
                  spellLevel: document.getElementById('spellLevel').value,
                  attribute: document.getElementById('attribute').value,
                  importText: document.getElementById('importText').value,
               }),
            },
            cancel: {
               icon: "<i class='fas fa-times'></i>",
               label: "Cancel"
            }
         },
         default: 'import'
      });
      dialogResp.context = caller;
      return dialogResp;
   }

   static async getLightMgrDialog(dataset, caller, opt) {
      const dialogData = {};
      const dialogResp = { caller };
      // Check if there are any items with the "light" tag
      const template = 'systems/fantastic-depths/templates/dialog/lightmgr.hbs';

      dialogData.label = dataset.label;
      dialogData.lightItems = opt.lightItems;

      dialogResp.resp = await Dialog.wait({
         title: "Light Manager",
         content: await renderTemplate(template, dialogData),
         buttons: {
            ignite: {
               label: "Ignite",
               callback: (html) => ({
                  action: "ignite",
                  itemId: document.getElementById('lightItem').value,
               })
            },
            extinguish: {
               label: "Extinguish",
               callback: () => ({
                  action: "extinguish"
               })
            },
            close: {
               label: "Close"
            }
         },
         default: "close",
         close: () => console.log("Light Manager dialog closed.")
      });
      dialogResp.context = caller;
      return dialogResp;
   }

   static async getSelectAttackDialog(equippedOnly = false) {
      const dialogData = {};
      const dialogResp = {};
      // Check if there are any items with the "light" tag
      const template = 'systems/fantastic-depths/templates/dialog/select-attack.hbs';

      dialogData.label = "Select Attack Type";

      let actor = canvas.tokens.controlled[0]?.actor || game.user.character;
      if (!actor) {
         // Show a warning notification if no token is selected
         ui.notifications.warn("You must select a token or assign a default character to perform this action.");
      } else {
         let attackItems = [];
         let equippedWeapons = [];
         actor.items.forEach(item => { if (item.type === "weapon") { attackItems.push(item); } });
         actor.items.forEach(item => { if (item.type === "weapon" && item.system.equipped === true) { equippedWeapons.push(item); } });
         if (attackItems === 0) {
            ui.notifications.warn("The selected actor does not have anything to attack with.");
         } else if (equippedOnly && equippedWeapons.length === 0) {
            ui.notifications.warn("The selected actor does not have any weapons equipped.");
         } else {
            dialogData.attackItems = equippedOnly ? equippedWeapons : attackItems;

            dialogResp.resp = await Dialog.wait({
               title: "Select Attack Type",
               content: await renderTemplate(template, dialogData),
               buttons: {
                  attack: {
                     label: "Attack",
                     callback: function (html) {
                        let itemId = document.getElementById('weaponItem').value;
                        let item = actor.items.get(itemId);
                        item.roll();
                        return { item };
                     }
                  },
                  close: {
                     label: "Close",
                     callback: function (html) {
                        return false;
                     }
                  }
               },
               default: "close",
               close: () => { return false; }
            });
            dialogResp.context = actor;
         }
      }

      return dialogResp;
   }
}