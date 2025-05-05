import { fadeFinder } from '/systems/fantastic-depths/module/utils/finder.mjs';
import { SocketManager } from '/systems/fantastic-depths/module/sys/SocketManager.mjs'

export class ToHitSystemBase {
   constructor() {
      this.rangeModifiers = {
         short: 1,
         medium: 0,
         long: -1
      };
      this.toHitSystem = game.settings.get(game.system.id, "toHitSystem");
      this.isAAC = this.toHitSystem === 'aac';
      this.masterySystem = game.fade.registry.getSystem('weaponMasterySystem');
   }

   /**
    * Get the attack roll formula for the specified weapon, attack type, mod and target.
    * @public
    * @param {any} weapon The weapon being used to attack with.
    * @param {any} attackType The type of attack. Values are melee, missile, breath and save.
    * @param {any} options An object containing one or more of the following:
    *    mod - A manual modifier entered by the user.
    *    target - This doesn't work when there are multiple targets.
    *    targetWeaponType - For weapon mastery system, the type of weapon the target is using (monster or handheld).
    *    attackRoll - In case the attack roll is not a straight 1d20.
    * @returns
    */
   getAttackRoll(actor, weapon, attackType, options = {}) {
      const weaponData = weapon.system;
      const targetData = options.target?.system;
      let formula = options.attackRoll ?? '1d20';
      let digest = [];
      let modifier = 0;
      const toHitSystem = game.settings.get(game.system.id, "toHitSystem");

      if (options.mod && options.mod !== 0) {
         modifier += options.mod;
         //formula = `${formula}+@mod`; 
         digest.push(game.i18n.format('FADE.Chat.rollMods.manual', { mod: options.mod }));
      }

      if (toHitSystem === 'aac' && actor.system.thbonus !== 0) {
         modifier += actor.system.thbonus;
         digest.push(`${game.i18n.localize('FADE.Actor.THBonus')}: ${actor.system.thbonus}`);
      }

      if (attackType === "melee") {
         modifier += this.#getMeleeAttackRollMods(actor, weaponData, digest, targetData);
      } else {
         // Missile attack
         modifier += this.#getMissileAttackRollMods(actor, weaponData, digest, targetData, options?.ammo);
      }

      // If there is a registered weapon mastery system...
      if (this.masterySystem) {
         const wmResult = this.masterySystem.getAttackRollMod(actor, weapon, {
            target: options.target,
            targetWeaponType: options.targetWeaponType,
            attackType
         });
         if (wmResult) {
            modifier += wmResult.mod;
            digest = [...digest, ...wmResult.digest];
         }
      }

      if (modifier !== 0) {
         formula = `${formula}+${modifier}`;
      }

      return { formula, digest };
   }

