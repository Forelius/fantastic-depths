import { ChatFactory, CHAT_TYPE } from "../../chat/ChatFactory.mjs";
import { DialogFactory } from "../../dialog/DialogFactory.mjs";

export class MoraleCheck {
   async execute(data) {
      const { actor, event } = data;
      const ctrlKey = event.ctrlKey;
      const dataset = event.target.dataset;
      dataset.formula = "2d6";
      dataset.pass = "lte";
      dataset.dialog = "generic";
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
