export class WeaponMasterySystem {
   constructor() {
      this.toHitSystem = game.settings.get(game.system.id, "toHitSystem");
      this.isAAC = this.toHitSystem === 'aac';
      this.masterySystem = game.fade.registry.getSystem('weaponMasterySystem');
   }

   getAttackRollMod(actor, weapon, { targetWeaponType, attackType, target } = {}) {
      let result = { mod: 0, digest: [] };

      if (weapon?.system?.mastery?.length > 0) {
         const attackerMastery = actor.items.find((item) => item.type === 'mastery' && item.name === weapon.system.mastery)?.system;
         if (attackerMastery) {
            const bIsPrimary = targetWeaponType === attackerMastery.primaryType || attackerMastery.primaryType === 'all';
            // Get the to hit bonus, if any.
            const toHitMod = bIsPrimary ? attackerMastery.pToHit : attackerMastery.sToHit;
            if (toHitMod > 0) {
               result.mod += toHitMod;
               const primsec = bIsPrimary ? game.i18n.localize('FADE.Mastery.primary') : game.i18n.localize('FADE.Mastery.secondary');
               result.digest.push(game.i18n.format('FADE.Chat.rollMods.masteryMod', { primsec, mod: toHitMod }));
            }
         } else if (attackType === "missile" && actor.type === "character" && actor.system.details.species === "Human") {
            // Unskilled use for humans
            result.mod -= 1;
            result.digest.push(game.i18n.format('FADE.Chat.rollMods.unskilledUse', { mod: "-1" }));
         }
      }

      return result;
   }

   /**
    * Calculate the AC based on weapon mastery rules.
    * @private
    * @param {any} attackerWeaponType
    * @param {any} targetResult
    * @param {any} targetToken
    * @returns
    */
   getDefenseACMod(attackerWeaponType, targetToken, attackType) {
      let result = { ac: null, targetac: null };
      const defenseMastery = this.#getBestDefenseMastery(targetToken.actor, attackerWeaponType);
      if (defenseMastery && defenseMastery.acBonus !== Infinity) {
         // Get the appropriate attacks against weapon type.
         const attAgainst = attackerWeaponType === 'handheld' ? targetToken.actor.system.combat.attAgainstH : targetToken.actor.system.combat.attAgainstM;
         // Get the appropriate total AC based on attack type.
         const totalAC = attackType === 'melee' ? targetToken.actor.system.ac?.total : targetToken.actor.system.ac?.totalRanged;
         // Normal AC/Mastery Def. AC
         const useMasteryAC = (defenseMastery.acBonusAT === null || attAgainst < defenseMastery.acBonusAT) && totalAC > defenseMastery.total;
         result.targetac = this.#getDefenseTargetAC(useMasteryAC, targetToken, defenseMastery, attackType);
         if (useMasteryAC) {
            result.ac = defenseMastery.total;
         }
      }
      return result;
   }

   /**
    * Get the target's potential weapon types
    * @param {any} weapon The actor's weapon
    * @param {any} actor The target actor
    * @returns Returns weapon types if conditions met, otherwise null.
    */
   getWeaponTypes(weapon, attackerActor) {
      let result = null;
      // Get the actor's weapon mastery data.
      const attackerMastery = attackerActor.items.find((item) => item.type === 'mastery' && item.name === weapon?.system?.mastery);
      // If the actor is a monster, weaponData indicates a spell is being cast or the actor has a mastery for the weapon being used...
      if (attackerActor.type === "monster" || weapon.type === "spell" || attackerMastery) {
         result = {
            monster: game.i18n.localize('FADE.Mastery.weaponTypes.monster.long'),
            handheld: game.i18n.localize('FADE.Mastery.weaponTypes.handheld.long')
         };
      }
      return result;
   }

