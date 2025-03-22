import { ChatFactory, CHAT_TYPE } from '../chat/ChatFactory.mjs';
import { DialogFactory } from '../dialog/DialogFactory.mjs';

export class moraleCheck {
   async execute(data) {
      const { actor, event } = data;
      const ctrlKey = event.originalEvent.ctrlKey;
      const dataset = event.currentTarget.dataset;
      dataset.formula = '2d6';
      dataset.pass = 'lte';
      dataset.dialog = 'generic';
      let chatType = CHAT_TYPE.GENERIC_ROLL;
      let dialogResp = null;

      if (ctrlKey === false) {
         dialogResp = await DialogFactory(dataset, actor);
         if (dialogResp?.resp?.rolling === true) {
            dataset.formula = dialogResp.resp.mod != 0 ? (dataset.pass.startsWith("gt") ? `${dataset.formula}+@mod` : `${dataset.formula}-@mod`) : dataset.formula;
         } else {
            // This will stop the process below.
            chatType = null;
         }
      }

      if (chatType !== null) {
         const rollContext = { ...actor.getRollData(), ...dialogResp?.resp || {} };
         const rolled = await new Roll(dataset.formula, rollContext).evaluate();
         const chatData = { dialogResp: dialogResp, caller: actor, context: actor, mdata: dataset, roll: rolled };
         const showResult = actor._getShowResult(event);
         const builder = new ChatFactory(chatType, chatData, { showResult });
         builder.createChatMessage();
      }
   }
}

export class abilityCheck {
   async execute(data) {
      const { actor, event } = data;
      const ctrlKey = event.originalEvent.ctrlKey;
      const dataset = event.currentTarget.dataset;
      let dialogResp = null;
      const chatType = CHAT_TYPE.ABILITY_CHECK;
      let formula = dataset.formula;

      formula = formula ? formula : '1d20';
      dataset.dialog = dataset.test;

      if (ctrlKey === false) {
         dialogResp = await DialogFactory(dataset, actor);
         if (dialogResp?.resp?.rolling === true) {
            formula = (dialogResp !== null && dialogResp?.resp.mod != 0) ? "1d20-@mod" : "1d20";
         } else {
            // This will stop the process below.
            chatType = null;
         }
      }

      if (chatType !== null) {
         const rollContext = { ...actor.getRollData(), ...dialogResp?.resp || {} };
         const rolled = await new Roll(formula, rollContext).evaluate();
         const chatData = { dialogResp: dialogResp, caller: actor, context: actor, mdata: dataset, roll: rolled };
         const showResult = actor._getShowResult(event);
         const builder = new ChatFactory(chatType, chatData, { showResult });
         builder.createChatMessage();
      }
   }
}