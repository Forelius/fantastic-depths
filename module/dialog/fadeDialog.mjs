function focusById(id) {
   return setTimeout(() => { document.getElementById(id).focus(); }, 50);
}

export class fadeDialog {
   /**
    * Display a dialog allowing the caller to select a type of attack and attack roll modifier.
    * @param {any} weapon Reference to weapon instance
    * @param {any} caller 
    * @returns
    */
   static async getAttackDialog(weapon, caller) {
      const dialogData = { caller };
      const result = {};

      dialogData.weapon = weapon.system;
      dialogData.label = weapon.name;
      dialogData.modes = weapon.getAttackModes();
      dialogData.types = weapon.getAttackTypes();

      const title = `${caller.name}: ${dialogData.label} ${game.i18n.localize('FADE.roll')}`;
      const template = 'systems/fantastic-depths/templates/dialog/attack-roll.hbs';

      result.resp = await Dialog.wait({
         title: title,         
         content: await renderTemplate(template, dialogData),
         render: () => focusById('mod'),
         buttons: {
            check: {
               label: game.i18n.localize('FADE.roll'),
               callback: () => ({
                  mod: parseInt(document.getElementById('mod').value, 10) || 0,
                  attackType: document.getElementById('attackType').value,
                  attackMode: document.getElementById('attackMode').value
               }),
            },
         },
         default: 'check',
         close: () => { return null; }
      }, {
         classes: ["fantastic-depths", ...Dialog.defaultOptions.classes]
      });
      result.context = caller;
      return result;
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
         default: 'check',
         close: () => { return false; }
      }, {
         classes: ["fantastic-depths", ...Dialog.defaultOptions.classes]
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
         default: 'check',
         close: () => { return false; }
      }, {
         classes: ["fantastic-depths", ...Dialog.defaultOptions.classes]
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
         default: 'import',
         close: () => { return false; }
      }, {
         classes: ["fantastic-depths", ...Dialog.defaultOptions.classes]
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
         close: () => { return false; }
      }, {
         classes: ["fantastic-depths", ...Dialog.defaultOptions.classes]
      });
      dialogResp.context = caller;
      return dialogResp;
   }

   static async getSelectAttackDialog(equippedOnly = false) {
      // The selected token, not the actor
      const result = {};
      const attackerToken = canvas.tokens.controlled?.[0] || this.actor?.getDependentTokens()?.[0] || game.user.character?.getDependentTokens()?.[0]; 
      if (attackerToken) {
         const dialogData = { label: "Select with What to Attack" };
         const template = 'systems/fantastic-depths/templates/dialog/select-attack.hbs';
         const attackerActor = attackerToken?.actor; // Actor associated with the token
         const attackItems = attackerActor.items.filter((item) => item.type === "weapon" && (equippedOnly === false || item.system.equipped));

         if (attackItems === 0) {
            ui.notifications.warn("The selected actor does not have anything to attack with.");
         } else if (equippedOnly && attackItems.length === 0) {
            ui.notifications.warn("The selected actor does not have any weapons equipped.");
         } else {
            dialogData.attackItems = attackItems;
            dialogData.selectedid = attackItems.find((item) => item.system.equipped)?.id;
            result.resp = await Dialog.wait({
               title: dialogData.label,
               content: await renderTemplate(template, dialogData),
               buttons: {
                  attack: {
                     label: "Attack",
                     callback: function (html) {
                        const itemId = document.getElementById('weaponItem').value;
                        const item = attackerActor.items.get(itemId);
                        // Call item's roll method.
                        item.roll();
                        return { item };
                     }
                  },
                  close: {
                     label: "Close",
                     callback: function (html) { return null; }
                  }
               },
               default: "close",
               close: () => { return null; }
            }, {
               classes: ["fantastic-depths", ...Dialog.defaultOptions.classes]
            });
            result.context = attackerToken;
         }
      } else {
         // Show a warning notification if no token is selected
         ui.notifications.warn("You must select a token or assign a default character to perform this action.");
      }

      return result;
   }

   static async getYesNoDialog(dataset) {
      const { title = "Confirm", content = "Are you sure?", yesLabel = "Yes", noLabel = "No", defaultChoice = "no" } = dataset;
      const dialogResp = {};

      dialogResp.resp = await Dialog.wait({
         title: title,
         content: `<div style="margin:0 0 8px;">${content}</div>`,
         buttons: {
            yes: {
               label: yesLabel,
               callback: () => ({
                  result: true
               })
            },
            no: {
               label: noLabel,
               callback: () => ({
                  result: false
               })
            }
         },
         default: defaultChoice,
         close: () => { return false; }
      }, {
         classes: ["fantastic-depths", ...Dialog.defaultOptions.classes]
      });

      return dialogResp;
   }
}