export class ArmorSystemBase {
   constructor() { }

   reset(actor) {
      const abilityScoreSys = game.fade.registry.getSystem("abilityScore");
      const abilityScoreACMod = abilityScoreSys.getBaseACMod(actor);
      const baseAC = CONFIG.FADE.Armor.acNaked - abilityScoreACMod - actor.system.mod.baseAc;
      const ac = {
         nakedAAC: CONFIG.FADE.ToHit.baseTHAC0 - baseAC,
         naked: baseAC,
         nakedRanged: CONFIG.FADE.ToHit.baseTHAC0 - baseAC,
         // AC value is used for wrestling rating and should not include Dexterity bonus.
         value: CONFIG.FADE.Armor.acNaked,
         total: baseAC,
         totalRanged: baseAC,
         mod: 0,
         shield: 0,
         mastery: null
      }
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
   constructor() {
      super();
   }

   /**
    * Prepare derived armor class values.
    */
   prepareDerivedData(actor) {
      const acDigest = [];
      const abilityScoreSys = game.fade.registry.getSystem("abilityScore");
      const abilityScoreACMod = abilityScoreSys.getBaseACMod(actor);
      const ac = this.reset(actor);
      const { naturalArmor, equippedArmor, equippedShield } = this.getArmorPieces(actor);

      if (abilityScoreACMod !== 0) {
         acDigest.push(game.i18n.localize('FADE.Armor.abilityScoreBonus', { bonus: abilityScoreACMod }));
      }

      this.prepareNaturalArmor(naturalArmor, ac, abilityScoreACMod, acDigest);
      this.prepareEquippedArmor(equippedArmor, ac, abilityScoreACMod, acDigest);
      this.prepareShield(equippedShield, ac, acDigest);
      this.prepareACMod(actor, acDigest, ac);
      this.prepareAAC(ac);

      // Weapon mastery defense bonuses. These do not change the AC on the character sheet.
      ac.mastery = game.fade.registry.getSystem('weaponMastery')?.getDefenseMasteries(actor, ac) ?? ac.mastery;

      actor.system.ac = ac;
      actor.system.acDigest = acDigest;
   }

   prepareNaturalArmor(naturalArmor, ac, abilityScoreACMod, acDigest) {
      // If natural armor
      if (naturalArmor?.system.totalAC !== null && naturalArmor?.system.totalAC !== undefined) {
         ac.naked = naturalArmor.system.totalAC - abilityScoreACMod;
         ac.nakedRanged = naturalArmor.system.totalRangedAC - abilityScoreACMod;
         ac.value = ac.naked;
         ac.total = ac.naked;
         ac.totalRanged = naturalArmor.system.totalRangedAC - abilityScoreACMod;
         ac.av = naturalArmor.system.av;
         naturalArmor.system.equipped = true;
         acDigest.push(`${naturalArmor.name}: ${naturalArmor.system.totalAC}/${naturalArmor.system.totalRangedAC}`);
      }
   }

   prepareEquippedArmor(equippedArmor, ac, abilityScoreACMod, acDigest) {
      // If an equipped armor is found...
      if (equippedArmor) {
         if (equippedArmor.system.av?.length > 0) {
            const evaluatedRoll = equippedArmor.getEvaluatedRollSync(equippedArmor.system.av);
            ac.av = evaluatedRoll?.formula;
         }
         ac.value = equippedArmor.system.ac;
         // What was ac.mod for??
         ac.mod += equippedArmor.system.mod ?? 0;
         ac.modRanged += ac.mod + equippedArmor.system.modRanged;
         // Reapply dexterity mod, since overwriting ac.total here.
         ac.total = equippedArmor.system.totalAC - abilityScoreACMod;
         ac.totalRanged = equippedArmor.system.totalRangedAC - abilityScoreACMod;
         acDigest.push(`${equippedArmor.name}: ${equippedArmor.system.totalAC}/${equippedArmor.system.totalRangedAC}`);
      }
   }

   prepareShield(equippedShield, ac, acDigest) {
      // If a shield is equipped...
      if (equippedShield) {
         ac.value -= equippedShield.system.ac;
         ac.shield = equippedShield.system.totalAC;
         ac.total -= equippedShield.system.totalAC;
         ac.totalRanged -= equippedShield.system.totalRangedAC;
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
      if (actor.system.mod.rangedAc != 0) {
         // Apply actor's ranged ac modifier to total
         ac.totalRanged -= actor.system.mod.rangedAc;
         acDigest.push(`${game.i18n.localize('FADE.Armor.modRanged')}: ${actor.system.mod.rangedAc}`);
      }

      // Handle the upgradeAc modifier
      if (actor.system.mod.upgradeAc !== null && actor.system.mod.upgradeAc < ac.total) {
         ac.total = actor.system.mod.upgradeAc;
         ac.naked = actor.system.mod.upgradeAc;
         acDigest.push(`AC upgraded to ${actor.system.mod.upgradeAc}`);
      }
      // Handle the upgradeRangedAc modifier
      if (actor.system.mod.upgradeRangedAc !== null && actor.system.mod.upgradeRangedAc < ac.totalRanged) {
         ac.totalRanged = actor.system.mod.upgradeRangedAc;
         ac.nakedRanged = actor.system.mod.upgradeRangedAc;
         acDigest.push(`Ranged AC upgraded to ${actor.system.mod.upgradeRangedAc}`);
      }
   }

   prepareAAC(ac) {
      ac.nakedAAC = CONFIG.FADE.ToHit.baseTHAC0 - ac.naked;
      ac.totalAAC = CONFIG.FADE.ToHit.baseTHAC0 - ac.total;
      ac.totalRangedAAC = CONFIG.FADE.ToHit.baseTHAC0 - ac.totalRanged;
      ac.nakedRangedAAC = CONFIG.FADE.ToHit.baseTHAC0 - ac.nakedRanged;
   }
}