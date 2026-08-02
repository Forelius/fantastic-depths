import { CodeMigrate } from '../migration.js';
import { getAncestryVsGroupMod, getVsGroupMod } from "../../utils/vsGroupMod.js";
export class DamageSystem {
   useAV: boolean;

   /**
    * Initializes the damage system, determining whether the Armor Value optional rule is enabled.
    * @public
    */
   constructor() {
      this.useAV = this.useAV === undefined ? game.settings.get(game.system.id, "useArmorValue") : this.useAV;
   }

   /**
    * Applies damage or healing to the actor.
    * @public
    * @param {any} actor
    * @param {any} delta The delta to change the HP by. A positive value indicate healing and negative indicates damage.
    * @param {any} damageType What type of damage is being done.
    * @param {*} attackType Melee or missile attack.
    * @param {any} damageSource (optional) The weapon, spell or other item that caused the damage.
    */
   async ApplyDamage(actor, delta, damageType, attackType, damageSource = null) {
      const systemData = actor.system;
      const tokenName = actor.parent?.name ?? actor.name;
      let finalDelta = delta;
      const prevHP = systemData.hp.value;
      let finalHP = Math.min((systemData.hp.value + finalDelta), systemData.hp.max);
      const digest = [];
      const isHeal = delta > 0;

      if (isHeal) {
         // Restoring HP
         digest.push(game.i18n.format("FADE.Chat.damageRoll.restored", { hp: (finalHP - prevHP), tokenName: tokenName }));
      } else {
         // Damage!
         const mitigated = this.#mitigateDamage(damageType, actor, finalDelta);

         if (mitigated !== 0) {
            finalDelta += mitigated;
            digest.push(game.i18n.format("FADE.Chat.damageRoll.mitigated", { damage: mitigated, type: damageType }));
         }
         finalHP = prevHP + finalDelta;
         digest.push(game.i18n.format("FADE.Chat.damageRoll.applied", { damage: -finalDelta, type: damageType, tokenName: tokenName }));
      }

      await actor.update({ "system.hp.value": finalHP });

      this.#sendChatAndToast(damageSource, digest);
   }

   /**
    * Get the damage scale multiplier for a melee attack.
    * @param {any[]} digest - Array to collect human-readable modifier descriptions.
    * @param {object} attackerData - The attacker's derived data (including combat modifiers).
    * @returns {number} - The damage scale multiplier (defaults to 1).
    * @public
    */
   getMeleeDamageScale(digest, attackerData) {
      let result = 1;
      if (attackerData.mod.combat.dmgScale != null && attackerData.mod.combat.dmgScale != 1) {
         result = Number(attackerData.mod.combat.dmgScale);
         digest.push(game.i18n.format("FADE.Chat.rollMods.effectScale", { scale: attackerData.mod.combat.dmgScale }));
      }
      return result;
   }

   /**
    * Get the total damage modifier for a melee attack, including weapon, ability score, effect and VS Group modifiers.
    * @param {Item} weapon - The weapon item being used.
    * @param {any[]} digest - Array to collect human-readable modifier descriptions.
    * @param {object} attackerData - The attacker's derived data (including combat modifiers).
    * @param {any} targetActor - (optional) The target actor, used for VS Group modifiers.
    * @returns {number} - The total melee damage modifier.
    * @public
    */
   getMeleeDamageMod(weapon, digest, attackerData, targetActor) {
      let modifier = 0;
      const abilityScoreSys = game.fade.registry.getSystem("abilityScore");
      const weaponData = weapon.system;

      if (weaponData.mod.dmg != null && weaponData.mod.dmg != 0) {
         modifier += weaponData.mod.dmg;
         digest.push(game.i18n.format("FADE.Chat.rollMods.weaponMod", { mod: weaponData.mod.dmg }));
      }
      // If the attacker has ability scores mods...
      if (abilityScoreSys.hasMeleeDamageMod(attackerData)) {
         const abilityScoreMod = abilityScoreSys.getMeleeDamageMod(attackerData);
         modifier += abilityScoreMod;
         digest.push(game.i18n.format("FADE.Chat.rollMods.abilityScoreMod", { mod: abilityScoreMod }));
      }
      if (attackerData.mod.combat.dmg != null && attackerData.mod.combat.dmg != 0) {
         const effectModVal = Number(attackerData.mod.combat.dmg);
         modifier += effectModVal;
         digest.push(game.i18n.format("FADE.Chat.rollMods.effectMod", { mod: effectModVal  }));
      }
      if (targetActor) {
         const vsGroupResult = getVsGroupMod(targetActor, weapon, "dmg");
         if (vsGroupResult != null && vsGroupResult.mod != 0) {
            modifier += Number(vsGroupResult.mod);
            digest.push(...vsGroupResult.digest);
         }
         const ancestryVsGroupResult = getAncestryVsGroupMod(weapon?.parent, targetActor, "dmg");
         if (ancestryVsGroupResult != null && ancestryVsGroupResult.mod != 0) {
            modifier += Number(ancestryVsGroupResult.mod);
            digest.push(...ancestryVsGroupResult.digest);
         }
      }
      return modifier;
   }

