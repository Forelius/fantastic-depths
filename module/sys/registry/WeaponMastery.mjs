export class WeaponMasteryInterface {
   getActorWeaponType(actor) { throw new Error("Method not implemented."); }
   getAttackRollMod(actor, weapon, options) { throw new Error("Method not implemented."); }
   getAttackTypes(weapon) { throw new Error("Method not implemented."); }
   getDamageMods(weapon, targetWeaponType, formula, modifier) { throw new Error("Method not implemented."); }
   getDefenseACMod(attackerWeaponType, targetToken, attackType) { throw new Error("Method not implemented."); }
   getDefenseMasteries(actor, ac) { throw new Error("Method not implemented."); }
   getRanges(weapon) { throw new Error("Method not implemented."); }
   getWeaponTypes(weapon, attackerActor) { throw new Error("Method not implemented."); }
}

/**
 * Class representing weapon mastery mechanics for heroic-style play.
 * 
 * This class provides methods to manage and calculate weapon mastery effects,
 * including attack roll modifiers, weapon ranges, and defense masteries based 
 * on the actor's equipped weapons and their associated masteries.
 */
export class WeaponMasteryBase extends WeaponMasteryInterface {
   constructor() {
      super();
      this.toHitSystem = game.settings.get(game.system.id, "toHitSystem");
      this.isAAC = this.toHitSystem === "aac";
   }

   /**
    * Retrieves the range of the given weapon, considering mastery if available.
    * @public
    * @param {Object} weapon - The weapon for which to get the range.
    * @returns {number} - The range of the weapon, potentially modified by mastery.
    */
   getRanges(weapon) {
      return weapon.system.range;
   }

   /**
    * Calculates the attack roll modifier for a given actor and weapon.
    * This method considers weapon mastery and applies relevant modifiers based on 
    * the weapon type and actor's characteristics. It returns an object containing 
    * the total modifier and a digest of the applied modifications.
    * @public
    * @param {Object} actor - The actor making the attack.
    * @param {Object} weapon - The weapon being used for the attack.
    * @param {Object} options - Additional options for the attack.
    * @param {string} options.attackType - The type of attack (e.g., melee, missile).
    * @returns {Object} - An object with the attack modifier and a digest of modifications.
    */
   getAttackRollMod(actor, weapon, { attackType } = { attackType: null }) {
      let result = { mod: 0, digest: [] };

      if (weapon?.system?.mastery?.length > 0) {
         const ownerMastery = this._getOwnerMastery(weapon)?.system;
         if (ownerMastery) {
            // Get the to hit bonus, if any.
            const toHitMod = ownerMastery.pToHit;
            if (toHitMod != 0) {
               result.mod += toHitMod;
               const primsec = game.i18n.localize("FADE.Mastery.primary");
               result.digest.push(game.i18n.format("FADE.Chat.rollMods.masteryMod", { primsec, mod: toHitMod }));
            }
         } else if (actor.type != "monster") {
            // Apply penalty for unskilled use if conditions are met
            result = this._applyUnskilledToHitMod(actor, attackType, result);
         }
      }

      return result;
   }

   /**
    * Calculate how owner's weapon mastery modifies this weapon's damage.
    * @public
    * @param {any} weapon The weapon that damage mods are being requested for.
    * @param {any} targetWeaponType The target's weapon type
    * @param {any} formula The current attack formula
    * @param {any} modifier 
    * @returns
    */
   getDamageMods(weapon, targetWeaponType, formula, modifier) {
      const attacker = weapon.actor;
      let result = { formula, digest: [] };

      if (weapon.system.mastery !== "" || weapon.system.natural) {
         let attackerMastery = this._getOwnerMastery(weapon);

         if (attackerMastery) {
            result.formula = attackerMastery.system.pDmgFormula;
            result.digest.push(game.i18n.format("FADE.Chat.rollMods.masteryPrimDmg"));
         } else {
            // Call the private method to handle unskilled use.
            result = this._applyUnskilledDamageMod(result, formula);
         }
      }

      return result;
   }

