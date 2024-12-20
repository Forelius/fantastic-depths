function focusById(id) {
   return setTimeout(() => { document.getElementById(id).focus(); }, 50);
}

export class fadeDialog {
   /**
    * Display a dialog allowing the caller to select a type of attack and attack roll modifier.
    * @param {any} weapon Reference to weapon instance
    * @param {any} caller The owning actor
    * @returns
    */
   static async getAttackDialog(weapon, caller, opt) {
      const dialogData = { caller };
      const result = {};
      const weaponData = weapon.system;

      dialogData.weapon = weaponData;
      dialogData.label = weapon.name;
      dialogData.modes = weapon.getAttackModes();
      dialogData.types = weapon.getAttackTypes();
      dialogData.targetWeaponTypes = fadeDialog.getWeaponTypes(weaponData, caller);
      dialogData.selectedWeaponType = opt.targetToken?.actor.getWeaponType();

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
                  rolling: true,
                  mod: parseInt(document.getElementById('mod').value, 10) || 0,
                  attackType: document.getElementById('attackType').value,
                  attackMode: document.getElementById('attackMode').value,
                  targetWeaponType: document.getElementById('targetWeaponType')?.value,
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

   static async getSpellAttackDialog(dataset, caller) {
      const dialogData = {};
      const dialogResp = { caller };

      dialogData.label = dataset.label;
      dialogData.targetWeaponTypes = fadeDialog.getWeaponTypes("spell", caller, dialogData);

      const title = `${caller.name}: ${dialogData.label} ${game.i18n.localize('FADE.roll')}`;
      const template = 'systems/fantastic-depths/templates/dialog/spell-attack-roll.hbs';

      dialogResp.resp = await Dialog.wait({
         title: title,
         content: await renderTemplate(template, dialogData),
         render: () => focusById('mod'),
         buttons: {
            roll: {
               label: game.i18n.localize('FADE.roll'),
               callback: () => ({
                  rolling: true,
                  mod: parseInt(document.getElementById('mod').value, 10) || 0,
                  targetWeaponType: document.getElementById('targetWeaponType')?.value,
               }),
            }
         },
         default: 'roll',
         close: () => { return null; }
      }, {
         classes: ["fantastic-depths", ...Dialog.defaultOptions.classes]
      });
      dialogResp.context = caller;
      return dialogResp;
   }

   static getWeaponTypes(weaponData, caller) {
      const weaponMastery = game.settings.get(game.system.id, "weaponMastery");
      let result = null;
      // if optional weapon mastery is being used and the weapon has a mastery specified...
      if (weaponMastery) {
         const attackerMastery = caller.items.find((item) => item.type === 'mastery' && item.name === weaponData?.mastery);
         if (caller.type === "monster" || weaponData === "spell" || attackerMastery) {
            result = [];
            result.push({ text: game.i18n.localize('FADE.Mastery.weaponTypes.monster.long'), value: 'monster' });
            result.push({ text: game.i18n.localize('FADE.Mastery.weaponTypes.handheld.long'), value: 'handheld' });
         }
      }
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
            roll: {
               label: game.i18n.localize('FADE.roll'),
               callback: () => ({
                  rolling: true,
                  mod: parseInt(document.getElementById('mod').value, 10) || 0,
               }),
            }
         },
         default: 'roll',
         close: () => { return null; }
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
         close: () => { return null; }
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
               label: game.i18n.localize('FADE.dialog.ignite'),
               callback: (html) => ({
                  action: "ignite",
                  itemId: document.getElementById('lightItem').value,
               })
            },
            extinguish: {
               label: game.i18n.localize('FADE.dialog.extinguish'),
               callback: () => ({
                  action: "extinguish"
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

   static async getSelectAttackDialog(equippedOnly = false) {
      // The selected token, not the actor
      const result = {};
      const attackerActor = canvas.tokens.controlled?.[0]?.actor || game.user.character;
      if (attackerActor) {
         const dialogData = { label: game.i18n.localize('FADE.dialog.selectAttack') };
         const template = 'systems/fantastic-depths/templates/dialog/select-attack.hbs';
         const attackItems = attackerActor.items.filter((item) => item.type === "weapon" && (equippedOnly === false || item.system.equipped));

         if (!attackItems || attackItems.length == 0) {
            ui.notifications.warn(game.i18n.format('FADE.notification.missingItem', { type: game.i18n.localize('TYPES.Item.weapon') }));
         } else if (equippedOnly && attackItems.length === 0) {
            ui.notifications.warn(game.i18n.localize('FADE.dialog.noEquippedWeapons'));
         } else {
            dialogData.attackItems = attackItems;
            dialogData.selectedid = attackItems.find((item) => item.system.equipped)?.id;
            result.resp = await Dialog.wait({
               title: dialogData.label,
               content: await renderTemplate(template, dialogData),
               buttons: {
                  attack: {
                     label: game.i18n.localize('FADE.combat.maneuvers.attack.name'),
                     callback: function (html) {
                        const itemId = document.getElementById('weaponItem').value;
                        const item = attackerActor.items.get(itemId);
                        // Call item's roll method.
                        item.roll();
                        return { item };
                     }
                  },
                  close: {
                     label: game.i18n.localize('FADE.dialog.close'),
                     callback: function (html) { return null; }
                  }
               },
               default: "close",
               close: () => { return null; }
            }, {
               classes: ["fantastic-depths", ...Dialog.defaultOptions.classes]
            });
            result.context = attackerActor;
         }
      } else {
         // Show a warning notification if no token is selected
         ui.notifications.warn(game.i18n.localize('FADE.notification.noTokenWarning'));
      }

      return result;
   }

   static async getSelectSpellDialog(memorizedOnly = false) {
      const casterActor = canvas.tokens.controlled?.[0]?.actor || game.user.character;
      if (casterActor) {
         const dialogData = { label: game.i18n.localize('FADE.dialog.selectSpell') };
         const template = 'systems/fantastic-depths/templates/dialog/select-spell.hbs';
         const spellItems = casterActor.items.filter((item) => item.type === "spell");

         if (!spellItems || spellItems.length == 0) {
            ui.notifications.warn(game.i18n.format('FADE.notification.missingItem', { type: game.i18n.localize('TYPES.Item.spell') }));
         } else {
            dialogData.spellItems = spellItems;
            await Dialog.wait({
               title: dialogData.label,
               content: await renderTemplate(template, dialogData),
               buttons: {
                  attack: {
                     label: game.i18n.localize('FADE.combat.maneuvers.spell.name'),
                     callback: function (html) {
                        const itemId = document.getElementById('spellItem').value;
                        const item = casterActor.items.get(itemId);
                        // Call item's roll method.
                        item.roll();
                        return { item };
                     }
                  },
                  close: {
                     label: game.i18n.localize('FADE.dialog.close'),
                     callback: function (html) { return null; }
                  }
               },
               default: "close",
               close: () => { return null; }
            }, {
               classes: ["fantastic-depths", ...Dialog.defaultOptions.classes]
            });
         }
      } else {
         // Show a warning notification if no token is selected
         ui.notifications.warn(game.i18n.localize('FADE.notification.noTokenWarning'));
      }
   }

   static async getYesNoDialog(dataset) {
      const {
         title = game.i18n.localize('FADE.dialog.confirm'),
         content = game.i18n.localize('FADE.dialog.confirm'),
         yesLabel = game.i18n.localize('FADE.yes'),
         noLabel = game.i18n.localize('FADE.no'),
         defaultChoice = "no" } = dataset;
      const dialogResp = {};

      dialogResp.resp = await Dialog.wait({
         title: title,
         content: `<div style="margin:0 0 8px;">${content}</div>`,
         buttons: {
            yes: {
               label: yesLabel,
               callback: () => ({
                  rolling: true,
                  result: true
               })
            },
            no: {
               label: noLabel,
               callback: () => ({
                  rolling: true,
                  result: false
               })
            }
         },
         default: defaultChoice,
         close: () => { return null; }
      }, {
         classes: ["fantastic-depths", ...Dialog.defaultOptions.classes]
      });

      return dialogResp;
   }
}