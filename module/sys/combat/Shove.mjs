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
         outcome = `<strong>Success!</strong> The defender is shoved 5 feet back.`;
         if (rollResult >= resistValue * 2) {
            outcome += `<br>The defender is shoved 10 feet and must save vs. Paralysis at -2 or fall prone.`;
         }
         if (rollResult >= resistValue * 4) {
            outcome += `<br>The defender is shoved 15 feet and must save vs. Paralysis at -4 or fall prone.`;
         }
      } else {
         outcome = `<strong>Failure:</strong> The shove attempt failed.`;
      }

      // Output results to chat
      ChatMessage.create({
         content: `
            <strong>Shove Results:</strong><br>
            <strong>Attacker Roll:</strong> ${attackRoll.total} (${attackRoll.formula})<br>
            <strong>Defender Resist Value:</strong> ${resistValue}<br>
            ${outcome}
         `,
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
