export class Shove {
   constructor() {

   }

   static async showShoveDialog() {
      const template = 'systems/fantastic-depths/templates/dialog/shove.hbs';
      const dialogData = {};
      const content = await renderTemplate(template, dialogData);
      // Prompt for defender details
      let defenderData = await new Promise((resolve) => {
         new Dialog({
            title: "Shove - Defender Resist Value",
            content,
            buttons: {
               ok: {
                  label: "Calculate",
                  callback: (html) => {
                     resolve({
                        size: parseInt(html.find("#size").val()),
                        hitDice: parseInt(html.find("#hitDice").val()),
                        strengthMod: parseInt(html.find("#strengthMod").val()),
                        extraLegs: html.find("#extraLegs").prop("checked") ? 1 : 0,
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

      // Exit if canceled
      if (!defenderData) return;

      // Calculate the Resist value
      let { size, hitDice, strengthMod, extraLegs } = defenderData;
      let resistValue = size + Math.ceil(hitDice / 2) + strengthMod + extraLegs;

      // Output the result
      ChatMessage.create({
         content: `<strong>Shove Defender Resist Value:</strong> ${resistValue}`,
      });
   }
}