   /**
    * @param {any} attacker normally the attacking token, but could also be an actor.
    * @param {any} weapon the weapon item used for the attack
    * @param {any} targetTokens an array of target tokens, if any.
    * @param {any} roll
    * @param {any} attackerWeaponType
    * @returns
    */
   async getToHitResults(attacker, weapon, targetTokens, roll, attackType = 'melee') {
      const attackingActor = attacker.actor ?? attacker;
      let result = null;
      this.acAbbr = this.isAAC ? game.i18n.localize('FADE.Armor.abbrAAC') : game.i18n.localize('FADE.Armor.abbr');

      if (roll) {
         await attackingActor.update({ "system.combat.attacks": attackingActor.system.combat.attacks + 1 });
         await weapon.update({ "system.attacks.used": weapon.system.attacks.used + 1 });

         const attackerWeaponType = weapon.type === 'weapon' ? weapon.system.weaponType : 'monster';
         const thac0 = attackingActor.system.thac0.value;
         const hitAC = this.getLowestACHit(this.getDiceSum(roll), roll.total, thac0);
         let hitACMessage = game.i18n.localize('FADE.Chat.attackACNone');
         if (hitAC === -999) {
            hitACMessage = game.i18n.localize('FADE.Chat.attackACAny');
         } else if (hitAC !== null && hitAC !== Infinity) {
            hitACMessage = game.i18n.format('FADE.Chat.attackAC', { acAbbr: this.acAbbr, hitAC });
         }
         result = {
            hitAC,
            message: hitACMessage,
            targetResults: []
         };

         // Target results for each individual target.
         // Warning: This is not correctly handling weapon mastery-based mods to attack roll, since attack rolls assume a single target weapon type.
         for (let targetToken of targetTokens) {
            let targetActor = targetToken.actor;
            let targetResult = {
               targetid: targetToken.id,
               targetname: targetToken.name,
               targetac: this.#getNormalTargetAC(targetToken, attackType),
               success: null,
               message: null
            };

            let ac = targetActor.system.ac?.total;
            let aac = targetActor.system.ac?.totalAAC;

            // If weapon mastery system is enabled...
            if (this.masterySystem) {
               const wmResult = this.masterySystem.getDefenseACMod(attackerWeaponType, targetToken, attackType);
               if (wmResult) {
                  ac = wmResult.ac != null ? wmResult.ac : ac;
                  targetResult.targetac = wmResult.targetac != null ? wmResult.targetac : targetResult.targetac;
               }
            }

            if (hitAC !== null) { // null if rolled a natural 1
               if (ac !== null && ac !== undefined) {
                  if (this.isAAC === true ? aac <= hitAC : ac >= hitAC) {
                     targetResult.message = game.i18n.localize('FADE.Chat.attackSuccess');
                     targetResult.success = true;
                  } else {
                     targetResult.success = false;
                     targetResult.message = game.i18n.localize('FADE.Chat.attackFail');
                  }
               } else {
                  targetResult.message = game.i18n.format('FADE.Chat.attackAC', { acAbbr: this.acAbbr, hitAC });
                  targetResult.success = true;
               }
            } else {
               targetResult.success = false;
               targetResult.message = game.i18n.localize('FADE.Chat.attackFail');
            }

            // Track number of attacks against target. Do it after getting the tohit result. 
            // Send through socket because this player may not have permission to change the target actor's data.
            SocketManager.sendToGM("incAttacksAgainst", { tokenid: targetToken.id, type: attackerWeaponType });

            result.targetResults.push(targetResult);
         }
      }
      else if (weapon.system.breath?.length > 0 && weapon.system.savingThrow === 'breath') {
         // Always hits, but saving throw
         result = {
            savingThrow: weapon.system.savingThrow,
            //message: 'Saving throw required.',
            targetResults: []
         };
         for (let targetToken of targetTokens) {
            const saveLocalized = (await fadeFinder.getSavingThrow(weapon.system.savingThrow))?.name;
            let targetResult = {
               targetid: targetToken.id,
               targetname: targetToken.name,
               message: `save vs. ${saveLocalized}`
            };
            result.targetResults.push(targetResult);
         }
      }

      return result;
   }

   /**
    * Extracts the sum of the dice rolled from a Roll object,
    * ignoring any constants or other terms.
    * @param {Roll} roll - The Roll object containing the dice and other terms.
    * @returns {number} The sum of the dice rolled.
    */
   getDiceSum(roll) {
      let sum = 0;
      for (let i = 0; i < roll.terms.length; i++) {
         for (let j = 0; j < roll.terms[i]?.results?.length; j++) {
            sum += roll.terms[i].results[j].result;
         }
      }
      return sum;
   }

   #getMissileAttackRollMods(actor, weaponData, digest, targetData, ammo) {
      let result = 0;
      const systemData = actor.system;
      const targetMods = targetData?.mod.combat;
      const hasWeaponMod = weaponData.mod !== undefined && weaponData.mod !== null;

