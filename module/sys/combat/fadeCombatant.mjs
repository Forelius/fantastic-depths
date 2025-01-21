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
}

