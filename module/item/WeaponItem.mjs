import { GearItem } from './GearItem.mjs';
import { DialogFactory } from '../dialog/DialogFactory.mjs';
import { ChatFactory, CHAT_TYPE } from '../chat/ChatFactory.mjs';

export class WeaponItem extends GearItem {
   constructor(data, context) {
      /** Default behavior, just call super() and do all the default Item inits */
      super(data, context);
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
      this._prepareEffects();
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
      this._prepareModText();
      this._prepareDamageRollLabel();
   }

   async getDamageRoll(attackType, attackMode, resp, targetWeaponType) {
      const weaponData = this.system;
      const attacker = this.parent;
      const attackerData = this.parent.system;
      let evaluatedRoll = await this.getEvaluatedRoll(weaponData.damageRoll);
      let formula = evaluatedRoll?.formula;
      let digest = [];
      let modifier = 0;
      let hasDamage = true;

      if (attackType === 'melee') {
         if (weaponData.mod.dmg != null && weaponData.mod.dmg != 0) {
            modifier += weaponData.mod.dmg;
            digest.push(game.i18n.format('FADE.Chat.rollMods.weaponMod', { mod: weaponData.mod.dmg }));
         }
         // If the attacker has ability scores...
         if (attackerData.abilities && attackerData.abilities.str.mod != 0) {
            modifier += attackerData.abilities.str.mod;
            digest.push(game.i18n.format('FADE.Chat.rollMods.strengthMod', { mod: attackerData.abilities.str.mod }));
         }
         if (attackerData.mod.combat.dmg != null && attackerData.mod.combat.dmg != 0) {
            modifier += attackerData.mod.combat.dmg;
            digest.push(game.i18n.format('FADE.Chat.rollMods.effectMod', { mod: attackerData.mod.combat.dmg }));
         }
      } else if (attackType === 'missile') {
         if (weaponData.mod.dmgRanged != null && weaponData.mod.dmgRanged != 0) {
            modifier += weaponData.mod.dmgRanged;
            digest.push(game.i18n.format('FADE.Chat.rollMods.weaponMod', { mod: weaponData.mod.dmgRanged }));
         }
         // If the attacker has ability scores...
         if (attackerData.abilities && attackerData.abilities.str.mod != 0 && weaponData.tags.includes("thrown")) {
            modifier += attackerData.abilities.str.mod;
            digest.push(game.i18n.format('FADE.Chat.rollMods.strengthMod', { mod: attackerData.abilities.str.mod }));
         }
         if (attackerData.mod.combat.dmgRanged != null && attackerData.mod.combat.dmgRanged != 0) {
            modifier += attackerData.mod.combat.dmgRanged;
            digest.push(game.i18n.format('FADE.Chat.rollMods.effectMod', { mod: attackerData.mod.combat.dmgRanged }));
         }
      } else if (attackType === "breath") {

      }

      if (resp?.mod && resp?.mod !== 0) {
         modifier += resp.mod;
         digest.push(game.i18n.format('FADE.Chat.rollMods.manual', { mod: resp.mod }));
      }

      if (modifier <= 0 && evaluatedRoll?.total <= 0) {
         hasDamage = false;
      }

      // Check weapon mastery
      const masteryEnabled = game.settings.get(game.system.id, "weaponMastery");
      if (hasDamage && masteryEnabled && (weaponData.mastery !== "" || weaponData.natural)) {
         let attackerMastery = attacker.items.find((item) => item.type === 'mastery' && item.name === weaponData.mastery);
         if (attackerMastery === undefined && attacker.type === 'monster') {
            attackerMastery = {
               system: {
                  primaryType: 'all',
                  pDmgFormula: this.system.damageRoll
               }
            };
         }
         if (attackerMastery) {
            // If the target weapon type matches the weapon mastery primary target type or mastery effects all weapon types the same...
            if (targetWeaponType && (targetWeaponType === attackerMastery.system.primaryType || attackerMastery.system.primaryType === 'all')) {
               formula = attackerMastery.system.pDmgFormula;
               digest.push(game.i18n.format('FADE.Chat.rollMods.masteryPrimDmg'));
            }
            // Else if the secondary damage is specified...
            else if (attackerMastery.system.sDmgFormula) {
               formula = attackerMastery.system.sDmgFormula;
               digest.push(game.i18n.format('FADE.Chat.rollMods.masterySecDmg'));
            }
            else {
               // Else use primary damage type.
               formula = attackerMastery.system.pDmgFormula;
               digest.push(game.i18n.format('FADE.Chat.rollMods.masterySecDmg'));
            }
         } else {
            // Half damage if unskilled use.
            formula = `floor(${formula}/2)`;
            digest.push(game.i18n.format('FADE.Chat.rollMods.unskilledUse', { mod: "/2" }));
         }

         // This is where the modifiers are applied to the formula. It only supports addition mode.
         if (modifier !== 0) {
            formula = formula ? `${formula}+${modifier}` : `${modifier}`;
         }
      }

      return { formula, type: weaponData.damageType, digest, hasDamage };
   }

   /**
    * Attack modes are things like one-handed, offhand and two-handed
    */
   getAttackModes() {
      let result = [];
      const twoHand = this.system.grip === '2H';
      const breath = this.system.breath?.length > 0;
      const natural = this.system.natural === true;

      if (natural || breath) {
         result.push({ text: game.i18n.format('FADE.dialog.attackMode.natural'), value: "natural" });
      } else if (twoHand) {
         result.push({ text: game.i18n.format('FADE.dialog.attackMode.2hand'), value: "2hand" });
      } else {
         result.push({ text: game.i18n.format('FADE.dialog.attackMode.1hand'), value: "1hand" });
      }

      return result;
   }

