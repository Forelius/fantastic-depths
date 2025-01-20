export class AwardXPDialog extends FormApplication {
   /**
    * @param {string[]} actorIds - The IDs of the tracked party members
    */
   constructor(object = {}, options = {}) {
      super(object, options);
      // Keep the IDs
      this.actorIds = options.actorIds;

      // Store global XP and share factors
      this._globalXP = 0;
      // Key: actorId => number (default 1)
      this._shareFactors = {};
   }

   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         id: "award-xp-dialog",
         title: game.i18n.localize("FADE.dialog.awardXP.long"),
         template: `systems/${game.system.id}/templates/apps/award-xp.hbs`,
         width: 400,
         height: "auto",
         closeOnSubmit: true,
         classes: ["fantastic-depths", ...super.defaultOptions.classes]
      });
   }

   /**
    * Provide data to Handlebars
    */
   getData(options) {
      const data = super.getData(options);

      // Retrieve Actor docs
      const actors = this.actorIds.map(id => game.actors.get(id)).filter(a => a);

      data.globalXP = this._globalXP || 0;

      // Sum all share factors
      let totalFactors = 0;
      for (const actor of actors) {
         // If we haven't stored a factor for this actor, default to 1
         if (this._shareFactors[actor.id] === undefined) {
            this._shareFactors[actor.id] = 1;
         }
         totalFactors += this._shareFactors[actor.id];
      }

      // Compute each actor's default XP from global XP + shareFactor + bonus
      actors.forEach(actor => {
         const factor = this._shareFactors[actor.id] || 1;
         let baseShare = 0;
         if (totalFactors > 0) {
            baseShare = Math.floor((this._globalXP * factor) / totalFactors);
         }
         // If there's a bonus % in actor.system.details.xp.bonus
         const bonusPct = Number(actor.system.details?.xp?.bonus ?? 0) / 100;
         const totalXP = baseShare + Math.floor(baseShare * bonusPct);

         // We'll pass this to Handlebars to pre-fill actorXP_{{id}}
         actor.defaultXP = totalXP;
         // We'll also store it in actor.shareFactor so Handlebars can fill in that input
         actor.shareFactor = this._shareFactors[actor.id];
      });

      data.actors = actors;
      return data;
   }

   /**
    * After rendering, attach listeners
    */
   activateListeners(html) {
      super.activateListeners(html);

      // 1) Global XP changes on blur/change
      html.find('input[name="globalXP"]').on("change blur", event => {
         this._globalXP = Number(event.currentTarget.value) || 0;
         // Instead of a full this.render(), we can do a partial update of each actor's XP field:
         this._updateActorXPFields(html);
      });

      // 2) The button to actually award XP (type="button")
      html.find(".dialog-button").on("click", () => {
         this.submit(); // This calls _updateObject()
      });

      // 3) Actor share factor inputs
      html.find(".share-factor").on("change blur", event => {
         const input = event.currentTarget;
         const actorId = input.name.split("actorShareFactor_")[1];
         const newFactor = Number(input.value) || 1;
         this._shareFactors[actorId] = newFactor;

         // Recalculate the default XP for each actor
         this._updateActorXPFields(html);
      });
   }

   /**
    * Update each actorXP_{{id}} input in place (no full re-render).
    * We do the same math from getData(), but only to adjust the form fields.
    */
   _updateActorXPFields(html) {
      // 1) Gather the actor docs
      const actors = this.actorIds.map(id => game.actors.get(id)).filter(a => a);

      // 2) Sum factors
      let totalFactors = 0;
      for (const actor of actors) {
         totalFactors += this._shareFactors[actor.id] || 1;
      }

      // 3) For each actor, compute the new default XP
      for (const actor of actors) {
         const factor = this._shareFactors[actor.id] || 1;
         let baseShare = 0;
         if (totalFactors > 0) {
            baseShare = Math.floor((this._globalXP * factor) / totalFactors);
         }
         const bonusPct = Number(actor.system.details?.xp?.bonus ?? 0) / 100;
         const totalXP = baseShare + Math.floor(baseShare * bonusPct);

         // 4) Update the actual input in the DOM
         const xpInputName = `actorXP_${actor.id}`;
         const $xpInput = html.find(`input[name="${xpInputName}"]`);
         $xpInput.val(totalXP);
      }
   }

   /**
    * Final awarding of XP
    */
   async _updateObject(event, formData) {
      event.preventDefault();

      // expandObject converts the formData into a JS object
      // e.g. { globalXP: "200", actorXP_ABC: "120", actorShareFactor_ABC: "2", ... }
      const data = expandObject(formData);

      // We'll gather update Promises
      const promises = [];

      for (const actorId of this.actorIds) {
         const actor = game.actors.get(actorId);
         if (!actor) continue;

         // The final XP is in actorXP_<id>
         const fieldName = `actorXP_${actorId}`;
         const finalXP = Number(data[fieldName] || 0);

         // Add that to the actor's current XP
         const currentXP = getProperty(actor, "system.details.xp.value") ?? 0;
         const updatedXP = currentXP + finalXP;

         promises.push(actor.update({ "system.details.xp.value": updatedXP }));
      }

      await Promise.all(promises);
      ui.notifications.info(game.i18n.localize("FADE.dialog.awardXP.awarded"));
   }
}