   /**
    * Calculate the AC based on weapon mastery rules.
    * @public
    * @param {any} attackerWeaponType - The type of weapon used by the attacker.
    * @param {any} targetToken - The token representing the target actor.
    * @param {string} attackType - The type of attack (e.g., melee, ranged).
    * @returns {Object} - An object containing the calculated AC and target AC.
    */
   getDefenseACMod(attackerWeaponType, targetToken, attackType) {
      return { ac: null, targetac: null };
   }

   /**
    * Get the target's potential weapon types
    * @public
    * @param {any} weapon The actor's weapon
    * @param {any} attackerActor The attacker actor
    * @returns Returns weapon types if conditions met, otherwise null.
    */
   getWeaponTypes(weapon, attackerActor) {
      return null;
   }

   /**
    * Attemtps to determine the weapon type of this actor.
    * @public
    * @returns The weapon type of this actor or 'monster' if it can't be determined.
    */
   getActorWeaponType(actor) {
      return null;
   }

   /**
    * Determines the attack types (melee and ranged) available for the given weapon.
    * @public
    * @param {Object} weapon - The weapon to evaluate.
    * @returns {Object} - An object indicating whether the weapon can be used for melee and ranged attacks.
    */
   getAttackTypes(weapon) {
      return null;
   }

   /**
    * Calculates defense masteries for the given actor based on equipped weapons.
    * This method checks the actor's equipped weapons and their associated masteries 
    * to determine any applicable armor class (AC) bonuses. It returns an array of 
    * objects containing the AC bonus details for each applicable mastery.
    * @public
    * @param {Object} actor - The actor for whom to calculate defense masteries.
    * @param {Object} ac - The current armor class data of the actor.
    * @returns {Array} - An array of objects with AC bonus details from applicable masteries.
    */
   getDefenseMasteries(actor, ac) {
      return null;
   }

   /**
    * Returns the mastery item for the given weapon, if it exists.
    * @protected
    * @param {Object} weapon - The weapon to check.
    * @returns {Object|undefined} - The mastery item or undefined.
    */
   _getOwnerMastery(weapon) {
      return weapon?.actor.items.find(item => item.type === "mastery" && item.name === weapon?.system.mastery);
   }


   /**
    * Applies the unskilled use modifier to the damage formula.
    * @protected
    * @param {Object} result - The current damage result object.
    * @param {string} formula - The original damage formula.
    * @returns {Object} - The updated damage result object with the unskilled use modifier applied.
    */
   _applyUnskilledDamageMod(result, formula) {
      return result;
   }

   /**
    * Applies the unskilled use penalty to the attack roll modifier if applicable.
    * @protected
    * @param {Object} actor - The actor making the attack.
    * @param {string} attackType - The type of attack (e.g., melee, missile).
    * @param {Object} result - The current attack roll result object.
    * @returns {Object} - The updated attack roll result object with the penalty applied.
    */
   _applyUnskilledToHitMod(actor, attackType, result) {
      const mod = actor.system.combat.unskilledToHitMod;
      result.mod += mod;
      result.digest.push(game.i18n.format("FADE.Chat.rollMods.unskilledUse", { mod: `${mod}` }));
      return result;
   }
}

export class WeaponMasteryHeroic extends WeaponMasteryBase {

   /**
    * Retrieves the range of the given weapon, considering mastery if available.
    * @public
    * @param {Object} weapon - The weapon for which to get the range.
    * @returns {number} - The range of the weapon, potentially modified by mastery.
    */
   getRanges(weapon) {
      let result = weapon.system.range;
      const mastery = this._getOwnerMastery(weapon);
      if (mastery) {
         result = mastery.system.range;
      }
      return result;
   }