      if (hasWeaponMod && weaponData.mod.toHitRanged !== 0) {
         result += weaponData.mod.toHitRanged;
         digest.push(game.i18n.format('FADE.Chat.rollMods.weaponMod', { mod: weaponData.mod.toHitRanged }));
      }
      if (systemData.mod.combat?.toHitRanged !== 0) {
         result += systemData.mod.combat.toHitRanged;
         digest.push(game.i18n.format('FADE.Chat.rollMods.effectMod', { mod: systemData.mod.combat.toHitRanged }));
      }
      // If the attacker has ability scores...
      if (systemData.abilities && weaponData.tags.includes("thrown") && systemData.abilities.str.mod != 0) {
         result += systemData.abilities.str.mod;
         digest.push(game.i18n.format('FADE.Chat.rollMods.strengthMod', { mod: systemData.abilities.str.mod }));
      } else if (systemData.abilities && systemData.abilities.dex.mod) {
         result += systemData.abilities.dex.mod;
         digest.push(game.i18n.format('FADE.Chat.rollMods.dexterityMod', { mod: systemData.abilities.dex.mod }));
      }
      if (targetMods && targetMods.selfToHitRanged !== 0) {
         result += targetMods.selfToHitRanged;
         digest.push(game.i18n.format('FADE.Chat.rollMods.targetMod', { mod: targetMods.selfToHitRanged }));
      }
      return result;
   }

   #getMeleeAttackRollMods(actor, weaponData, digest, targetData) {
      let result = 0;
      const systemData = actor.system;
      const targetMods = targetData?.mod.combat;
      const hasWeaponMod = weaponData.mod !== undefined && weaponData.mod !== null;

      if (hasWeaponMod && weaponData.mod.toHit !== 0) {
         result += weaponData.mod.toHit;
         digest.push(game.i18n.format('FADE.Chat.rollMods.weaponMod', { mod: weaponData.mod.toHit }));
      }
      if (systemData.mod?.combat.toHit !== 0) {
         result += systemData.mod.combat.toHit;
         digest.push(game.i18n.format('FADE.Chat.rollMods.effectMod', { mod: systemData.mod.combat.toHit }));
      }
      // If the attacker has ability scores...
      if (systemData.abilities && systemData.abilities.str.mod !== 0) {
         result += systemData.abilities.str.mod;
         digest.push(game.i18n.format('FADE.Chat.rollMods.strengthMod', { mod: systemData.abilities.str.mod }));
      }
      if (targetMods && targetMods.selfToHit !== 0) {
         result += targetMods.selfToHit;
         digest.push(game.i18n.format('FADE.Chat.rollMods.targetMod', { mod: targetMods.selfToHit }));
      }

      return result;
   }

   /**
    * Creates the DM's view of an attack result for the specified target.
    * Use this when not using weapon mastery rules.
    * @param {any} targetToken
    * @param {any} attackType
    * @returns
    */
   #getNormalTargetAC(targetToken, attackType) {
      return game.i18n.format('FADE.Chat.targetAC', {
         cssClass: attackType === 'melee' ? "style='color:green'" : "",
         acTotal: this.isAAC ? targetToken.actor.system.ac?.totalAAC : targetToken.actor.system.ac?.total,
         targetRangedAc: targetToken.actor.system.ac?.totalRanged !== targetToken.actor.system.ac?.total
            ? game.i18n.format('FADE.Chat.targetRangedAC', {
               acTotal: this.isAAC ? targetToken.actor.system.ac?.totalRangedAAC : targetToken.actor.system.ac?.totalRanged,
               cssClass: attackType === 'missile' ? "style='color:green'" : ""
            })
            : ""
      });
   }
}

export class ToHitTHAC0 extends ToHitSystemBase {
   /**
   * Get the lowest AC that can be hit by the specified roll and THAC0
   * @param {any} rollTotal The attack roll total
   * @param {any} thac0 The attacker's effective THAC0
   * @returns The lowest AC that this roll can hit.
   */
   getLowestACHit(roll, rollTotal, thac0) {
      return thac0 - rollTotal;
   }
}

export class ToHitAAC extends ToHitSystemBase {
   /**
   * Get the lowest AC that can be hit by the specified roll and THAC0
   * @param {any} rollTotal The attack roll total
   * @param {any} thac0 The attacker's effective THAC0
   * @returns The lowest AC that this roll can hit.
   */
   getLowestACHit(roll, rollTotal, thac0) {
      return rollTotal;
   }
}

export class ToHitClassic extends ToHitSystemBase {
   getLowestACHit(roll, rollTotal, thac0) {
      let result;
      const toHitTable = this.#getToHitTable(thac0);
      // Filter all entries that the rollTotal can hit
      const validEntries = toHitTable.filter(entry => rollTotal >= entry.toHit);
      // Find the lowest AC from valid entries
      if (roll === 1) {
         result = null;
      } else if (roll === 20) {
         result = -999;
      } else {
         result = validEntries.reduce((minEntry, currentEntry) => {
            return currentEntry.ac < minEntry.ac ? currentEntry : minEntry;
         }, { ac: Infinity }).ac;
      }
      return result;
   }

   // Basic/Expert style to-hit table.
   #getToHitTable(thac0) {
      const tableRow = [];
      for (let ac = -19; ac <= 19; ac++) {
         let toHit = thac0 - ac; // Calculate the roll needed to hit
         if (toHit < 2) toHit = 2; // Minimum roll of 2
         if (toHit > 20) toHit = 20; // Maximum roll of 20
         tableRow.push({ ac, toHit });
      }
      return tableRow;
   }
}