   /**
    * Attemtps to determine the weapon type of this actor.
    * @public
    * @returns The weapon type of this actor or 'monster' if it can't be determined.
    */
   getActorWeaponType(actor) {
      let result = 'monster';
      const weapons = actor?.items.filter(item => item.type === 'weapon');
      const equippedWeapons = weapons?.filter(item => item.system.equipped === true && item.system.quantity > 0);
      if (equippedWeapons && equippedWeapons.length > 0) {
         result = equippedWeapons[0].system.weaponType;
      } else if (weapons && weapons.length > 0) {
         result = 'monster';
         console.warn(`${actor.name} has weapons, but none are equipped or the quantity is zero.`)
      }
      return result;
   }

   /**
    * @private
    * Calculate how owner's weapon mastery modifies this weapon's damage.
    * @param {any} weapon The weapon that damage mods are being requested for.
    * @param {any} targetWeaponType The target's weapon type
    * @param {any} formula The current attack formula
    * @returns
    */
   getDamageMods(weapon, targetWeaponType, formula, modifier) {
      const attacker = weapon.parent;
      let result = { formula, digest: [] };

      //&& (weaponData.mastery !== "" || weaponData.natural)
      if (weapon.system.mastery !== "" || weapon.system.natural) {
         let attackerMastery = attacker.items.find((item) => item.type === 'mastery' && item.name === weapon.system.mastery);

         // If a monster and no weapon mastery with this weapon...
         if (attackerMastery === undefined && attacker.type === 'monster') {
            // Give blanket basic skill usage.
            attackerMastery = {
               system: {
                  primaryType: 'all',
                  pDmgFormula: weapon.system.damageRoll
               }
            };
         }

         if (attackerMastery) {
            // If the target weapon type matches the weapon mastery primary target type or mastery effects all weapon types the same...
            if (targetWeaponType && (targetWeaponType === attackerMastery.system.primaryType || attackerMastery.system.primaryType === 'all')) {
               result.formula = attackerMastery.system.pDmgFormula;
               result.digest.push(game.i18n.format('FADE.Chat.rollMods.masteryPrimDmg'));
            }
            // Else if the secondary damage is specified...
            else if (attackerMastery.system.sDmgFormula) {
               result.formula = attackerMastery.system.sDmgFormula;
               result.digest.push(game.i18n.format('FADE.Chat.rollMods.masterySecDmg'));
            }
            else {
               // Else use primary damage type.
               result.formula = attackerMastery.system.pDmgFormula;
               result.digest.push(game.i18n.format('FADE.Chat.rollMods.masterySecDmg'));
            }
         } else {
            // Half damage if unskilled use.
            result.formula = `floor(${formula}/2)`;
            result.digest.push(game.i18n.format('FADE.Chat.rollMods.unskilledUse', { mod: "/2" }));
         }

         // This is where the modifiers are applied to the formula. It only supports addition mode.
         if (modifier !== 0) {
            result.formula = result.formula ? `${result.formula}+${modifier}` : `${modifier}`;
         }
      }

      return result;
   }

   getAttackTypes(weapon) {
      const actor = weapon.actor;
      let result = { canMelee: false, canRanged: false };
      // Weapon mastery is enabled, so weapons can gain the ability to do ranged at certain levels.
      const ownerMastery = actor?.items.find((item) => item.type === 'mastery' && item.name === weapon.system.mastery);
      if (ownerMastery) {
         result.canRanged = ownerMastery.system.canRanged;
         result.canMelee = weapon.system.canMelee;
      }
      return result;
   }

