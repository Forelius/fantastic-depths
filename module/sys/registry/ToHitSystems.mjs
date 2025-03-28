import { fadeFinder } from '/systems/fantastic-depths/module/utils/finder.mjs';
import { SocketManager } from '/systems/fantastic-depths/module/sys/SocketManager.mjs'

export class ToHitSystemBase {
   constructor() {
      this.toHitSystem = game.settings.get(game.system.id, "toHitSystem");
      this.isAAC = this.toHitSystem === 'aac';      
      this.masteryEnabled = game.settings.get(game.system.id, "weaponMastery");
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
            if (this.masteryEnabled === true) {
               ac = this.#calcMasteryDefenseAC(attackerWeaponType, targetResult, targetToken, ac, attackType);
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

   /**
    * Calculate the AC based on weapon mastery rules.
    * @private
    * @param {any} attackerWeaponType
    * @param {any} targetResult
    * @param {any} targetToken
    * @param {any} ac The effective AC for this attack.
    * @returns
    */
   #calcMasteryDefenseAC(attackerWeaponType, targetResult, targetToken, ac, attackType) {
      const defenseMastery = targetToken.actor.getBestDefenseMastery(attackerWeaponType);
      if (defenseMastery && defenseMastery.acBonus !== Infinity) {
         // Get the appropriate attacks against weapon type.
         const attAgainst = attackerWeaponType === 'handheld' ? targetToken.actor.system.combat.attAgainstH : targetToken.actor.system.combat.attAgainstM;
         // Get the appropriate total AC based on attack type.
         const totalAC = attackType === 'melee' ? targetToken.actor.system.ac?.total : targetToken.actor.system.ac?.totalRanged;
         // Normal AC/Mastery Def. AC
         const useMasteryAC = (defenseMastery.acBonusAT === null || attAgainst < defenseMastery.acBonusAT) && totalAC > defenseMastery.total;
         targetResult.targetac = this.#getMasteryDefenseTargetAC(useMasteryAC, targetToken, defenseMastery, attackType);
         if (useMasteryAC) {
            ac = defenseMastery.total;
         }
      }
      return ac;
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

   /**
    * Creates the DM's view of an attack result for the specified target. Also indicates how weapon mastery factored into AC calculation.
    * @param {any} useMasteryAC Whether the system determined the weapon mastery defense bonus applied to this attack or not.
    * @param {any} targetToken The token being attacked.
    * @param {any} defenseMastery The token actor's most applicable defense mastery.
    * @returns Localized html message;
    */
   #getMasteryDefenseTargetAC(useMasteryAC, targetToken, defenseMastery, attackType) {
      return game.i18n.format('FADE.Chat.targetACDefMastery', {
         cssClass: (useMasteryAC === false && attackType === 'melee' ? "style='color:green'" : ""),
         cssClassMastery: (useMasteryAC ? "style='color:green'" : ""),
         acTotal: this.isAAC ? targetToken.actor.system.ac?.totalAAC : targetToken.actor.system.ac?.total,
         targetRangedAc: targetToken.actor.system.ac?.totalRanged !== targetToken.actor.system.ac?.total
            ? game.i18n.format('FADE.Chat.targetRangedAC', {
               acTotal: this.isAAC ? targetToken.actor.system.ac?.totalRangedAAC : targetToken.actor.system.ac?.totalRanged,
               cssClass: (!useMasteryAC && attackType === 'missile' ? "style='color:green'" : "")
            })
            : "",
         attAgainst: attackType === 'handheld' ? targetToken.actor.system.combat.attAgainstH : targetToken.actor.system.combat.attAgainstM,
         maxAttAgainst: defenseMastery.acBonusAT,
         defenseMasteryTotal: this.isAAC ? (19 - defenseMastery.total) : defenseMastery.total,
         masteryName: defenseMastery.name
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

export class ToHitHeroic {
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