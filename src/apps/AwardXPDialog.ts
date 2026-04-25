const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
import { ClassSystemBase } from "../sys/registry/ClassSystem.js";

type ActorXP = {
   id: string;
   name: string;
   shareFactor: number;
   xpBonus: number;
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   xps: any[];
   xpsText: string;
};

export function createActorXP(overrides = {}) {
   const defaults = {
      id: null,
      name: null,
      shareFactor: 1,
      xpBonus: 0,
      xps: [],
      xpsText: ""
   };
   return { ...defaults, ...overrides };
}

export class AwardXPDialog extends HandlebarsApplicationMixin(ApplicationV2) {
   actorXPs: Record<string, ActorXP>;
   classSystem: ClassSystemBase;

   constructor(object = {}, options: any = {}) {
      super(options);
      this.actorIds = options.actorIds;
      this._globalXP = 0;
      this.actorXPs = {};
      this.classSystem = game.fade.registry.getSystem("classSystem");
   }

   get title() {
      return game.i18n.localize("FADE.dialog.awardXP.long");
   }

   static DEFAULT_OPTIONS = {
      id: "award-xp-dialog",
      position: {
         width: 450,
         height: "auto",
      },
      classes: ["fantastic-depths"],
      actions: {
         awardXP: AwardXPDialog.#onAwardXP,
      },
   };

   static PARTS = {
      main: {
         template: `systems/fantastic-depths/templates/apps/award-xp.hbs`,
      },
   };

   async _prepareContext(_options) {
      const actors = this.actorIds.map(id => game.actors.get(id)).filter(a => a);
      let totalFactors = 0;
      for (const actor of actors) {
         if (this.actorXPs[actor.id] === undefined) {
            this.actorXPs[actor.id] = createActorXP({
               id: actor.id,
               name: actor.name,
               shareFactor: 1,
               xpBonus: actor.system.details.xp.bonus
            });
         }
         totalFactors += this.actorXPs[actor.id].shareFactor;
      }

      for (const actor of actors) {
         const factor = this.actorXPs[actor.id].shareFactor || 0;
         let baseShare = 0;
         if (totalFactors > 0 && factor > 0) {
            baseShare = Math.floor((this._globalXP * factor) / totalFactors);
         }
         this.actorXPs[actor.id].xps = await this.classSystem.calcXPAward(actor, baseShare);
         this.actorXPs[actor.id].xpsText = this.actorXPs[actor.id].xps?.join("/");
      }

      return {
         globalXP: this._globalXP || 0,
         actorxps: this.actorXPs,
      };
   }

   _onRender(_context, _options) {
      const globalXPInput = this.element.querySelector('input[name="globalXP"]');
      const globalXPHandler = (event) => {
         this._globalXP = Number(event.currentTarget.value) || 0;
         this._updateActorXPFields();
      };
      globalXPInput?.addEventListener("change", globalXPHandler);
      globalXPInput?.addEventListener("blur", globalXPHandler);

      this.element.querySelectorAll(".share-factor").forEach(el => {
         const handler = (event) => {
            const input = event.currentTarget as HTMLInputElement;
            const actorId = input.name.split("actorShareFactor_")[1];
            this.actorXPs[actorId].shareFactor = Number(input.value) || 0;
            this._updateActorXPFields();
         };
         el.addEventListener("change", handler);
         el.addEventListener("blur", handler);
      });
   }

   async _updateActorXPFields() {
      const actors: Actor[] = this.actorIds.map(id => game.actors.get(id)).filter(a => a);
      const totalFactors = Object.values(this.actorXPs).reduce<number>((sum, actorXP: ActorXP) => sum + (actorXP.shareFactor || 0), 0);
      for (const actor of actors) {
         const factor = this.actorXPs[actor.id].shareFactor || 0;
         let baseShare = 0;
         if (totalFactors > 0 && factor > 0) {
            baseShare = Math.floor((this._globalXP * factor) / totalFactors);
         }
         this.actorXPs[actor.id].xps = await this.classSystem.calcXPAward(actor, baseShare);
         this.actorXPs[actor.id].xpsText = this.actorXPs[actor.id].xps?.join("/");

         const xpInput = this.element.querySelector(`input[name="actorXP_${actor.id}"]`) as HTMLInputElement | null;
         if (xpInput) xpInput.value = this.actorXPs[actor.id].xpsText;
      }
   }

   static async #onAwardXP(event) {
      event.preventDefault();
      for (const actorId of this.actorIds) {
         const actor = game.actors.get(actorId);
         if (!actor) continue;
         const xpInput = this.element.querySelector(`input[name="actorXP_${actorId}"]`) as HTMLInputElement | null;
         if (xpInput) this.classSystem.awardXP(actor, xpInput.value);
      }
      this.close();
   }
}
