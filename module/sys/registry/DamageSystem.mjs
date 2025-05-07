export class DamageSystem {
   /**
    * Applies damage or healing to the actor.
    * @public
    * @param {any} actor
    * @param {any} delta The delta to change the HP by. A positive value indicate healing and negative indicates damage.
    * @param {any} damageType
    * @param {any} source
    */
   async ApplyDamage(actor, delta, damageType, source = null) {
      const systemData = actor.system;
      const tokenName = actor.parent?.name ?? actor.name;
      let finalDelta = delta;
      const prevHP = systemData.hp.value;
      let finalHP = Math.min((systemData.hp.value + finalDelta), systemData.hp.max);
      let digest = [];
      const isHeal = delta > 0;
      // Damage mitigation
      let damageMitigated = 0;
      let isKilled = false;
      let isRestoredToLife = false;

      if (isHeal) {
         // Restoring HP
         digest.push(game.i18n.format('FADE.Chat.damageRoll.restored', { hp: (finalHP - prevHP), tokenName: tokenName }));
      } else {
         // Damage!
         switch (damageType) {
            case 'physical':
               damageMitigated = systemData.mod.combat.selfDmg;
               break;
            case 'breath':
               damageMitigated = systemData.mod.combat.selfDmgBreath;
               damageMitigated += -finalDelta * systemData.mod.combat.selfDmgBreathScale;
               break;
            case 'magic':
               damageMitigated = systemData.mod.combat.selfDmgMagic;
               break;
         }

         // Don't allow addition of damage via damage mitigation
         damageMitigated = Math.min(damageMitigated, 0);

         if (damageMitigated !== 0) {
            finalDelta += MathdamageMitigated;
            digest.push(game.i18n.format('FADE.Chat.damageRoll.mitigated', { damage: damageMitigated, type: damageType }));
         }
         finalHP = prevHP + finalDelta;
         digest.push(game.i18n.format('FADE.Chat.damageRoll.applied', { damage: -finalDelta, type: damageType, tokenName: tokenName }));
      }
      await actor.update({ "system.hp.value": finalHP });

      // Check if the actor already has the "Dead" effect
      let hasDeadStatus = actor.statuses.has("dead");

      if (prevHP > 0 && finalHP <= 0) {
         isKilled = hasDeadStatus === false;
         if (isKilled) {
            if (actor.type === 'character') {
               systemData.combat.deathCount++;
               await actor.update({
                  "system.combat.deathCount": systemData.combat.deathCount + 1,
                  "system.combat.isDead": true
               });
            }
            await actor.toggleStatusEffect("dead", { active: true, overlay: true });
            digest.push(game.i18n.format('FADE.Chat.damageRoll.killed', { tokenName: tokenName }));
         }
      } else if (prevHP < 0 && finalHP > 0) {
         isRestoredToLife = hasDeadStatus === true;
         if (isRestoredToLife) {
            await actor.update({ "system.combat.isDead": false });
            await actor.toggleStatusEffect("dead", { active: false });
            digest.push(game.i18n.format('FADE.Chat.damageRoll.restoredLife', { tokenName: tokenName }));
         }
      }

      let chatContent = source ? `<div class="text-size18">${source.name}</div>` : "";
      for (let msg of digest) {
         chatContent += `<div>${msg}</div>`;
      }

      if (game.fade.toastManager) {
         game.fade.toastManager.showHtmlToast(chatContent, "info", game.settings.get("core", "rollMode"));
      }

      const speaker = { alias: game.users.get(game.userId).name };  // Use the player's name as the speaker
      let chatData = {
         speaker: speaker,
         content: chatContent
      };
      ChatMessage.create(chatData);
   }
}