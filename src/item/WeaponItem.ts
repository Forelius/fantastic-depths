import { ChatFactory } from "../chat/ChatFactory.js";
import { CHAT_TYPE } from "../chat/ChatTypeEnum.js"
import { AttackRollService, AttackRollResult } from './AttackRollService.js';
import { GearItem } from "./GearItem.js";
import { WeaponMasteryInterface } from "../sys/registry/WeaponMastery.js";
import { createDamageRollResult } from "./FDItem.js"
import { DamageRollResult } from "./type/DamageRollResult.js"

export class WeaponItem extends GearItem {
   attackRollService: AttackRollService;

   get isWeaponItem(): boolean { return true }

   /** True when this ranged weapon requires a separate ammo item. */
   get canShoot(): boolean { return this.system.canRanged === true && this.getAmmoTypes().length > 0; }

   /** True when this ranged weapon is thrown / uses itself as ammo. */
   get canThrow(): boolean { return this.system.canRanged === true && this.getAmmoTypes().length === 0; }

   constructor(data, context) {
      super(data, context);
      this.attackRollService = new AttackRollService();
   }

   /**
    * Ammo types this weapon can use, parsed from the comma-delimited system.ammoType string.
    * Empty string and "none" mean no separate ammo (thrown / self).
    */
   getAmmoTypes(): string[] {
      const raw = this.system.ammoType;
      if (!raw || raw === "none") return [];
      return String(raw).split(",").map((s) => s.trim()).filter(Boolean);
   }

   prepareBaseData() {
      super.prepareBaseData();
      this._prepareEffects();
   }

   prepareDerivedData() {
      super.prepareDerivedData();
      this._prepareModText();
      this._prepareDamageLabel();
   }

   /**
    * Pass-thru to attack roll service.
    * @param dataset
    * @returns
    */
   async rollAttack(dataset: PropertyBag = null): Promise<AttackRollResult> {
      return await this.attackRollService.rollAttack(this, dataset);
   }

   getDamageRoll(attackType, resp, targetWeaponType, targetToken, ammoItem): DamageRollResult {
      const weaponData = this.system;
      const targetActor = targetToken?.actor;
      const attackerData = this.parent.system;
      const masterySystem = game.fade.registry.getSystem("weaponMastery") as WeaponMasteryInterface;
      const evaluatedRoll = this.getEvaluatedRollSync(weaponData.damageRoll);
      let formula = evaluatedRoll?.formula;
      let digest = [];
      let modifier = 0;
      let scale = 1;
      let hasDamage = true;
      const dmgSys = game.fade.registry.getSystem("damageSystem");

      if (attackType === "melee") {
         modifier += dmgSys.getMeleeDamageMod(this, digest, attackerData, targetActor);
         scale = dmgSys.getMeleeDamageScale(digest, attackerData);
      } else if (attackType === "missile") {
         modifier += dmgSys.getMissileDamageMod(this, digest, attackerData, targetActor, ammoItem);
      } else if (attackType === "breath") {
         // nothing for now
      }

      if (resp?.mod && resp?.mod !== 0) {
         modifier += Number(resp.mod);
         digest.push(game.i18n.format("FADE.Chat.rollMods.manual", { mod: resp.mod }));
      }

      // If there is no damage and the damage modifier is not at least 1...
      if (modifier <= 0 && evaluatedRoll?.total <= 0) {
         hasDamage = false;
      }

      // Check weapon mastery
      if (hasDamage && masterySystem) {
         const wmResult = masterySystem.getDamageMods(this, formula, targetWeaponType);
         // Only apply a mastery formula when it is non-empty; "" must not wipe the weapon formula.
         if (wmResult?.formula) {
            formula = wmResult.formula;
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

      return hasDamage ? createDamageRollResult({
         damageFormula: formula,
         damageType: this.#resolveDamageType(weaponData.damageType, ammoItem),
         digest,
         hasDamage,
         attackType,
         targetuuid: targetToken?.uuid,
         targetWeaponType,
         ammouuid: ammoItem?.uuid,
      }) : null;
   }

   /**
    * When the weapon damage type is "ammo", use the ammo item's damage type instead.
    */
   #resolveDamageType(weaponDamageType, ammoItem): string {
      if (weaponDamageType !== "ammo") return weaponDamageType;
      const ammoDamageType = ammoItem?.system?.damageType;
      return ammoDamageType?.length > 0 ? ammoDamageType : "physical";
   }

   async showAttackChatMessage(result = { attacker: null, dialogResp: null, digest: null, rollEval: null, ammoItem: null }) {
      const { attacker, dialogResp, digest, rollEval } = result;
      let ammoItem = result.ammoItem;
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
      const result = [];
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
         this.system.damageLabel = this.getDamageRoll(attackType, null, "primary", null, null)?.damageFormula ?? this.system.damageRoll;
      } else {
         this.system.damageLabel = this.system.damageRoll;
      }
   }
}