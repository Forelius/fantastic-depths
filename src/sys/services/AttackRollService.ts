import { FDActorBase } from '../../actor/FDActorBase.js';
import { FDCombatActor } from '../../actor/FDCombatActor.js';
import { DialogFactory } from '../../dialog/DialogFactory.js';
import { FDItem } from '../../item/FDItem.js';

export type AttackRollResult = {
   attacker: FDActorBase;
   ammoItem: FDItem;
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   dialogResp: any;
   digest: string[];
   canAttack: boolean;
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   rollEval: any;
};

/**
 * Factory that returns a fully‑typed AttackRollResult.
 * Missing properties are filled with defaults.
 */
export function createAttackRollResult(overrides = {}): AttackRollResult {
   const defaults = {
      attacker: null,
      ammoItem: null,
      dialogResp: null,
      digest: [],
      canAttack: true,
      rollEval: null
   };

   return { ...defaults, ...overrides };
}

/**
* Requires class implements getAttackTypes()
* @param {any} superclass Assumes superclass is derived from FDItem.
* @returns
*/
export class AttackRollService {
   constructor() {
   }

   /**
    * Finds and returns the appropriate ammo for the specified weapon.
    * The ammo item must be equipped for it to be recognized.
    * @param weapon
    * @param owningActor Actor whose inventory is searched. Defaults to the weapon's actor.
    * @returns The equipped ammo item if it exists and its quantity is greater than zero, otherwise null.
    */
   getAmmoItem(weapon, owningActor = weapon?.actor) {
      let ammoItem = null;
      const ammoTypes = typeof weapon.getAmmoTypes === "function"
         ? weapon.getAmmoTypes()
         : (!weapon.system.ammoType || weapon.system.ammoType === "none"
            ? []
            : String(weapon.system.ammoType).split(",").map((s) => s.trim()).filter(Boolean));

      // If there's no ammo needed use the weapon itself
      if (weapon.system.isRanged === false) {
         // Do nothing, return null
      } else if (ammoTypes.length === 0 && weapon.system.quantity !== 0) {
         ammoItem = weapon;
      } else if (owningActor) {
         const ammoItems = ["ammo"];
         // Find equipped ammo whose type is one of the weapon's allowed ammo types
         ammoItem = owningActor.items.find(item => ammoItems.includes(item.type) && item.system.equipped === true
            && ammoTypes.includes(item.system.ammoType) && item.system.quantity !== 0);
      }

      return ammoItem;
   }

   /**
    * Resolve ammo, prompt for attack options, evaluate the to-hit roll, and show the attack chat card.
    * For missile attacks, consumes one unit of ammo when quantity is finite.
    * Contained items (e.g. spells on magic items) may pass an explicit attacker when the item has no actor owner.
    * @param item The weapon (or attack-capable item) being rolled.
    * @param dataset Optional form/dataset properties passed through to the attack dialog.
    * @param attacker The attacking actor; defaults to the item's actor.
    * @returns Attack roll result including attacker, ammo, dialog response, digest, evaluation, and whether the attack proceeded.
    */
   async rollAttack(item, dataset: PropertyBag = null, attacker = item.actor): Promise<AttackRollResult> {
      const systemData = item.system;
      let attackType;
      let rollData;
      // Contained spells (e.g. inside magic items) are not owned by an actor.
      // The caller may supply the attacking actor (the item's owner) in that case.
      const attackerActor = attacker as FDCombatActor;
      const attackerToken = item.actor?.token ?? attackerActor?.currentActiveToken;
      const result = createAttackRollResult({
         attacker: attackerToken ?? attackerActor,
         canAttack: true,
      });

      if (systemData.quantity === 0) {
         ui.notifications.warn(game.i18n.format('FADE.notification.zeroQuantity', { itemName: item.name }));
         result.canAttack = false;
      }
      else if (attackerActor) {
         result.ammoItem = this.getAmmoItem(item, attackerActor);
         const targetTokens = Array.from(game.user.targets);
         const targetToken: Token = targetTokens.length > 0 ? targetTokens[0] : null;

         result.dialogResp = (await DialogFactory({ dialog: 'attack' }, attackerActor, { dataset, weapon: item, targetToken }));
         attackType = result.dialogResp?.attackType;
         result.canAttack = result.dialogResp != null;
         if (result.canAttack) {
            // If not breath...
            if (systemData.damageType !== "breath" && attackType !== "breath") {
               const rollOptions = {
                  mod: result.dialogResp.mod,
                  target: targetToken?.actor,
                  ammoItem: result.ammoItem,
                  targetWeaponType: null,
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

               const attackRoll = game.fade.registry.getSystem('toHitSystem').getAttackRoll(attackerActor, item, attackType, rollOptions);
               rollData = item.getRollData();
               rollData.formula = attackRoll.formula;
               result.digest = attackRoll.digest;
            }
         }

         // Check if the attack type is a missile/ranged attack
         if (result.canAttack && attackType === 'missile') {
            result.ammoItem = await this.#missileAttack(item, attackerActor);
            result.canAttack = result.ammoItem !== null && result.ammoItem !== undefined;
         } else {
            result.ammoItem = null;
         }

         // Perform the roll if there's ammo or if it's a melee attack
         if (result.canAttack) {
            if (rollData) {
               const rollContext = { ...rollData, ...result.dialogResp || {} };
               result.rollEval = await new Roll(rollData.formula, rollContext).evaluate();
            }
            if (item.type === "weapon") {
               await item.showAttackChatMessage(result);
            }
         }
      } else {
         ui.notifications.warn(game.i18n.localize('FADE.notification.selectToken1'));
         result.canAttack = false;
      }

      return result;
   }

   /**
    * Get missile attack ammo if it exist and use it, otherwise use  weapon itself as ammo.
    * @returns
    */
   async #missileAttack(item: FDItem, owningActor: FDCombatActor = item.actor as FDCombatActor): Promise<FDItem> {
      const ammoItem = this.getAmmoItem(item, owningActor);
      await this.#tryUseAmmo(item, owningActor);
      return ammoItem;
   }

   /**
    * Gets the equipped ammo item and optionally uses it.
    * @private
    * @returns The ammo item, if one exists.
    */
   async #tryUseAmmo(item: FDItem, owningActor: FDCombatActor = item.actor as FDCombatActor): Promise<FDItem> {
      const ammoItem = this.getAmmoItem(item, owningActor);
      // If there's no ammo, show a UI notification
      if (ammoItem === undefined || ammoItem === null) {
         const message = game.i18n.format('FADE.notification.noAmmo', { actorName: owningActor?.name ?? item.actor?.name, weaponName: item.name });
         ui.notifications.warn(message);
         ChatMessage.create({ content: message, speaker: { alias: owningActor?.name ?? item.actor?.name, } });
      } else { // if (getOnly !== true) {
         // Deduct 1 ammo if not infinite
         if (ammoItem.system.quantity !== null) {
            const newQuantity = Math.max(0, ammoItem.system.quantity - 1);
            await ammoItem.update({ "system.quantity": newQuantity });
         }
      }
      return ammoItem;
   }
}