   /**
    * Calculates the attack roll modifier for a given actor and weapon.
    * This method considers weapon mastery and applies relevant modifiers based on 
    * the weapon type and actor's characteristics. It returns an object containing 
    * the total modifier and a digest of the applied modifications.
    * @public
    * @param {Object} actor - The actor making the attack.
    * @param {Object} weapon - The weapon being used for the attack.
    * @param {Object} options - Additional options for the attack.
    * @param {string} options.targetWeaponType - The type of the target weapon.
    * @param {string} options.attackType - The type of attack (e.g., melee, missile).
    * @param {Object} options.target - The target of the attack.
    * @returns {Object} - An object with the attack modifier and a digest of modifications.
    */
   getAttackRollMod(actor, weapon, { targetWeaponType, attackType, target } = { targetWeaponType: null, attackType: null, target: null }) {
      let result = { mod: 0, digest: [] };

      if (weapon?.system?.mastery?.length > 0) {
         const ownerMastery = this._getOwnerMastery(weapon)?.system;
         if (ownerMastery) {
            const bIsPrimary = targetWeaponType === ownerMastery.primaryType || ownerMastery.primaryType === "all";
            // Get the to hit bonus, if any.
            const toHitMod = bIsPrimary ? ownerMastery.pToHit : ownerMastery.sToHit;
            if (toHitMod != 0) {
               result.mod += toHitMod;
               const primsec = bIsPrimary ? game.i18n.localize("FADE.Mastery.primary") : game.i18n.localize("FADE.Mastery.secondary");
               result.digest.push(game.i18n.format("FADE.Chat.rollMods.masteryMod", { primsec, mod: toHitMod }));
            }
         } else if (attackType === "missile" && actor.system.combat.basicProficiency === false) {
            // Apply penalty for unskilled use if correct conditions.
            result = this._applyUnskilledToHitMod(actor, attackType, result);
         }
      }

      return result;
   }

   /**
    * Calculate how owner's weapon mastery modifies this weapon's damage.
    * @public
    * @param {any} weapon The weapon that damage mods are being requested for.
    * @param {any} targetWeaponType The target's weapon type
    * @param {any} formula The current attack formula
    * @param {any} modifier
    * @returns
    */
   getDamageMods(weapon, targetWeaponType, formula, modifier) {
      const attacker = weapon.actor;
      let result = { formula, digest: [] };

      if (weapon.system.mastery !== "" || weapon.system.natural) {
         let attackerMastery = this._getOwnerMastery(weapon);

         // If a no weapon mastery with this weapon, but basicProficiency in all weapons...
         if (attackerMastery === undefined && attacker.system.combat.basicProficiency === true) {
            // Give blanket basic skill usage.
            attackerMastery = {
               system: {
                  primaryType: "all",
                  pDmgFormula: weapon.system.damageRoll
               }
            };
         }

         if (attackerMastery) {
            if (attackerMastery.system.primaryType !== "all" && targetWeaponType === "primary") {
               targetWeaponType = attackerMastery.system.primaryType;
            }
            // If the target weapon type matches the weapon mastery primary target type or mastery effects all weapon types the same...
            if (targetWeaponType && (targetWeaponType === attackerMastery.system.primaryType || attackerMastery.system.primaryType === "all")) {
               result.formula = attackerMastery.system.pDmgFormula;
               result.digest.push(game.i18n.format("FADE.Chat.rollMods.masteryPrimDmg"));
            }
            // Else if the secondary damage is specified...
            else if (attackerMastery.system.sDmgFormula) {
               result.formula = attackerMastery.system.sDmgFormula;
               result.digest.push(game.i18n.format("FADE.Chat.rollMods.masterySecDmg"));
            }
            else {
               // Else use primary damage type.
               result.formula = attackerMastery.system.pDmgFormula;
               result.digest.push(game.i18n.format("FADE.Chat.rollMods.masterySecDmg"));
            }
         } else {
            // Call the protected method to handle unskilled use.
            result = this._applyUnskilledDamageMod(result, formula);
         }
      }

      return result;
   }

