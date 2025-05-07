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

      if (isHeal) {
         // Restoring HP
         digest.push(game.i18n.format('FADE.Chat.damageRoll.restored', { hp: (finalHP - prevHP), tokenName: tokenName }));
      } else {
         // Damage!
         damageMitigated = this.#mitigateDamage(damageType, actor, finalDelta);

         if (damageMitigated !== 0) {
            finalDelta += MathdamageMitigated;
            digest.push(game.i18n.format('FADE.Chat.damageRoll.mitigated', { damage: damageMitigated, type: damageType }));
         }
         finalHP = prevHP + finalDelta;
         digest.push(game.i18n.format('FADE.Chat.damageRoll.applied', { damage: -finalDelta, type: damageType, tokenName: tokenName }));
      }

      await actor.update({ "system.hp.value": finalHP });

      this.#sendChatAndToast(source, digest);
   }

   #mitigateDamage(damageType, actor, finalDelta) {
      let result = 0;
      const combatMods = actor.system.mod.combat;
      switch (damageType) {
         case 'physical':
            result = this.#getPhysicalMitigation(actor);
            break;
         case 'breath':
            result = combatMods.selfDmgBreath;
            result += -finalDelta * combatMods.selfDmgBreathScale;
            break;
         case 'magic':
            result = combat.selfDmgMagic;
            break;
      }

      // Don't allow addition of damage via damage mitigation
      result = Math.min(result, 0);
      return result;
   }

   #getPhysicalMitigation(actor) {
      let result = actor.system.mod.combat.selfDmg;

      return result;
   }

   #sendChatAndToast(source, digest) {
      let chatContent = source ? `<div class="text-size18">${source.name}</div>` : "";
      for (let msg of digest) {
         chatContent += `<div>${msg}</div>`;
      }

      if (game.fade.toastManager) {
         game.fade.toastManager.showHtmlToast(chatContent, "info", game.settings.get("core", "rollMode"));
      }

      const speaker = { alias: game.users.get(game.userId).name }; // Use the player's name as the speaker
      let chatData = {
         speaker: speaker,
         content: chatContent
      };
      ChatMessage.create(chatData);
   }
}