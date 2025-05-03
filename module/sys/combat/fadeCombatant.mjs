export class fadeCombatant extends Combatant {
   /**
    * Construct a Combatant document using provided data and context.
    * @param {Partial<CombatantData>} data           Initial data from which to construct the Combatant
    * @param {DocumentConstructionContext} context   Construction context options
    */
   constructor(data, context) {
      super(data, context);
   }

   get declaredAction() {
      return this.actor?.system.combat.declaredAction;
   }
   set declaredAction(value) {
      //console.debug(`set declaredAction called for ${this.actor.name}:`, value);
   }
   get attacks() {
      return this.actor?.system.combat.attacks;
   }
   get attAgainst() {
      return {
         h: this.actor?.system.combat.attAgainstH,
         m: this.actor?.system.combat.attAgainstM
      };
   }
   get canChangeAction() {
      return game.user.isGM === true || this.initiative === null;
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

   /**
    * Is the actor slowed. This only works correctly if declared actions are being used.
    */
   get isSlowed() {
      let result = false;
      const declaredAction = this.declaredAction;
      if (declaredAction) {
         const phase = declaredAction ? CONFIG.FADE.CombatManeuvers[declaredAction].phase : null;
         if (phase === 'melee' || phase === 'missile') {
            const weapon = this.actor.items?.find(item => item.type === 'weapon' && item.system.equipped);
            result = weapon?.system.isSlow ?? false;
         }
      }
      else {
         result = true;
      }
      return result;
   }

   getGroup() {
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

   async roundReset(isExit=false) {
      const promises = [];

      // Reset weapon attacks to zero
      const weapons = this.actor.items.filter(item => item.type === "weapon");
      for (let weapon of weapons) {
         promises.push(weapon.update({ "system.attacks.used": 0 }));
      }

      // Reset initiative to null
      promises.push(this.actor.update({
         "system.combat.attacks": 0,
         "system.combat.attAgainstH": 0,
         "system.combat.attAgainstM": 0,
         'system.combat.declaredAction': isExit ? null : "attack"
      }));

      await Promise.all(promises);
   }
}

