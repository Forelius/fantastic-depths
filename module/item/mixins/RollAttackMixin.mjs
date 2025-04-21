import { DialogFactory } from '/systems/fantastic-depths/module/dialog/DialogFactory.mjs';

/**
* Requires class implements getAttackTypes()
* @param {any} superclass Assumes superclass is derived from fadeItem.
* @returns
*/
const RollAttackMixin = (superclass) => class extends superclass {
   /**
   * Handle clickable rolls.
   * @override
   * @param {Event} event The originating click event
   */
   async rollAttack() {
      const systemData = this.system;
      // The selected token, not the actor
      let attackType;
      let rollData;
      let result = {
         attacker: this.actor?.token || this.actor || canvas.tokens.controlled?.[0],
         ammoItem: null,
         dialogResp: null,
         digest: [],
         canAttack: true,
         rollEval: null
      };

      if (this.system.quantity === 0) {
         ui.notifications.warn(game.i18n.format('FADE.notification.zeroQuantity', { itemName: this.name }));
         result.canAttack = false;
      }
      else if (result.attacker) {
         result.ammoItem = this.actor?.getAmmoItem(this);
         const targetTokens = Array.from(game.user.targets);
         const targetToken = targetTokens.length > 0 ? targetTokens[0] : null;

         result.dialogResp = (await DialogFactory({ dialog: 'attack' }, this.actor, { weapon: this, targetToken }));
         attackType = result.dialogResp?.attackType;
         result.canAttack = result.dialogResp != null;
         if (result.canAttack) {
            // If not breath...
            if (systemData.damageType !== "breath" && attackType !== "breath") {
               let rollOptions = {
                  mod: result.dialogResp.mod,
                  target: targetToken?.actor,
                  ammoItem: result.ammoItem,
                  // This is the roll if no advantage or disadvantage. See below.
                  attackRoll: result.dialogResp.attackRoll
               };
               if (result.dialogResp.targetWeaponType) {
                  rollOptions.targetWeaponType = result.dialogResp.targetWeaponType;
               }

               // Handle advantage or disadvantage.
               if (result.dialogResp.rollFormulaType === 'advantage') {
                  rollOptions.attackRoll = `{${result.dialogResp.attackRoll},${result.dialogResp.attackRoll}}kh`;
               } else if (result.dialogResp.rollFormulaType === 'disadvantage') {
                  rollOptions.attackRoll = `{${result.dialogResp.attackRoll},${result.dialogResp.attackRoll}}kl`;
               }

               const attackRoll = game.fade.registry.getSystem('toHitSystem').getAttackRoll(this.actor, this, attackType, rollOptions);
               rollData = this.getRollData();
               rollData.formula = attackRoll.formula;
               result.digest = attackRoll.digest;
            }
         }

         // Check if the attack type is a missile/ranged attack
         if (result.canAttack && attackType === 'missile') {
            result.ammoItem = await this.#missileAttack();
            result.canAttack = ammoItem !== null && ammoItem !== undefined;
         } else {
            result.ammoItem = null;
         }

         // Perform the roll if there's ammo or if it's a melee attack
         if (result.canAttack) {
            if (rollData) {
               const rollContext = { ...rollData, ...result.dialogResp || {} };
               result.rollEval = await new Roll(rollData.formula, rollContext).evaluate();
            }
            if (this.showAttackChatMessage) {
               await this.showAttackChatMessage(result);
            }
         }
      } else {
         ui.notifications.warn(game.i18n.localize('FADE.notification.selectToken1'));
      }

      return result;
   }

   async #missileAttack() {
      let ammoItem = this.actor?.getAmmoItem(this);
      await this.#tryUseAmmo();
      // No need to show ammo item if it is also the weapon we are using (thrown).
      ammoItem = ammoItem?.id === this.id ? null : ammoItem;
      return ammoItem;
   }

   /**
    * Gets the equipped ammo item and optionally uses it.
    * @private
    * @param {any} getOnly If true, does not use, just gets.
    * @returns The ammo item, if one exists.
    */
   async #tryUseAmmo(getOnly = false) {
      const ammoItem = this.actor?.getAmmoItem(this);
      // If there's no ammo, show a UI notification
      if (ammoItem === undefined || ammoItem === null) {
         const message = game.i18n.format('FADE.notification.noAmmo', { actorName: this.actor?.name, weaponName: this.name });
         ui.notifications.warn(message);
         ChatMessage.create({ content: message, speaker: { alias: this.actor.name, } });
      } else if (getOnly !== true) {
         // Deduct 1 ammo if not infinite
         if (ammoItem.system.quantity !== null) {
            const newQuantity = Math.max(0, ammoItem.system.quantity - 1);
            await ammoItem.update({ "system.quantity": newQuantity });
         }
      }
      return ammoItem;
   }
}

export { RollAttackMixin }