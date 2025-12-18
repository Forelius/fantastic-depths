export class AwardXPDialog extends FormApplication {
   constructor(object = {}, options: any = {}) {
      super(object, options);
      // Keep the IDs
      this.actorIds = options.actorIds;

      // Store global XP and share factors
      this._globalXP = 0;
      this.actorXPs = {};
      this.classSystem = game.fade.registry.getSystem("classSystem");
   }

   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         id: "award-xp-dialog",
         title: game.i18n.localize("FADE.dialog.awardXP.long"),
         template: `systems/${game.system.id}/templates/apps/award-xp.hbs`,
         width: 450,
         height: "auto",
         closeOnSubmit: true,
         classes: ["fantastic-depths", ...super.defaultOptions.classes]
      });
   }

   /**
    * Provide data to Handlebars
    */
   async getData(options) {
      const data = super.getData(options);

      // Retrieve Actor docs
      const actors = this.actorIds.map(id => game.actors.get(id)).filter(a => a);
      data.globalXP = this._globalXP || 0;
      // Sum all share factors
      let totalFactors = 0;
      for (const actor of actors) {
         if (this.actorXPs[actor.id] === undefined) {
            this.actorXPs[actor.id] = {
               id: actor.id,
               name: actor.name,
               shareFactor: 1,
               xpBonus: actor.system.details.xp.bonus
            };
         }
         totalFactors += this.actorXPs[actor.id].shareFactor;
      }

      // Compute each actor's default XP from global XP + shareFactor + bonus
      actors.forEach(async (actor) => {
         const factor = this.actorXPs[actor.id].shareFactor || 0;
         let baseShare = 0;
         if (totalFactors > 0 && factor > 0) {
            baseShare = Math.floor((this._globalXP * factor) / totalFactors);
         }
         this.actorXPs[actor.id].xps = await this.classSystem.calcXPAward(actor, baseShare);
         this.actorXPs[actor.id].xpsText = this.actorXPs[actor.id].xps?.join("/");
      });

      data.actorxps = this.actorXPs;
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
         this.actorXPs[actorId].shareFactor = Number(input.value) || 0;

         // Recalculate the default XP for each actor
         this._updateActorXPFields(html);
      });
   }

   /**
    * Update each actorXP_{{id}} input in place (no full re-render).
    * We do the same math from getData(), but only to adjust the form fields.
    */
   async _updateActorXPFields(html) {
      // 1) Gather the actor docs
      const actors = this.actorIds.map(id => game.actors.get(id)).filter(a => a);
      // 2) Sum factors
      let totalFactors = Object.values(this.actorXPs).reduce<number>((sum: number, actor:any) => { return sum + (actor.shareFactor || 0) }, 0);
      // 3) For each actor, compute the new default XP
      for (const actor of actors) {
         const factor = this.actorXPs[actor.id].shareFactor || 0;
         let baseShare = 0;
         if (totalFactors > 0 && factor > 0) {
            baseShare = Math.floor((this._globalXP * factor) / totalFactors);
         }
         this.actorXPs[actor.id].xps = await this.classSystem.calcXPAward(actor, baseShare);
         this.actorXPs[actor.id].xpsText = this.actorXPs[actor.id].xps?.join("/");

         // 4) Update the actual input in the DOM
         const xpInputName = `actorXP_${actor.id}`;
         const $xpInput = html.find(`input[name="${xpInputName}"]`);
         $xpInput.val(this.actorXPs[actor.id].xpsText);
      }
   }

   /**
    * Final awarding of XP
    */
   async _updateObject(event, formData) {
      event.preventDefault();
      // expandObject converts the formData into a JS object
      // e.g. { globalXP: "200", actorXP_ABC: "120", actorShareFactor_ABC: "2", ... }
      const data = foundry.utils.expandObject(formData);

      for (const actorId of this.actorIds) {
         const actor = game.actors.get(actorId);
         if (!actor) continue;
         // The final XP is in actorXP_<id>
         const fieldName = `actorXP_${actorId}`;
         this.classSystem.awardXP(actor, data[fieldName]);
      }
   }
}