export class ToHitDarkDungeons extends ToHitSystemBase {
   /**
   * Get the lowest AC that can be hit by the specified roll and THAC0
   * @param {any} rollTotal The attack roll total
   * @param {any} thac0 The attacker's effective THAC0
   * @returns The lowest AC that this roll can hit.
   */
   getLowestACHit(roll, rollTotal, thac0) {
      let result;
      if (roll === 1) {
         result = null; // Natural 1 always misses
      } else if (roll === 20) {
         result = -999; // Natural 20 always hits
      } else {
         const toHitTable = this.#getToHitTable(thac0);
         // Filter all entries that the rollTotal can hit
         const validEntries = toHitTable.filter(entry => rollTotal >= entry.toHit);
         // Find the lowest AC from valid entries
         result = validEntries.reduce((minEntry, currentEntry) => {
            return currentEntry.ac < minEntry.ac ? currentEntry : minEntry;
         }, { ac: Infinity }).ac;
      }
      return result;
   }

   #getToHitTable(thac0, repeater = 0) {
      const toHitTable = [];
      repeater = Math.max(repeater, 0);
      let toHit = thac0;
      const repeatMax = 2;
      for (let ac = 0; ac <= 20; ac++) {
         if (toHit < 0) {
            if (repeater < repeatMax) {
               repeater++;
               toHitTable.push({ ac, toHit });
            } else {
               repeater = 1;
               toHit -= 1;
               toHitTable.push({ ac, toHit });
            }
         } else {
            repeater = 0;
            toHitTable.push({ ac, toHit });
            toHit -= 1;
         }
      }

      repeater = thac0 == 20 ? 1 : 0;
      toHit = thac0 == 20 ? 20 : thac0 + 1;
      // Loop through AC values from -1 down to -99
      for (let ac = -1; ac >= -99; ac--) {
         if (toHit < 0) {
            if (repeater < repeatMax) {
               repeater++;
               toHitTable.push({ ac, toHit });
            } else {
               repeater = 0;
               toHit += 1;
               toHitTable.push({ ac, toHit });
               toHit += 1;
            }
         } else {
            repeater = 0;
            toHitTable.push({ ac, toHit });
            toHit += 1;
         }
      }
      return toHitTable;
   }
}

export class ToHitHeroic extends ToHitSystemBase {
   /**
   * Get the lowest AC that can be hit by the specified roll and THAC0
   * @param {any} rollTotal The attack roll total
   * @param {any} thac0 The attacker's effective THAC0
   * @returns The lowest AC that this roll can hit.
   */
   getLowestACHit(roll, rollTotal, thac0) {
      let result;
      const toHitTable = this.#getToHitTable(thac0);
      // Filter all entries that the rollTotal can hit
      const validEntries = toHitTable.filter(entry => rollTotal >= entry.toHit);
      // Find the lowest AC from valid entries
      result = validEntries.reduce((minEntry, currentEntry) => {
         return currentEntry.ac < minEntry.ac ? currentEntry : minEntry;
      }, { ac: Infinity }).ac;
      return result;
   }

   #getToHitTable(thac0, repeater = 0) {
      const toHitTable = [];
      const repeatMax = 5;
      // Loop through AC values from 0 down to 20
      repeater = Math.max(repeater, 0);
      let repeatOn = [-10, 2, 30];
      let toHit = thac0;
      for (let ac = 0; ac < 20; ac++) {
         if (repeatOn.includes(toHit)) {
            if (repeater < repeatMax) {
               repeater++;
               toHitTable.push({ ac, toHit });
            } else {
               repeater = 0;
               toHit -= 1;
               toHitTable.push({ ac, toHit });
               toHit -= 1;
            }
         } else {
            repeater = 0;
            toHitTable.push({ ac, toHit });
            toHit -= 1;
         }
      }

      repeatOn = [-10, 2, 20, 30, 40, 50, 60, 70, 80];
      repeater = thac0 == 20 ? 1 : 0;
      toHit = thac0 == 20 ? 20 : thac0 + 1;
      // Loop through AC values from -1 down to -99
      for (let ac = -1; ac >= -99; ac--) {
         if (repeatOn.includes(toHit)) {
            if (repeater < repeatMax) {
               repeater++;
               toHitTable.push({ ac, toHit });
            } else {
               repeater = 0;
               toHit += 1;
               toHitTable.push({ ac, toHit });
               toHit += 1;
            }
         } else {
            repeater = 0;
            toHitTable.push({ ac, toHit });
            toHit += 1;
         }
      }

      return toHitTable;
   }
}