   /**
    * Retrieves an array of attack types. Attack types include breath, missile and melee.
    * @returns An array of valid attack types for this weapon.
    */
   getAttackTypes() {
      let result = [];
      const isBreath = this.system.breath?.length > 0 && this.system.savingThrow === "breath";
      if (isBreath) {
         result.push({ text: game.i18n.localize('FADE.dialog.attackType.breath'), value: "breath" });
      } else {
         const owner = this.actor ?? null;
         const masteryEnabled = game.settings.get(game.system.id, "weaponMastery");
         if (owner && masteryEnabled) {
            // Weapon mastery is enabled, so weapons can gain the ability to do ranged at certain levels.
            const ownerMastery = owner.items.find((item) => item.type === 'mastery' && item.name === this.system.mastery);
            if (ownerMastery) {
               if (ownerMastery.system.canRanged) result.push({ text: game.i18n.localize('FADE.dialog.attackType.missile'), value: "missile" });
               if (this.system.canMelee) result.push({ text: game.i18n.localize('FADE.dialog.attackType.melee'), value: "melee" });
            }
         }

         if (result.length === 0) {
            // Simple mode. Either the weapon can melee, missile or both, or not.
            if (this.system.canRanged) result.push({ text: game.i18n.localize('FADE.dialog.attackType.missile'), value: "missile" });
            if (this.system.canMelee) result.push({ text: game.i18n.localize('FADE.dialog.attackType.melee'), value: "melee" });
         }
      }
      return result;
   }

   /**
   * Handle clickable rolls.
   * @override
   * @param {Event} event The originating click event
   */
   async roll() {
      const systemData = this.system;
      // The selected token, not the actor
      const attacker = this.actor || canvas.tokens.controlled?.[0];
      const rollData = this.getRollData();
      let dialogResp;
      let canAttack = true;
      let digest = [];
      let result = null;
      let hasRoll = false;

      if (this.system.quantity === 0) {
         ui.notifications.warn(game.i18n.format('FADE.notification.zeroQuantity', { itemName: this.name }));
      }
      else if (attacker) {
         let ammoItem = this.actor?.getAmmoItem(this);
         try {
            const targetTokens = Array.from(game.user.targets);
            const targetToken = targetTokens.length > 0 ? targetTokens[0] : null;

            dialogResp = await DialogFactory({ dialog: 'attack' }, this.actor, { weapon: this, targetToken: targetToken });
            if (dialogResp?.resp) {
               // If not breath...
               if (systemData.damageType !== "breath" && dialogResp.resp.attackType !== "breath") {
                  let rollOptions = {
                     mod: dialogResp.resp.mod,
                     target: targetToken?.actor,
                     ammoItem
                  };
                  if (dialogResp.resp.targetWeaponType) {
                     rollOptions.targetWeaponType = dialogResp.resp.targetWeaponType;
                  }
                  let attackRoll = this.actor.getAttackRoll(this, dialogResp.resp.attackType, rollOptions);
                  rollData.formula = attackRoll.formula;
                  digest = attackRoll.digest;
                  hasRoll = true;
               }
            } else {
               canAttack = false;
            }
         } catch (error) {
            // Close button pressed or other error
            console.error("attack roll error:", error);
            canAttack = false;
         }

         // Check if the attack type is a missile/ranged attack
         if (canAttack && dialogResp.resp.attackType === 'missile') {
            await this.#tryUseAmmo();
            canAttack = ammoItem !== null && ammoItem !== undefined;
            // No need to show ammo item if it is also the weapon we are using (thrown).
            ammoItem = ammoItem.id === this.id ? null : ammoItem;
         } else {
            ammoItem = null;
         }

         // Perform the roll if there's ammo or if it's a melee attack
         if (canAttack && dialogResp) {
            let rolled = null;
            if (hasRoll) {
               const rollContext = { ...rollData, ...dialogResp.resp || {} };
               rolled = await new Roll(rollData.formula, rollContext).evaluate();
            }

            const chatData = {
               resp: dialogResp.resp, // the dialog response
               caller: this, // the weapon
               context: attacker,
               roll: rolled,
               digest: digest
            };

            const builder = new ChatFactory(CHAT_TYPE.ATTACK_ROLL, chatData, { ammoItem });
            await builder.createChatMessage();
         }
      } else {
         ui.notifications.warn(game.i18n.localize('FADE.notification.selectToken1'));
      }

      return result;
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

   _prepareModText() {
      const systemData = this.system;
      let toHitText = "";
      let dmgText = "";
      if (systemData.canMelee) {
         toHitText += systemData.mod.toHit ?? "0";
         dmgText += systemData.mod.dmg ?? "0";
      }
      if (systemData.canMelee === true && systemData.canRanged === true) {
         toHitText += "/";
         dmgText += "/";
      }
      if (systemData.canRanged) {
         toHitText += systemData.mod.toHitRanged ?? "0";
         dmgText += systemData.mod.dmgRanged ?? "0";
      }
      systemData.mod.toHitText = toHitText;
      systemData.mod.dmgText = dmgText;
   }

   _prepareEffects() {
      // Reset mod values.
      this.system.mod.dmg = 0;
      this.system.mod.toHit = 0;
      this.system.mod.dmgRanged = 0;
      this.system.mod.toHitRanged = 0;
      this._processNonTransferActiveEffects();
   }

   async _prepareDamageRollLabel() {
      this.system.damageRollLabel = await this.getEvaluatedRollFormula(this.system.damageRoll);
   }
}