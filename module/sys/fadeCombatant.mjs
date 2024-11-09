export class fadeCombatant extends Combatant {

   /**
    * Handle a Combatant control toggle
    * @param {Event} event   The originating mousedown event
    */
   async onCombatantControl(event) {
      const systemData = this.system;
      event.preventDefault();
      event.stopPropagation();
      const btn = event.currentTarget;
      const actorData = this.actor.system;
      const encounter = actorData.encounter;

      switch (btn.dataset.control) {
         case 'isRetreating':
            this.actor.update({ 'system.encounter.isRetreating': !encounter.isRetreating })
            break;
         case 'isCasting':
            this.actor.update({ 'system.encounter.isCasting': !encounter.isCasting })
            break;
         case 'isItemCasting':
            this.actor.update({ 'system.encounter.isItemCasting': !encounter.isItemCasting })
            break;
         case 'isRanged':
            this.actor.update({ 'system.encounter.isRanged': !encounter.isRanged })
            break;
      }
   }
}

