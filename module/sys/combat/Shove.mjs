export class Shove {
   constructor() { }

   async execute() {
      // Gather controlled tokens and targets
      const attacker = canvas.tokens.controlled?.[0];
      const defender = game.user.targets?.first();
      if (!attacker) {
         ui.notifications.warn(game.i18n.localize("FADE.notification.selectToken1"));
         return;
      }
      if (!defender) {
         ui.notifications.warn(game.i18n.localize("FADE.notification.selectTarget"));
         return;
      }

      // Get dialog data
      const defenderData = await this.getDialogData(attacker, defender);
      if (!defenderData) return; // Exit if canceled

      // Extract values
      let { attsize, attbonus, defsize, defhd, defbonus } = defenderData;

      // Calculate Resist value
      let resistValue = this.getShoveResist(defsize) + Math.ceil(defhd / 2) + defbonus;

      // Get attacker roll die and roll
      const attackDie = this.getShoveDie(attsize);
      const attackRoll = await new Roll(`${attackDie} + ${attbonus}`).roll();

      // Compare roll vs resist
      const rollResult = attackRoll.total;
      let outcome = "";

      if (rollResult >= resistValue) {
         outcome = `<div class='attack-result attack-success'>Success!</div>`;
         if (rollResult >= resistValue * 4) {
            outcome += `<div>The defender is shoved 15 feet and must save vs. Paralysis at -4 or fall prone.</div>`;
         }
         else if (rollResult >= resistValue * 2) {
            outcome += `<div>The defender is shoved 10 feet and must save vs. Paralysis at -2 or fall prone.</div>`;
         }
         else {
            outcome += `<div>The defender is shoved 5 feet back.</div>`;
         }
      } else {
         outcome = `<div class='attack-result attack-fail'>Failure</div><div>The shove attempt failed.</div>`;
      }

      // Output results to chat
      ChatMessage.create({
         content: `
            <h2>${game.i18n.localize("FADE.dialog.shove.resultsLabel") }:</h2>
            <div style="font-size:14px"><strong>${game.i18n.format("FADE.dialog.shove.defenderResist", { defender: defender.name })}:</strong> ${resistValue}</div>
            <div style="font-size:14px"><strong>${game.i18n.format("FADE.dialog.shove.attackerRoll", { attacker: attacker.name })}:</strong> ${attackRoll.total} (${attackRoll.formula})</div>
            <div style='margin-top:4px;'>${await attackRoll.render()}</div>
            <div style='margin-top:4px;'>${outcome}</div>`,
      });
   }

   async getDialogData(attacker, defender) {
      const template = 'systems/fantastic-depths/templates/dialog/shove.hbs';
      const dialogData = {
         attacker,
         defender,
         attsize: attacker.actor.system.details.size,
         attbonus: 0,
         defsize: defender.actor.system.details.size,
         defhd: parseInt(defender.actor.system.hp.hd.match(/^\d+/)?.[0] || 0),
         defbonus: defender.actor.system.abilities?.str.mod || 0,
         sizes: CONFIG.FADE.ActorSizes
            .map((size) => { return { text: game.i18n.localize(`FADE.Actor.sizes.${size.id}`) + ` (< ${size.maxFeet}')`, value: size.id } })
            .reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {})
      };
      const content = await renderTemplate(template, dialogData);

      return await new Promise((resolve) => {
         new Dialog({
            title: "Shove - Defender Resist Value",
            content,
            buttons: {
               ok: {
                  label: "Calculate",
                  callback: (html) => {
                     resolve({
                        attsize: html.find("#attsize").val(),
                        attbonus: parseInt(html.find("#attbonus").val()),
                        defsize: html.find("#defsize").val(),
                        defhd: parseInt(html.find("#defhd").val()),
                        defbonus: parseInt(html.find("#defbonus").val()),
                     });
                  },
               },
               cancel: {
                  label: "Cancel",
                  callback: () => resolve(null),
               },
            },
            default: "ok",
         }).render(true);
      });
   }

   getShoveResist(sizeid) {
      return CONFIG.FADE.ActorSizes.find(size => size.id === sizeid)?.shoveResist;
   }

   getShoveDie(sizeid) {
      const sizeDice = {
         T: "1d2",
         S: "1d4",
         M: "1d6",
         L: "1d8",
         G: "1d10",
         I: "1d12"
      };
      return sizeDice[sizeid] || "1d6"; // Default to 1d6 if size is unknown
   }

   static async showShoveDialog() {
      await new Shove().execute();
   }
}
