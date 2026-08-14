import { DialogFactory } from '../../dialog/DialogFactory.js';
import { ChatFactory } from '../../chat/ChatFactory.js';
import { CHAT_TYPE } from '../../chat/ChatTypeEnum.js'
import { SpecialAbilityItem } from '../../item/SpecialAbilityItem.js';

export class SavingThrowSystem {
   /**
    * Performs the requested saving throw roll on the actor.
    * @public
    * @param {any} data An object containing the actor, saving throw type, and event.
    */
   async execute(data): Promise<void> {
      const { actor, type, event } = data;
      if (actor.testUserPermission(game.user, "OWNER") === false) return;

      const saveItem = this.#getSavingThrow(actor, type); // Saving throw item
      if (!saveItem) return;

      const digest = [];
      const ctrlKey = event?.ctrlKey ?? false;
      const rollData = actor.getRollData();
      let dialogResp = null;
      const dataset = {
         dialog: "save",
         pass: saveItem.system.operator,
         target: saveItem.system.target,
         rollmode: saveItem.system.rollMode,
         label: saveItem.name,
         type: null
      }
      if (actor.type === "character") {
         dataset.type = type;
      }

      if (ctrlKey === true) {
         dialogResp = {
            mod: 0
         };
      } else {
         dialogResp = await DialogFactory(dataset, actor);
      }

      if (dialogResp) {
         let rollMod = 0;

         // Modifier from dialog
         const manualMod = Number(dialogResp.mod) || 0;
         if (manualMod != 0) {
            digest.push(game.i18n.format("FADE.Chat.rollMods.manual", { mod: dialogResp.mod }));
         }

         // Ability score mod
         const abilityScoreSys = game.fade.registry.getSystem("abilityScore");
         const abilityScoreMod = abilityScoreSys.getSavingThrowMod(actor, dialogResp.action, saveItem);
         if (abilityScoreMod !== 0) {
            digest.push(game.i18n.format("FADE.Chat.rollMods.abilityScoreMod", { mod: abilityScoreMod }));
         }

         // Mods from active effects
         let effectMod = actor.system.mod.save[type] || 0;
         effectMod += actor.system.mod.save.all || 0;
         if (effectMod != 0) {
            digest.push(game.i18n.format("FADE.Chat.rollMods.effectMod2", { mod: effectMod }));
         }
         rollMod += manualMod + abilityScoreMod + effectMod;
         rollData.formula = rollMod !== 0 ? `${saveItem.system.rollFormula}+@mod` : `${saveItem.system.rollFormula}`;
         const rollContext = { ...rollData, mod: rollMod };
         const rolled = await new Roll(rollData.formula, rollContext).evaluate();
         const chatData = {
            context: actor,
            caller: saveItem,
            mdata: dataset,
            roll: rolled,
            digest
         };

         const showResult = saveItem.getShowResult(event);
         const builder = new ChatFactory(CHAT_TYPE.GENERIC_ROLL, chatData, { showResult });
         return await builder.createChatMessage();
      }
   }

   /**
    * Static event handler for click on the saving throw button in chat.
    * @public
    * @param {any} event
    */
   static async handleSavingThrowRequest(event) {
      event.preventDefault(); // Prevent the default behavior
      event.stopPropagation(); // Stop other handlers from triggering the event
      const dataset = event.currentTarget.dataset;
      /** @type {Array<any>} */ // or /** @type {Token[]} */
      const selected: Token[] = Array.from(canvas.tokens.controlled);
      const hasSelected = selected.length > 0;
      if (hasSelected === false) {
         ui.notifications.warn(game.i18n.localize("FADE.notification.selectToken1"));
      } else {
         const savingThrowSys = game.fade.registry.getSystem("savingThrowSystem");
         for (const target of selected) {
            // Roll for each token's actor
            savingThrowSys.execute({ actor: target.actor, type: dataset.type, event });
         }
      }
   }

   #getSavingThrow(actor, saveType): SpecialAbilityItem {
      const result = actor.items.find(item => item.type === "specialAbility"
         && item.system.category === "save"
         && item.system.customSaveCode === saveType) as SpecialAbilityItem;
      if (!result) {
         ui.notifications.error(game.i18n.format("FADE.notification.missingSave", { saveType }));
      }
      return result;
   }
}
