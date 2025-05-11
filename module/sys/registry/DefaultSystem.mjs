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

export class ActorMovement {
   static prepareMovementRates(actor) {
      const roundDivisor = game.settings.get(game.system.id, "mvRoundDivisor") ?? 3;
      const runDivisor = game.settings.get(game.system.id, "runRoundDivisor") ?? 1.5;
      actor.system.movement.turn = actor.system.encumbrance.mv;
      actor.system.movement.round = actor.system.movement.turn > 0 ? Math.floor(actor.system.movement.turn / roundDivisor) : 0;
      actor.system.movement.day = actor.system.movement.turn > 0 ? Math.floor(actor.system.movement.turn / 5) : 0;
      actor.system.movement.run = actor.system.movement.turn > 0 ? Math.floor(actor.system.movement.turn / runDivisor) : 0;

      actor.system.movement2.turn = actor.system.encumbrance.mv2 || 0;
      actor.system.movement2.round = actor.system.movement2.turn > 0 ? Math.floor(actor.system.movement2.turn / roundDivisor) : 0;
      actor.system.movement2.day = actor.system.movement2.turn > 0 ? Math.floor(actor.system.movement2.turn / 5) : 0;
      actor.system.movement2.run = actor.system.movement2.turn > 0 ? Math.floor(actor.system.movement2.turn / runDivisor) : 0;
   }
}
