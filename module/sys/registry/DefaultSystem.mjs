import { ChatFactory, CHAT_TYPE } from '/systems/fantastic-depths/module/chat/ChatFactory.mjs';
import { DialogFactory } from '/systems/fantastic-depths/module/dialog/DialogFactory.mjs';

export class MoraleCheck {
   async execute(data) {
      const { actor, event } = data;
      const ctrlKey = event.ctrlKey;
      const dataset = event.currentTarget.dataset;
      dataset.formula = '2d6';
      dataset.pass = 'lte';
      dataset.dialog = 'generic';
      let chatType = CHAT_TYPE.GENERIC_ROLL;
      let dialogResp = null;

      if (ctrlKey === false) {
         dialogResp = await DialogFactory(dataset, actor);
         if (dialogResp) {
            dialogResp.formula = dialogResp.formula?.length > 0 ? dialogResp.formula : dataset.formula;
            dataset.formula = Number(dialogResp.mod) != 0 ? `${dataset.formula}+@mod` : dataset.formula;
         } else {
            // This will stop the process below.
            chatType = null;
         }
      }

      if (chatType !== null) {
         const rollContext = { ...actor.getRollData(), ...dialogResp || {} };
         const rolled = await new Roll(dataset.formula, rollContext).evaluate();
         const chatData = { caller: actor, context: actor, mdata: dataset, roll: rolled };
         const showResult = actor._getShowResult(event);
         const builder = new ChatFactory(chatType, chatData, { showResult });
         builder.createChatMessage();
      }
   }
}

/** Ability checks are often implemented differently for different systems. */
export class AbilityCheck {
   async execute(data) {
      const { actor, event } = data;
      const ctrlKey = event.ctrlKey;
      const dataset = event.target.dataset;
      let dialogResp = null;
      let chatType = CHAT_TYPE.ABILITY_CHECK;

      dataset.formula = game.settings.get(game.system.id, "abilityCheckFormula");
      dataset.dialog = dataset.test;

      if (ctrlKey === false) {
         dialogResp = await DialogFactory(dataset, actor);
         if (dialogResp) {
            dialogResp.formula = dialogResp.formula?.length > 0 ? dialogResp.formula : dataset.formula;
            dataset.formula = Number(dialogResp.mod) != 0 ? `${dialogResp.formula}+@mod` : dialogResp.formula;
         } else {
            // This will stop the process below.
            chatType = null;
         }
      }

      if (chatType !== null) {
         const rollContext = { ...actor.getRollData(), ...dialogResp || {} };
         const rolled = await new Roll(dataset.formula, rollContext).evaluate();
         const chatData = { caller: actor, context: actor, mdata: dataset, roll: rolled };
         const showResult = actor._getShowResult(event);
         const builder = new ChatFactory(chatType, chatData, { showResult });
         builder.createChatMessage();
      }
   }
}

/** Not sure where this is going yet, but breaking into own system. */
export class ActorArmor {
   /**
    * Prepare derived armor class values.
    */
   prepareDerivedData(actor) {
      const acDigest = [];
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

      const naturalArmor = actor.items.find(item => item.type === 'armor' && item.system.natural);
      actor.system.equippedArmor = actor.items.find(item => item.type === 'armor' && item.system.equipped && !item.system.isShield);
      const equippedShield = actor.items.find(item => item.type === 'armor' && item.system.equipped && item.system.isShield);

      if (dexMod !== 0) {
         acDigest.push(game.i18n.localize('FADE.Armor.dexterityBonus', { bonus: dexMod }));
      }

      // If natural armor
      if (naturalArmor?.system.totalAC !== null && naturalArmor?.system.totalAC !== undefined) {
         ac.naked = naturalArmor.system.totalAC - dexMod;
         ac.value = ac.naked;
         ac.total = ac.naked;
         naturalArmor.system.equipped = true;
         acDigest.push(`${naturalArmor.name}: ${naturalArmor.system.totalAC}`);
      }

      // If an equipped armor is found...
      if (actor.system.equippedArmor) {
         ac.value = actor.system.equippedArmor.system.ac;
         // What was ac.mod for??
         ac.mod += actor.system.equippedArmor.system.mod ?? 0;
         // Reapply dexterity mod, since overwriting ac.total here.
         ac.total = actor.system.equippedArmor.system.totalAC - dexMod;
         acDigest.push(`${actor.system.equippedArmor.name}: ${actor.system.equippedArmor.system.totalAC}`);
      }

      // If a shield is equipped...
      if (equippedShield) {
         ac.value -= equippedShield.system.ac;
         ac.shield = equippedShield.system.totalAC;
         ac.total -= equippedShield.system.totalAC;
         acDigest.push(`${equippedShield.name}: ${equippedShield.system.totalAC}`);
      }

      if (actor.system.mod.baseAc != 0) {
         acDigest.push(`${game.i18n.localize('FADE.Armor.modBase')}: ${actor.system.mod.baseAc}`);
      }
      if (actor.system.mod.ac != 0) {
         ac.total -= actor.system.mod.ac;
         acDigest.push(`${game.i18n.localize('FADE.Armor.mod')}: ${actor.system.mod.ac}`);
      }

      ac.nakedRanged = ac.total;
      ac.totalRanged = ac.total;
      // Normal Calcs done at this point --------------------------------

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

      // Now other mods. Dexterity bonus already applied above.
      ac.nakedAAC = CONFIG.FADE.ToHit.BaseTHAC0 - ac.naked;
      ac.totalAAC = CONFIG.FADE.ToHit.BaseTHAC0 - ac.total;
      ac.totalRangedAAC = CONFIG.FADE.ToHit.BaseTHAC0 - ac.totalRanged;
      ac.nakedRangedAAC = CONFIG.FADE.ToHit.BaseTHAC0 - ac.nakedRanged;

      // Weapon mastery defense bonuses. These do not change the AC on the character sheet.
      const weaponMasterySystem = game.fade.registry.getSystem('weaponMasterySystem');
      if (weaponMasterySystem) {
         ac.mastery = weaponMasterySystem.getDefenseMasteries(actor, ac);
      }

      actor.system.ac = ac;
      actor.system.acDigest = acDigest;
   }
}

export class ActorMovement {
   static prepareMovementRates(actor) {
      const roundDivisor = game.settings.get(game.system.id, "mvRoundDivisor") ?? 3;
      const runDivisor = game.settings.get(game.system.id, "runRoundDivisor") ?? 1.5;
      actor.system.movement.turn = actor.system.encumbrance.mv;
      actor.system.movement.round = actor.system.movement.turn > 0 ? Math.floor(actor.system.movement.turn / roundDivisor) : 0;
      actor.system.movement.day = actor.system.movement.turn > 0 ? Math.floor(actor.system.movement.turn / 5) : 0;
      actor.system.movement.run = actor.system.movement.turn > 0 ? Math.floor(actor.system.movement.turn / runDivisor) : 0;

      actor.system.flight.turn = actor.system.encumbrance.fly || 0;
      actor.system.flight.round = actor.system.flight.turn > 0 ? Math.floor(actor.system.flight.turn / roundDivisor) : 0;
      actor.system.flight.day = actor.system.flight.turn > 0 ? Math.floor(actor.system.flight.turn / 5) : 0;
      actor.system.flight.run = actor.system.flight.turn > 0 ? Math.floor(actor.system.flight.turn / runDivisor) : 0;
   }
}
