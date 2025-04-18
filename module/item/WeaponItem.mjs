import { ChatFactory, CHAT_TYPE } from '/systems/fantastic-depths/module/chat/ChatFactory.mjs';
import { RollAttackMixin } from './mixins/RollAttackMixin.mjs';
import { GearItem } from './GearItem.mjs';

export class WeaponItem extends RollAttackMixin(GearItem) {
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

   async getDamageRoll(attackType, resp, targetWeaponType) {
      const weaponData = this.system;
      const attackerData = this.parent.system;
      const weaponMasterySystem = game.fade.registry.getSystem('weaponMasterySystem');
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
      if (hasDamage && weaponMasterySystem) {
         const wmResult = weaponMasterySystem.getDamageMods(this, targetWeaponType, formula, modifier);
         if (wmResult) {
            formula = wmResult?.formula ?? formula;
            digest = [...digest, ...wmResult.digest];
         }
      }

      return { formula, type: weaponData.damageType, digest, hasDamage };
   }

   /**
   * Handle clickable rolls.
   * @override
   * @param {Event} event The originating click event
   */
   async roll() {
      return await this.rollAttack();
   }

   async showAttackChatMessage({ attacker, ammoItem, dialogResp, digest, rollEval } = result) {

      const chatData = {
         resp: dialogResp,
         caller: this,
         context: attacker,
         roll: rollEval,
         digest
      };

      const builder = new ChatFactory(CHAT_TYPE.ATTACK_ROLL, chatData, { ammoItem });
      await builder.createChatMessage();
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
         const weaponMasterySystem = game.fade.registry.getSystem('weaponMasterySystem');
         const owner = this.actor ?? null;

         // Weapon mastery is enabled, so weapons can gain the ability to do ranged at certain levels.
         if (owner && weaponMasterySystem) {
            const wmResult = weaponMasterySystem.getAttackTypes(this);
            if (wmResult?.canRanged === true) {
               result.push({ text: game.i18n.localize('FADE.dialog.attackType.missile'), value: "missile" });
            }
            if (wmResult?.canMelee === true) {
               result.push({ text: game.i18n.localize('FADE.dialog.attackType.melee'), value: "melee" });
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