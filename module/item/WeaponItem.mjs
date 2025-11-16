import { ChatFactory, CHAT_TYPE } from "../chat/ChatFactory.mjs";
import { RollAttackMixin } from "./mixins/RollAttackMixin.mjs";
import { GearItem } from "./GearItem.mjs";

export class WeaponItem extends RollAttackMixin(GearItem) {
   get isWeaponItem() { return true }

   prepareBaseData() {
      super.prepareBaseData();
      this._prepareEffects();
   }

   prepareDerivedData() {
      super.prepareDerivedData();
      this._prepareModText();
      this._prepareDamageLabel();
   }

   getDamageRoll(attackType, resp, targetWeaponType, targetToken, ammoItem) {
      const weaponData = this.system;
      const targetActor = targetToken?.actor;
      const attackerData = this.parent.system;
      const masterySystem = game.fade.registry.getSystem("weaponMastery");
      let evaluatedRoll = this.getEvaluatedRollSync(weaponData.damageRoll);
      let formula = evaluatedRoll?.formula;
      let digest = [];
      let modifier = 0;
      let scale = 1;
      let hasDamage = true;
      const dmgSys = game.fade.registry.getSystem("damageSystem");

      if (attackType === "melee") {
         modifier += dmgSys.getMeleeDamageMod(this, digest, attackerData, targetActor);
         scale = dmgSys.getMeleeDamageScale(this, digest, attackerData, targetActor);
      } else if (attackType === "missile") {
         modifier += dmgSys.getMissileDamageMod(this, digest, attackerData, targetActor, ammoItem);
      } else if (attackType === "breath") {
         // nothing for now
      }

      if (resp?.mod && resp?.mod !== 0) {
         modifier += Number(resp.mod);
         digest.push(game.i18n.format("FADE.Chat.rollMods.manual", { mod: resp.mod }));
      }

      if (modifier <= 0 && evaluatedRoll?.total <= 0) {
         hasDamage = false;
      }

      // Check weapon mastery
      if (hasDamage && masterySystem) {
         const wmResult = masterySystem.getDamageMods(this, targetWeaponType, formula, modifier);
         if (wmResult) {
            formula = wmResult?.formula ?? formula;
            digest = [...digest, ...wmResult.digest];
         }
      }

      // This is where the modifiers are applied to the formula. It only supports addition mode.
      if (hasDamage) {
         if (modifier !== 0) {
            formula = formula ? `${formula}+${modifier}` : `${modifier}`;
         }
         if (scale !== 1 && scale !== 0 && formula) {
            formula = `(${formula})*${scale}`;
         }
      }

      return hasDamage ? {
         damageFormula: formula,
         damageType: weaponData.damageType,
         digest,
         hasDamage,
         attackType,
         targetUuid: targetToken?.uuid,
         targetWeaponType,
         ammouuid: ammoItem?.uuid
      } : null;
   }

   async showAttackChatMessage({ attacker, ammoItem, dialogResp, digest, rollEval } = result) {
      const chatData = {
         resp: dialogResp,
         caller: this,
         context: attacker,
         roll: rollEval,
         digest
      };

      // No need to show ammo item if it is also the weapon we are using (thrown).
      ammoItem = ammoItem?.id === this.id ? null : ammoItem;

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
         result.push({ text: game.i18n.localize("FADE.dialog.attackType.breath"), value: "breath" });
      } else {
         const masterySystem = game.fade.registry.getSystem("weaponMastery");
         const owner = this.actor ?? null;

         // Weapon mastery is enabled, so weapons can gain the ability to do ranged at certain levels.
         if (owner && masterySystem) {
            const attackTypes = masterySystem.getAttackTypes(this);
            if (attackTypes?.canRanged === true) {
               result.push({ text: game.i18n.localize("FADE.dialog.attackType.missile"), value: "missile" });
            }
            if (attackTypes?.canMelee === true) {
               result.push({ text: game.i18n.localize("FADE.dialog.attackType.melee"), value: "melee" });
            }
         }

         if (result.length === 0) {
            // Simple mode. Either the weapon can melee, missile or both, or not.
            if (this.system.canRanged) result.push({ text: game.i18n.localize("FADE.dialog.attackType.missile"), value: "missile" });
            if (this.system.canMelee) result.push({ text: game.i18n.localize("FADE.dialog.attackType.melee"), value: "melee" });
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
      this._processNonTransferActiveEffects();
   }

   async _prepareDamageLabel() {
      if (this.parent) {
         const attackType = this.system.canMelee ? "melee" : "missile";
         this.system.damageLabel = this.getDamageRoll(attackType, null, "primary")?.formula ?? this.system.damageRoll;
      } else {
         this.system.damageLabel = this.system.damageRoll;
      }
   }
}