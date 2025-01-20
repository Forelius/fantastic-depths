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
}

