/** Not sure where this is going yet, but breaking into own system. */
export class ArmorSystemBase {

   reset(actor) {
      const dexMod = (actor.system.abilities?.dex.mod ?? 0);
      const baseAC = CONFIG.FADE.Armor.acNaked - dexMod - actor.system.mod.baseAc;
      let ac = {};
      ac.nakedAAC = CONFIG.FADE.ToHit.BaseTHAC0 - baseAC;
      ac.naked = baseAC;
      // AC value is used for wrestling rating and should not include Dexterity bonus.
      ac.value = CONFIG.FADE.Armor.acNaked;
      ac.total = baseAC;
      ac.mod = 0;
      ac.shield = 0;
      return ac;
   }

   getArmorPieces(actor) {
      return {
         naturalArmor: actor.items.find(item => item.type === 'armor' && item.system.natural),
         equippedArmor: actor.items.find(item => item.type === 'armor' && item.system.equipped && !item.system.isShield),
         equippedShield: actor.items.find(item => item.type === 'armor' && item.system.equipped && item.system.isShield)
      }
   }
}

export class ClassicArmorSystem extends ArmorSystemBase {
   /**
    * Prepare derived armor class values.
    */
   prepareDerivedData(actor) {
      const acDigest = [];
      const dexMod = (actor.system.abilities?.dex.mod ?? 0);
      let ac = this.reset(actor);
      const { naturalArmor, equippedArmor, equippedShield } = this.getArmorPieces(actor);

      if (dexMod !== 0) {
         acDigest.push(game.i18n.localize('FADE.Armor.dexterityBonus', { bonus: dexMod }));
      }

      this.prepareNaturalArmor(naturalArmor, ac, dexMod, acDigest);
      this.prepareEquippedArmor(equippedArmor, ac, dexMod, acDigest);
      this.prepareShield(equippedShield, ac, acDigest);
      this.prepareACMod(actor, acDigest, ac);
      this.prepareAAC(ac);

      // Weapon mastery defense bonuses. These do not change the AC on the character sheet.
      ac.mastery = game.fade.registry.getSystem('weaponMasterySystem')?.weaponMasterySystem.getDefenseMasteries(actor, ac) ?? ac.mastery;

      actor.system.ac = ac;
      actor.system.acDigest = acDigest;
   }

   prepareNaturalArmor(naturalArmor, ac, dexMod, acDigest) {
      // If natural armor
      if (naturalArmor?.system.totalAC !== null && naturalArmor?.system.totalAC !== undefined) {
         ac.naked = naturalArmor.system.totalAC - dexMod;
         ac.value = ac.naked;
         ac.total = ac.naked;
         ac.av = naturalArmor.system.av;
         naturalArmor.system.equipped = true;
         acDigest.push(`${naturalArmor.name}: ${naturalArmor.system.totalAC}`);
      }
   }

   prepareEquippedArmor(equippedArmor, ac, dexMod, acDigest) {
      // If an equipped armor is found...
      if (equippedArmor) {
         if (equippedArmor.system.av?.length > 0) {
            const evaluatedRoll = equippedArmor.getEvaluatedRollSync(equippedArmor.system.av);
            ac.av = evaluatedRoll?.formula;
         }
         ac.value = equippedArmor.system.ac;
         // What was ac.mod for??
         ac.mod += equippedArmor.system.mod ?? 0;
         // Reapply dexterity mod, since overwriting ac.total here.
         ac.total = equippedArmor.system.totalAC - dexMod;
         acDigest.push(`${equippedArmor.name}: ${equippedArmor.system.totalAC}`);
      }
   }

   prepareShield(equippedShield, ac, acDigest) {
      // If a shield is equipped...
      if (equippedShield) {
         ac.value -= equippedShield.system.ac;
         ac.shield = equippedShield.system.totalAC;
         ac.total -= equippedShield.system.totalAC;
         acDigest.push(`${equippedShield.name}: ${equippedShield.system.totalAC}`);
      }
   }

   prepareACMod(actor, acDigest, ac) {
      if (actor.system.mod.baseAc != 0) {
         // Not sure why this does nothing.
         acDigest.push(`${game.i18n.localize('FADE.Armor.modBase')}: ${actor.system.mod.baseAc}`);
      }
      if (actor.system.mod.ac != 0) {
         // Apply actor's ac modifier to total
         ac.total -= actor.system.mod.ac;
         acDigest.push(`${game.i18n.localize('FADE.Armor.mod')}: ${actor.system.mod.ac}`);
      }
      ac.nakedRanged = ac.total;
      ac.totalRanged = ac.total;

      if (actor.system.mod.upgradeAc && actor.system.mod.upgradeAc < ac.total) {
         ac.total = actor.system.mod.upgradeAc;
         ac.naked = actor.system.mod.upgradeAc;
         acDigest.push(`AC upgraded to ${actor.system.mod.upgradeAc}`);
      }
      if (actor.system.mod.upgradeRangedAc && actor.system.mod.upgradeRangedAc < ac.totalRanged) {
         ac.totalRanged = actor.system.mod.upgradeRangedAc;
         ac.nakedRanged = actor.system.mod.upgradeRangedAc;
         acDigest.push(`Ranged AC upgraded to ${actor.system.mod.upgradeRangedAc}`);
      }
   }

   prepareAAC(ac) {
      ac.nakedAAC = CONFIG.FADE.ToHit.BaseTHAC0 - ac.naked;
      ac.totalAAC = CONFIG.FADE.ToHit.BaseTHAC0 - ac.total;
      ac.totalRangedAAC = CONFIG.FADE.ToHit.BaseTHAC0 - ac.totalRanged;
      ac.nakedRangedAAC = CONFIG.FADE.ToHit.BaseTHAC0 - ac.nakedRanged;
   }
}