   /**
    * Get this actor's defense masteries for all equipped weapons.
    * @public
    * @param {*} actor
    * @param {any} ac
    * @returns
    */
   getDefenseMasteries(actor, ac) {
      const results = [];
      const masteries = actor.items.filter(item => item.type === "mastery");
      const equippedWeapons = actor.items.filter((item) => item.type === "weapon" && item.system.equipped);
      // If the weapon mastery option is enabled then an array of mastery-related ac bonuses are added to the actor's system data.
      if (masteries?.length > 0 && equippedWeapons?.length > 0) {
         for (let weapon of equippedWeapons) {
            const weaponMastery = masteries.find((mastery) => mastery.name === weapon.system.mastery);
            if (weaponMastery) {
               results.push({
                  // The type(s) of attack the AC bonus applies to.
                  acBonusType: weaponMastery.system.acBonusType,
                  // The AC bonus itself, specified as a negative number for better AC.
                  acBonus: weaponMastery.system.acBonus || 0,
                  // The total of the AC with the mastery AC bonus.
                  total: ac.total + (weaponMastery.system.acBonus || 0),
                  // The total of the AAC with the mastery AC bonus.
                  totalAAC: CONFIG.FADE.ToHit.BaseTHAC0 - ac.total + (weaponMastery.system.acBonus || 0),
                  // The number of attacks that this bonus applies to per round.
                  acBonusAT: weaponMastery.system.acBonusAT,
                  name: weaponMastery.name
               });
            }
         }
      }
      return results;
   }

   /**
    * Creates the DM's view of an attack result for the specified target. Also indicates how weapon mastery factored into AC calculation.
    * @param {any} useMasteryAC Whether the system determined the weapon mastery defense bonus applied to this attack or not.
    * @param {any} targetToken The token being attacked.
    * @param {any} defenseMastery The token actor's most applicable defense mastery.
    * @returns Localized html message;
    */
   #getDefenseTargetAC(useMasteryAC, targetToken, defenseMastery, attackType) {
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
         defenseMasteryTotal: this.isAAC ? (CONFIG.FADE.ToHit.BaseTHAC0 - defenseMastery.total) : defenseMastery.total,
         masteryName: defenseMastery.name
      });
   }


   /**
    * Finds the best defense mastery for the specified attacker weapon type,
    * taking into account the number of times the actor has been attacked this round,
    * and the fact that the AC bonus only applies a limited number of times per round.
    *
    * The actor’s combat object contains:
    *   - system.combat.attAgainstH: number of handheld attacks this round
    *   - system.combat.attAgainstM: number of monster attacks this round
    *
    * Each mastery in system.ac.mastery has the following properties:
    *   - acBonus:      the AC bonus value.
    *   - acBonusType:  indicates which attack types the bonus applies to:
    *                   "handheld", "monster", or "all" (applies to both).
    *   - acBonusAT:    the maximum number of attacks per round for which this bonus applies.
    *
    * @public
    * @param {string} attackerWeaponType - "handheld" or "monster"
    * @param {string} attackDirection - "front" or "rear"
    * @returns {object|null} The best defense mastery, or null if none qualifies.
    */
   #getBestDefenseMastery(actor, attackerWeaponType, attackDirection = 'front') {
      let result = null;
      const defenseMasteries = actor.system.ac.mastery;

      if (defenseMasteries && defenseMasteries.length > 0) {
         // Determine how many attacks of this type have been made this round.
         // (For "handheld" attacks use attAgainstH; for "monster" attacks use attAgainstM)
         const attackCount = attackerWeaponType === 'handheld'
            ? (actor.system.combat.attAgainstH || 0)
            : (actor.system.combat.attAgainstM || 0);

         // Filter masteries to those that:
         //   1. Apply to this weapon type (or all types).
         //   2. Still have their bonus available (i.e. current attackCount is less than acBonusAT).
         const applicableMasteries = defenseMasteries.filter(mastery => {
            const typeMatches = (mastery.acBonusType === attackerWeaponType || mastery.acBonusType === 'all');
            const bonusAvailable = attackCount < mastery.acBonusAT || mastery.acBonusAT === null;
            return typeMatches && bonusAvailable;
         });

         if (applicableMasteries.length > 0) {
            // Choose the mastery with the best (lowest) AC bonus.
            result = applicableMasteries.reduce((best, current) => {
               return (current.acBonus < best.acBonus) ? current : best;
            });
         }
      }

      return result;
   }
}