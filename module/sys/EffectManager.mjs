export class EffectManager {
   constructor() {
      //this.effectsToKeep = ["dead", "sleep", "prone", "fly", "invisible", "blind", "deaf", "stun",
      //   "silence", "frightened", "poison", "restrain"];
   }

   async OnGameInit() {
      const path = 'systems/fantastic-depths/assets/img';
      //let allEffects = [];

      CONFIG.statusEffects = [
         ...CONFIG.statusEffects,
         { id: "hasted", name: "FADE.Effect.status.hasted", img: `${path}/ui/sprint.svg` },
         { id: "slowed", name: "FADE.Effect.status.slowed", img: `${path}/ui/snail.svg` },
         { id: "infravision", name: "FADE.Effect.status.infravision", img: `${path}/ui/night-vision.svg` },
         { id: "mirrorImaged", name: "FADE.Effect.status.mirrorImaged", img: `${path}/ui/two-shadows.svg` }
      ];
      //// Filter the existing status effects to keep only the ones you want
      //if (allEffects.length === 0) {         
      //   const sfx = CONFIG.statusEffects;// CONFIG.statusEffects.filter(effect => effectsToKeep.includes(effect.id));
      //   allEffects = [...allEffects.slice(sfx.length - allEffects.length), ...sfx];
      //}

      //allEffects.push(...CONFIG.FADE.Conditions);

      // Sync global effects into CONFIG.statusEffects
      //CONFIG.statusEffects = allEffects;
      //game.settings.set(game.system.id, 'globalEffects', allEffects);
   }

   async OnGameReady() {
      //let globalEffects = game.settings.get(game.system.id, 'globalEffects') || [];

      //// Filter the existing status effects to keep only the ones you want
      //if (globalEffects.length === 0) {
      //   const effectsToKeep = ["dead", "sleep", "prone", "fly", "invisible"];
      //   const sfx = CONFIG.statusEffects.filter(effect => effectsToKeep.includes(effect.id));
      //   globalEffects = [...globalEffects.slice(sfx.length - globalEffects.length), ...sfx];
      //}

      //game.settings.set(game.system.id, 'globalEffects', CONFIG.statusEffects);
   }

   static async applyInvulnerabilityEffect(token) {
      const actor = token.actor;
      const now = new Date();
      const lastApplied = actor.getFlag(game.system.id, "lastInvulnerabilityApplied");

      // Check if it was used within the last 7 days
      if (lastApplied && (now - lastApplied) / 1000 < 604800) {
         ui.notifications.warn("Invulnerability can only be used once per week. You suffer from sickness instead!");
         EffectManager.applySicknessEffect(actor);
      } else {
         await actor.setFlag(game.system.id, "lastInvulnerabilityApplied", now);
         EffectManager.applyEffect(actor, "invulnerability");
      }
   }

   static async applyEffect(actor, effectId) {
      const effect = CONFIG.statusEffects.find(e => e.id === effectId);
      if (effect) {
         await ActiveEffect.create(effect, { parent: actor });
      }
   }

   static async applySicknessEffect(actor) {
      const sicknessEffect = {
         label: "Sickness",
         icon: "path/to/sickness-icon.png",
         changes: [
            { key: "system.mod.combat.selfDmg", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: 5 }  // Example: adds 5 self-damage
         ],
         duration: { seconds: 600 }
      };

      await ActiveEffect.create(sicknessEffect, { parent: actor });
   }


   /**
    * New method for managing global (non-owned) effects
    * @param {any} event
    * @returns
    */
   async onManageGlobalActiveEffect(event) {
      event.preventDefault();
      const action = event.target.dataset.action ?? event.target.parentElement.dataset.action;
      const parent = event.target.closest('.item');
      const effectId = parent.dataset.effectId;

      // Retrieve global effects from the persistent setting
      let globalEffects = game.settings.get(game.system.id, 'globalEffects');
      let effect = globalEffects.find(e => e.id === effectId);

      // Handle the specific action
      switch (action) {
         case 'create':
         case 'createEffect':
            ui.notifications.warn('Cannot create new effects from this interface.');
            break;

         case 'edit':
         case 'editEffect':
            if (effect) {
               // Edit global effect by creating a temporary ActiveEffect
               const tempEffect = new ActiveEffect(effect);
               return tempEffect.sheet.render(true);
            }
            break;

         case 'delete':
         case 'deleteEffect':
            globalEffects = globalEffects.filter(e => e.id !== effectId);
            game.settings.set(game.system.id, 'globalEffects', globalEffects);
            ui.notifications.info('Effect deleted from global library.');
            break;

         case 'toggle':
         case 'toggleEffect':
            ui.notifications.warn('Toggling is only available for owned effects.');
            break;
      }
   }

   /**
   * Manage Active Effect instances through an Actor or Item Sheet via effect control buttons.
   * @param {MouseEvent} event The left-click event on the effect control
   * @param {Actor|Item} owner The owning actor which manages this effect
    */
   static async onManageActiveEffect(event, owner) {
      event.preventDefault();
      event.stopPropagation();

      const action = event.target.dataset.action ?? event.target.parentElement.dataset.action;
      let result = null;

      if (action === 'createEffect') {
         const dataset = event.target.closest(".items-header").dataset;
         //let aeCls = getDocumentClass("ActiveEffect");
         //aeCls.createDialog({}, { parent: owner });
         result = owner.createEmbeddedDocuments('ActiveEffect', [
            {
               name: game.i18n.format('DOCUMENT.New', {
                  type: game.i18n.localize('DOCUMENT.ActiveEffect'),
               }),
               img: 'icons/svg/aura.svg',
               origin: owner.uuid,
               'duration.rounds': dataset.effectType === 'temporary' ? 1 : undefined,
               disabled: dataset.effectType === 'inactive',
            }
         ]);
      } else {
         const dataset = event.target.closest('.item').dataset;
         let effect = null;
         if (owner instanceof Actor) {
            // From actor
            effect = owner.allApplicableEffects().find(fx => fx.id === dataset.effectId)
         } else {
            // From item
            effect = owner.effects.get(dataset.effectId);
         }
         switch (action) {
            case 'editEffect':
               result = effect.sheet.render(true);
               break;
            case 'deleteEffect':
               result = await effect.delete();
               break;
            case 'toggleEffect':
               result = await effect.update({ disabled: !effect.disabled });
               break;
         }
      }

      return result;
   }

   /**
    * Prepare the data structure for Active Effects which are currently embedded in an Actor or Item.
    * @param {ActiveEffect[]} effects    A collection or generator of Active Effect documents to prepare sheet data for
    * @return {object}                   Data for rendering
    */
   static prepareActiveEffectCategories(effects) {
      // Define effect header categories
      const categories = {
         temporary: {
            type: 'temporary',
            label: game.i18n.localize('FADE.Effect.Temporary'),
            effects: [],
         },
         passive: {
            type: 'passive',
            label: game.i18n.localize('FADE.Effect.Passive'),
            effects: [],
         },
         inactive: {
            type: 'inactive',
            label: game.i18n.localize('FADE.Effect.Inactive'),
            effects: [],
         },
      };

      // Iterate over active effects, classifying them into categories
      for (const effect of effects) {
         // Fix for unknown source
         effect.sourceNameFix = effect.sourceName;
         if ((effect.sourceName === "Unknown" || effect.sourceName === "None") && effect.parent) {
            effect.sourceNameFix = effect.parent.name ?? effect.sourceName;
         }

         if (effect.disabled) categories.inactive.effects.push(effect);
         else if (effect.isTemporary) categories.temporary.effects.push(effect);
         else categories.passive.effects.push(effect);
      }
      return categories;
   }

   /**
    * Prepare the data structure for Active Effects which are currently embedded in an Actor or Item.
    * @param {ActiveEffect[]} effects    A collection or generator of Active Effect documents to prepare sheet data for
    * @return {object}                   Data for rendering
    */
   static preparePassiveEffects(effects) {
      // Define effect header categories
      const categories = {
         passive: {
            type: 'passive',
            label: game.i18n.localize('FADE.Effect.Passive'),
            effects: [],
         }
      };

      // Iterate over active effects, classifying them into categories
      for (const effect of effects) {
         // Fix for unknown source
         effect.sourceNameFix = effect.sourceName;
         if (effect.sourceName === "Unknown" && effect.parent) {
            effect.sourceNameFix = effect.parent.name ?? effect.sourceName;
         }
         categories.passive.effects.push(effect);
      }
      return categories;
   }
}