   /**
    * Calculate the AC based on weapon mastery rules.
    * @public
    * @param {any} attackerWeaponType - The type of weapon used by the attacker.
    * @param {any} targetToken - The token representing the target actor.
    * @param {string} attackType - The type of attack (e.g., melee, ranged).
    * @returns {Object} - An object containing the calculated AC and target AC.
    */
   getDefenseACMod(attackerWeaponType, targetToken, attackType) {
      let result = { ac: null, targetac: null };
      const defenseMastery = this.#getBestDefenseMastery(targetToken.actor, attackerWeaponType);
      if (defenseMastery && defenseMastery.acBonus !== Infinity) {
         // Get the appropriate attacks against weapon type.
         const attAgainst = attackerWeaponType === "handheld" ? targetToken.actor.system.combat.attAgainstH : targetToken.actor.system.combat.attAgainstM;
         // Get the appropriate total AC based on attack type.
         const totalAC = attackType === "melee" ? targetToken.actor.system.ac?.total : targetToken.actor.system.ac?.totalRanged;
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
    * @public
    * @param {any} weapon The actor's weapon
    * @param {any} attackerActor The attacker actor
    * @returns Returns weapon types if conditions met, otherwise null.
    */
   getWeaponTypes(weapon, attackerActor) {
      let result = null;
      // Get the actor's weapon mastery data.
      const attackerMastery = this._getOwnerMastery(weapon);
      // If the actor is a monster, weaponData indicates a spell is being cast or the actor has a mastery for the weapon being used...
      if (attackerActor.type === "monster" || weapon.type === "spell" || attackerMastery) {
         result = {
            monster: game.i18n.localize("FADE.Mastery.weaponTypes.monster.long"),
            handheld: game.i18n.localize("FADE.Mastery.weaponTypes.handheld.long")
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
      let result = "monster";
      const weapons = actor?.items.filter(item => item.type === "weapon");
      const equippedWeapons = weapons?.filter(item => item.system.equipped === true && item.system.quantity > 0);
      if (equippedWeapons && equippedWeapons.length > 0) {
         result = equippedWeapons[0].system.weaponType;
      } else if (weapons && weapons.length > 0) {
         result = "monster";
         console.warn(`${actor.name} has weapons, but none are equipped or the quantity is zero.`)
      }
      return result;
   }

   /**
    * Determines the attack types (melee and ranged) available for the given weapon.
    * @public
    * @param {Object} weapon - The weapon to evaluate.
    * @returns {Object} - An object indicating whether the weapon can be used for melee and ranged attacks.
    */
   getAttackTypes(weapon) {
      const actor = weapon.actor;
      let result = { canMelee: weapon.system.canMelee, canRanged: weapon.system.canRanged };
      // Weapon mastery is enabled, so weapons can gain the ability to do ranged at certain levels.
      const ownerMastery = this._getOwnerMastery(weapon);
      if (ownerMastery) {
         result.canRanged = ownerMastery.system.canRanged;
         result.canMelee = weapon.system.canMelee;
      }
      return result;
   }

   /**
    * Calculates defense masteries for the given actor based on equipped weapons.
    * This method checks the actor's equipped weapons and their associated masteries 
    * to determine any applicable armor class (AC) bonuses. It returns an array of 
    * objects containing the AC bonus details for each applicable mastery.
    * @public
    * @param {Object} actor - The actor for whom to calculate defense masteries.
    * @param {Object} ac - The current armor class data of the actor.
    * @returns {Array} - An array of objects with AC bonus details from applicable masteries.
    */
   getDefenseMasteries(actor, ac) {
      const results = [];
      const masteries = actor.items.filter(item => item.type === "mastery");
      const equippedWeapons = actor.items.filter((item) => item.type === "weapon" && item.system.equipped);
      // If the weapon mastery option is enabled then an array of mastery-related ac bonuses are added to the actor's system data.
      if (masteries?.length > 0 && equippedWeapons?.length > 0) {
         for (let weapon of equippedWeapons) {
            const ownerMastery = masteries.find((mastery) => mastery.name === weapon.system.mastery);
            if (ownerMastery) {
               results.push({
                  // The type(s) of attack the AC bonus applies to.
                  acBonusType: ownerMastery.system.acBonusType,
                  // The AC bonus itself, specified as a negative number for better AC.
                  acBonus: ownerMastery.system.acBonus || 0,
                  // The total of the AC with the mastery AC bonus.
                  total: ac.total + (ownerMastery.system.acBonus || 0),
                  // The total of the AAC with the mastery AC bonus.
                  totalAAC: CONFIG.FADE.ToHit.baseTHAC0 - ac.total + (ownerMastery.system.acBonus || 0),
                  // The number of attacks that this bonus applies to per round.
                  acBonusAT: ownerMastery.system.acBonusAT,
                  name: ownerMastery.name
               });
            }
         }
      }
      return results;
   }

   /**
    * Applies the unskilled use modifier to the damage formula.
    * @protected
    * @param {Object} result - The current damage result object.
    * @param {string} formula - The original damage formula.
    * @returns {Object} - The updated damage result object with the unskilled use modifier applied.
    */
   _applyUnskilledDamageMod(result, formula) {
      result.formula = `floor(${formula}/2)`;
      result.digest.push(game.i18n.format("FADE.Chat.rollMods.unskilledUse", { mod: "/2" }));
      return result;
   }

   /**
    * Applies the unskilled use penalty to the attack roll modifier if applicable.
    * @protected
    * @param {Object} actor - The actor making the attack.
    * @param {string} attackType - The type of attack (e.g., melee, missile).
    * @param {Object} result - The current attack roll result object.
    * @returns {Object} - The updated attack roll result object with the penalty applied.
    */
   _applyUnskilledToHitMod(actor, attackType, result) {
      result.mod -= 1;
      result.digest.push(game.i18n.format("FADE.Chat.rollMods.unskilledUse", { mod: "-1" }));
      return result;
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
    * @param {string} attackerWeaponType - "handheld" or "monster"
    * @param {string} attackDirection - "front" or "rear"
    * @returns {object|null} The best defense mastery, or null if none qualifies.
    */
   #getBestDefenseMastery(actor, attackerWeaponType, attackDirection = "front") {
      let result = null;
      const defenseMasteries = actor.system.ac.mastery;

      if (defenseMasteries && defenseMasteries.length > 0) {
         // Determine how many attacks of this type have been made this round.
         // (For "handheld" attacks use attAgainstH; for "monster" attacks use attAgainstM)
         const attackCount = attackerWeaponType === "handheld"
            ? (actor.system.combat.attAgainstH || 0)
            : (actor.system.combat.attAgainstM || 0);

         // Filter masteries to those that:
         //   1. Apply to this weapon type (or all types).
         //   2. Still have their bonus available (i.e. current attackCount is less than acBonusAT).
         const applicableMasteries = defenseMasteries.filter(mastery => {
            const typeMatches = (mastery.acBonusType === attackerWeaponType || mastery.acBonusType === "all");
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

   /**
    * Creates the DM's view of an attack result for the specified target. Also indicates how weapon mastery factored into AC calculation.
    * @param {any} useMasteryAC Whether the system determined the weapon mastery defense bonus applied to this attack or not.
    * @param {any} targetToken The token being attacked.
    * @param {any} defenseMastery The token actor's most applicable defense mastery.
    * @returns Localized html message;
    */
   #getDefenseTargetAC(useMasteryAC, targetToken, defenseMastery, attackType) {
      return game.i18n.format("FADE.Chat.targetACDefMastery", {
         cssClass: (useMasteryAC === false && attackType === "melee" ? `style="color:green"` : ""),
         cssClassMastery: (useMasteryAC ? `style="color:green"` : ""),
         acTotal: this.isAAC ? targetToken.actor.system.ac?.totalAAC : targetToken.actor.system.ac?.total,
         targetRangedAc: targetToken.actor.system.ac?.totalRanged !== targetToken.actor.system.ac?.total
            ? game.i18n.format("FADE.Chat.targetRangedAC", {
               acTotal: this.isAAC ? targetToken.actor.system.ac?.totalRangedAAC : targetToken.actor.system.ac?.totalRanged,
               cssClass: (!useMasteryAC && attackType === "missile" ? `style="color:green"` : "")
            })
            : "",
         attAgainst: attackType === "handheld" ? targetToken.actor.system.combat.attAgainstH : targetToken.actor.system.combat.attAgainstM,
         maxAttAgainst: defenseMastery.acBonusAT,
         defenseMasteryTotal: this.isAAC ? (CONFIG.FADE.ToHit.baseTHAC0 - defenseMastery.total) : defenseMastery.total,
         masteryName: defenseMastery.name
      });
   }
}