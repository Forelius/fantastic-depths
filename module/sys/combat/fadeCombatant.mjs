export class fadeCombatant extends Combatant {
   get declaredAction() {
      return this.actor.system.combat.declaredAction;
   }
   get attacks() {
      return this.actor.system.combat.attacks;
   }
   get attacksAgainst() {
      return this.actor.system.combat.attacksAgainst;
   }
   get canChangeAction() {
      return game.user.isGM === true || this.initiative === null;
   }

   get group() {
      const disposition = this.token.disposition;
      let result = null;
      if (disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY) {
         result = "friendly";
      } else if (disposition === CONST.TOKEN_DISPOSITIONS.NEUTRAL) {
         result = "neutral";
      } else if (disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE) {
         result = "hostile";
      } else if (disposition === CONST.TOKEN_DISPOSITIONS.SECRET) {
         result = "secret";
      }
      return result;
   }

   get isFriendly() {
      return this.token.disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY;
   }

   get availableActions() {
      const actions = this.actor.getAvailableActions();
      return Object.entries(CONFIG.FADE.CombatManeuvers)
         .filter(action => actions.includes(action[0]))
         .map(([key, value]) => ({
            text: game.i18n.localize(`FADE.combat.maneuvers.${key}.name`),
            value: key,
         }))
         .sort((a, b) => a.text.localeCompare(b.text))
         .reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {}); // Sort by the `text` property
   }

   async roundReset() {
      // Reset initiative to null
      if (this.group === 'hostile') {
         await this.actor.update({
            "system.combat.attacksAgainst": 0,
            'system.combat.declaredAction': "attack"
         });
      } else {
         await this.actor.update({
            "system.combat.attacksAgainst": 0,
            'system.combat.declaredAction': "nothing"
         });
      }
   }

   async exitCombat() {
      // Reset initiative to null
      this.actor.update({
         "system.combat.attacksAgainst": 0,
         "system.combat.attacks": 0,
         "system.combat.declaredAction": null
      });
   }
}

