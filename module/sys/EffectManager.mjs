export class EffectManager {

   async OnGameInit() {
      const path = 'systems/fantastic-depths/assets/img';
      let allEffects = [];

      // Filter the existing status effects to keep only the ones you want
      if (allEffects.length === 0) {
         const effectsToKeep = ["dead", "sleep", "prone", "fly", "invisible", "blind", "deaf", "stunned", "silenced", "frightened"];
         const sfx = CONFIG.statusEffects;// CONFIG.statusEffects.filter(effect => effectsToKeep.includes(effect.id));
         allEffects = [...allEffects.slice(sfx.length - allEffects.length), ...sfx];
      }

      allEffects.push(...CONFIG.FADE.Conditions);

      // Sync global effects into CONFIG.statusEffects
      CONFIG.statusEffects = allEffects;
      //await game.settings.set(game.system.id, 'globalEffects', allEffects);
   }

   async OnGameReady() {
      //let globalEffects = await game.settings.get(game.system.id, 'globalEffects') || [];

      //// Filter the existing status effects to keep only the ones you want
      //if (globalEffects.length === 0) {
      //   const effectsToKeep = ["dead", "sleep", "prone", "fly", "invisible"];
      //   const sfx = CONFIG.statusEffects.filter(effect => effectsToKeep.includes(effect.id));
      //   globalEffects = [...globalEffects.slice(sfx.length - globalEffects.length), ...sfx];
      //}

      await game.settings.set(game.system.id, 'globalEffects', CONFIG.statusEffects);
   }

   //static async applyInvulnerabilityEffect(token) {
   //   const actor = token.actor;
   //   const now = new Date();
   //   const lastApplied = actor.getFlag(game.system.id, "lastInvulnerabilityApplied");

   //   // Check if it was used within the last 7 days
   //   if (lastApplied && (now - lastApplied) / 1000 < 604800) {
   //      ui.notifications.warn("Invulnerability can only be used once per week. You suffer from sickness instead!");
   //      EffectManager.applySicknessEffect(actor);
   //   } else {
   //      await actor.setFlag(game.system.id, "lastInvulnerabilityApplied", now);
   //      EffectManager.applyEffect(actor, "invulnerability");
   //   }
   //}

   static async applyEffect(actor, effectId) {
      const effect = CONFIG.statusEffects.find(e => e.id === effectId);
      if (effect) {
         await ActiveEffect.create(effect, { parent: actor });
      }
   }

   //static async applySicknessEffect(actor) {
   //   const sicknessEffect = {
   //      label: "Sickness",
   //      icon: "path/to/sickness-icon.png",
   //      changes: [
   //         { key: "system.mod.combat.selfDmg", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: 5 }  // Example: adds 5 self-damage
   //      ],
   //      duration: { seconds: 600 }
   //   };

   //   await ActiveEffect.create(sicknessEffect, { parent: actor });
   //}


   /**
    * New method for managing global (non-owned) effects
    * @param {any} event
    * @returns
    */
   async onManageGlobalActiveEffect(event) {
      event.preventDefault();
      const a = event.currentTarget;
      const li = a.closest('li');
      const effectId = li.dataset.effectId;

      // Retrieve global effects from the persistent setting
      let globalEffects = game.settings.get(game.system.id, 'globalEffects');
      let effect = globalEffects.find(e => e.id === effectId);

      // Handle the specific action
      switch (a.dataset.action) {
         case 'create':
            ui.notifications.warn('Cannot create new effects from this interface.');
            break;

         case 'edit':
            if (effect) {
               // Edit global effect by creating a temporary ActiveEffect
               const tempEffect = new ActiveEffect(effect);
               return tempEffect.sheet.render(true);
            }
            break;

         case 'delete':
            globalEffects = globalEffects.filter(e => e.id !== effectId);
            await game.settings.set(game.system.id, 'globalEffects', globalEffects);
            ui.notifications.info('Effect deleted from global library.');
            break;

         case 'toggle':
            ui.notifications.warn('Toggling is only available for owned effects.');
            break;
      }
   }

   /**
   * Manage Active Effect instances through an Actor or Item Sheet via effect control buttons.
   * @param {MouseEvent} event      The left-click event on the effect control
   * @param {Actor|Item} owner      The owning document which manages this effect
    */
   static onManageActiveEffect(event, owner) {
      event.preventDefault();
      const a = event.currentTarget;
      const li = a.closest('li');
      const effect = li.dataset.effectId ? owner.effects.get(li.dataset.effectId) : null;
      switch (a.dataset.action) {
         case 'create':
            return owner.createEmbeddedDocuments('ActiveEffect', [
               {
                  name: game.i18n.format('DOCUMENT.New', {
                     type: game.i18n.localize('DOCUMENT.ActiveEffect'),
                  }),
                  img: 'icons/svg/aura.svg',
                  origin: owner.uuid,
                  'duration.rounds': li.dataset.effectType === 'temporary' ? 1 : undefined,
                  disabled: li.dataset.effectType === 'inactive',
               },
            ]);
         case 'edit':
            return effect.sheet.render(true);
         case 'delete':
            return effect.delete();
         case 'toggle':
            return effect.update({ disabled: !effect.disabled });
      }
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
      for (let e of effects) {
         // Fix for unknown source
         e.sourceNameFix = e.sourceName;
         if (e.sourceName === "Unknown" && e.parent) {
            e.sourceNameFix = e.parent.name ?? e.sourceName;
         }

         if (e.disabled) categories.inactive.effects.push(e);
         else if (e.isTemporary) categories.temporary.effects.push(e);
         else categories.passive.effects.push(e);
      }
      return categories;
   }
}