   /**
    * Get the total damage modifier for a missile attack, including weapon, ability score, effect, VS Group and ammo modifiers.
    * @param {Item} weapon - The weapon item being used.
    * @param {any[]} digest - Array to collect human-readable modifier descriptions.
    * @param {object} attackerData - The attacker's derived data (including combat modifiers).
    * @param {any} targetActor - (optional) The target actor, used for VS Group modifiers.
    * @param {Item} ammoItem - (optional) The ammunition item being used, if any.
    * @returns {number} - The total missile damage modifier.
    * @public
    */
   getMissileDamageMod(weapon, digest, attackerData, targetActor, ammoItem) {
      let modifier = 0;
      const abilityScoreSys = game.fade.registry.getSystem("abilityScore");
      const weaponData = weapon.system;

      if (weaponData.mod.dmgRanged != null && weaponData.mod.dmgRanged != 0) {
         modifier += Number(weaponData.mod.dmgRanged);
         digest.push(game.i18n.format("FADE.Chat.rollMods.weaponMod", { mod: weaponData.mod.dmgRanged }));
      }
      // If the attacker has ability scores...
      if (abilityScoreSys.hasMeleeDamageMod(attackerData) && weaponData.tags.includes("thrown")) {
         const abilityScoreMod = abilityScoreSys.getMeleeDamageMod(attackerData);
         modifier += abilityScoreMod;
         digest.push(game.i18n.format("FADE.Chat.rollMods.abilityScoreMod", { mod: abilityScoreMod }));
      }
      if (attackerData.mod.combat.dmgRanged != null && attackerData.mod.combat.dmgRanged != 0) {
         const effectModVal = Number(attackerData.mod.combat.dmgRanged);
         modifier += effectModVal;
         digest.push(game.i18n.format("FADE.Chat.rollMods.effectMod", { mod: effectModVal }));
      }
      // Bow, sling or thrown has vs group modifier?
      if (targetActor) {
         const vsGroupResult = getVsGroupMod(targetActor, weapon, "dmg");
         if (vsGroupResult != null && vsGroupResult.mod != 0) {
            modifier += Number(vsGroupResult.mod);
            digest.push(...vsGroupResult.digest);
         }
         const ancestryVsGroupResult = getAncestryVsGroupMod(weapon?.parent, targetActor, "dmg");
         if (ancestryVsGroupResult != null && ancestryVsGroupResult.mod != 0) {
            modifier += Number(ancestryVsGroupResult.mod);
            digest.push(...ancestryVsGroupResult.digest);
         }
      }
      // If there is an ammo item and it isn't the weapon itself (thrown)...
      if (ammoItem) {
         if (Math.abs(ammoItem?.system.mod?.dmgRanged) > 0) {
            modifier += Number(ammoItem?.system.mod.dmgRanged);
            digest.push(game.i18n.format("FADE.Chat.rollMods.ammoMod", { mod: ammoItem?.system.mod.dmgRanged }));
         }
          if (ammoItem?.id != weapon.id) {
              // Non-thrown ammo item vs group modifier
              if (targetActor) {
                  const vsGroupResult = getVsGroupMod(targetActor, ammoItem, "dmg");
                if (vsGroupResult != null && vsGroupResult.mod != 0) {
                   modifier += Number(vsGroupResult.mod);
                   digest.push(...vsGroupResult.digest);
                }
            }
         }
      }
      return modifier;
   }

   /**
    * Calculate how much damage is mitigated based on the damage type and the actor's combat modifiers.
    * @param {string} damageType - What type of damage is being done.
    * @param {any} actor - The actor taking damage.
    * @param {number} delta - The negative delta representing the damage dealt.
    * @returns {number} - The amount of damage mitigated (never more than the damage dealt).
    * @private
    */
   #mitigateDamage(damageType, actor, delta) {
      let result = 0;
      const combatMods = actor.system.mod.combat;
      const physicalTypes = ["physical", "fire", "frost", "piercing", "breath", "corrosive", ""];
      if (physicalTypes.includes(damageType)) {
         result += this.#getPhysicalMitigation(actor, damageType, delta);
      }
      if (damageType === "breath") {
         result += combatMods.selfDmgBreath;
         result += -delta * combatMods.selfDmgBreathScale;
      }
      if (damageType === "magic") {
         result += combatMods.selfDmgMagic;
      }
      // Don't allow addition of damage via damage mitigation
      // And don't allow mitigation of more damage than was caused.
      result = Math.min(result, -delta);
      return result;
   }

   /**
    * Calculate physical damage mitigation, optionally using the Armor Value (AV) rule.
    * @param {any} actor - The actor taking damage.
    * @param {string} damageType - What type of damage is being done.
    * @param {number} delta - The negative delta representing the damage dealt.
    * @returns {number} - The amount of physical damage mitigated.
    * @private
    */
   #getPhysicalMitigation(actor, damageType, delta) {
      let result = actor.system.mod.combat.selfDmg;
      if (this.useAV) {
         const av = actor.getEvaluatedRollSync(actor.system.ac.av)?.total;
         if (av > 0) {
            let avMitigated = 0;
            if (damageType === 'piercing') {
               avMitigated += Math.floor(av / 2);
            } else {
               avMitigated += av;
            }
            // Blocks at least 1 point.
            result = Math.min(avMitigated, -(delta + 1));
         }
      }
      return result;
   }

   /**
    * Send the damage/healing digest to the chat as a toast notification and a chat message.
    * @param {Item|null} source - (optional) The weapon, spell or other item that caused the damage.
    * @param {string[]} digest - The list of human-readable messages describing what happened.
    * @private
    */
   #sendChatAndToast(source, digest) {
      let chatContent = source ? `<div class="text-size18">${source.name}</div>` : "";
      for (const msg of digest) {
         chatContent += `<div>${msg}</div>`;
      }

      if (game.fade.toastManager) {
         game.fade.toastManager.showHtmlToast(chatContent, "info", CodeMigrate.getRollModeSetting());
      }

      const speaker = { alias: game.users.get(game.userId).name }; // Use the player's name as the speaker
      const chatData = {
         speaker: speaker,
         content: chatContent
      };
      ChatMessage.create(chatData);
   }
}