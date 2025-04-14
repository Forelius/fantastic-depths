import { fadeFinder } from '/systems/fantastic-depths/module/utils/finder.mjs';
class TurnData {
   constructor(data) {
      Object.assign(this, data);

      this.timeSteps = {
         round: game.settings.get(game.system.id, "roundDurationSec") ?? 10,
         turn: game.settings.get(game.system.id, "turnDurationSec") ?? 10 * 60,
         hour: 10 * 60 * 6, // 60 minutes
         day: 86400
      };
      this.settings = {
         needRestCondition: "",
         restFrequency: 0,
      };
   }

   get sessionTR() {
      return this.toTurnsRounds(this.dungeon.session);
   }

   get totalTR() {
      return this.toTurnsRounds(this.dungeon.total);
   }

   get restTR() {
      return this.toTurnsRounds(this.dungeon.rest);
   }

   toTurnsRounds(turns = 0) {
      return {
         turns: Math.floor(turns),
         rounds: ((Math.abs(turns % 1) * this.timeSteps.turn) / this.timeSteps.round),
         roundsDisplay: ((Math.abs(turns % 1) * this.timeSteps.turn) / this.timeSteps.round).toFixed(1)
      };
   }

   saveSettings() {
      game.settings.set(game.system.id, 'turnData', this);
   }

   resetSession() {
      this.dungeon.session = 0;
      this.saveSettings();
   }

   resetTotal() {
      this.dungeon.session = 0;
      this.dungeon.total = 0;
      this.dungeon.rest = 0;
      this.worldTime = game.time.worldTime
      this.saveSettings();
   }

   rest() {
      this.dungeon.rest = 0;
   }

   async updateTime(seconds, skipRest=false) {
      const turns = seconds / this.timeSteps.turn;
      this.dungeon.session += turns;
      this.dungeon.total += turns;
      if (skipRest === false) {
         this.dungeon.rest += turns;
      }
      this.worldTime = game.time.worldTime;
      this.saveSettings();
      return turns;
   }
}

export class TurnTrackerForm extends FormApplication {
   constructor(object = {}, options = {}) {
      super(object, options);
      this.isGM = game.user.isGM;
      this.settingsChanged = false;
      this.turnData = new TurnData();
      this.isResting = false;
      // Only keep necessary properties
      Object.assign(this.turnData, game.settings.get(game.system.id, 'turnData'));
   }

   static get defaultOptions() {
      const options = super.defaultOptions;
      options.id = "turn-tracker-form";
      options.template = `systems/${game.system.id}/templates/apps/turn-tracker.hbs`;
      options.width = 400;
      options.height = 280;
      options.title = "Turn Tracker";
      options.classes = ["fantastic-depths", ...super.defaultOptions.classes];
      return options;
   }

   async _updateObject(event, formData) {
      event.preventDefault();
      const expanded = foundry.utils.expandObject(formData);
      console.debug('updateObject called', event, formData);
      // Apply changes to your TurnData instance
      Object.assign(this.turnData.settings, expanded.turnData?.settings ?? {});
      return this.turnData.saveSettings();
   }

   /** 
    * Fetch data for the form, such as turn count and game time 
    */
   async getData() {
      const context = await super.getData();
      context.turnData = this.turnData;

      // Conditions
      const conditions = [];
      conditions.push({ value: "", text: game.i18n.localize('None') });
      const conditionItems = (await fadeFinder.getConditions()).sort((a, b) => a.name.localeCompare(b.name));
      conditions.push(...conditionItems.map((condition) => {
         return { value: condition.uuid, text: condition.name }
      }));
      context.conditions = conditions.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});
      return context;
   }

   /**
    * Increment the turn count, advance the in-game time, and re-render the form
    * @param {any} seconds 
    * @param {any} advanceWorldTime
    */
   async advanceTime(seconds) {
      await game.time.advance(seconds);
   }

   /** 
    * Attach event listeners to elements in the form 
    */
   async activateListeners(html) {
      super.activateListeners(html);

      if (game.user.isGM == false) return;

      // Initialize tab system
      this.tabsController = new Tabs({
         navSelector: ".tabs",
         contentSelector: ".tab-content",
         initial: "tracker",
      });
      this.tabsController.bind(html[0]);

      const timeSteps = this.turnData.timeSteps;

      html.find("#advance-turn")[0].addEventListener('click', async (e) => {
         e.preventDefault();
         await this.advanceTime(timeSteps.turn);
      });
      html.find("#revert-turn")[0].addEventListener('click', async (e) => {
         e.preventDefault();
         await this.advanceTime(-timeSteps.turn);
      });
      html.find("#reset-session")[0].addEventListener('click', async (e) => {
         e.preventDefault();
         this.turnData.resetSession();
         this.render(true);  // Re-render the form to update the UI
         const speaker = { alias: game.user.name };  // Use the player's name as the speaker         
         ChatMessage.create({
            speaker: speaker,
            content: game.i18n.localize("FADE.notification.timeReset1")
         });
      });
      html.find("#reset-total")[0].addEventListener('click', async (e) => {
         e.preventDefault();
         this.turnData.resetTotal();
         const speaker = { alias: game.user.name };  // Use the player's name as the speaker         
         ChatMessage.create({
            speaker: speaker,
            content: game.i18n.localize("FADE.notification.timeReset2")
         });
         this.render(true);  // Re-render the form to update the UI
      });
      const restElem = html.find("#rest");
      if (restElem?.length > 0) {
         restElem[0].addEventListener('click', async (e) => await this.#onClickRest(e));
      }

      html.find("#save-config")[0].addEventListener('click', async (e) => {
         e.preventDefault();
         this.submit();
      });

      Hooks.on('updateWorldTime', this._updateWorldTime);
   }

   /**
    * Handle the updateWorldTime event.
    */
   _updateWorldTime = foundry.utils.debounce(async (worldTime, dt, options, userId) => {
      let chatContent = "";
      const speaker = { alias: game.user.name };
      const timeSteps = this.turnData.timeSteps;
      const seconds = worldTime - this.turnData.worldTime;

      if (Math.abs(seconds) >= timeSteps.round) {
         const turns = this.turnData.updateTime(seconds, this.isResting);
         this.isResting = false;
         const turnsRounds = this.turnData.toTurnsRounds(Math.abs(turns));
         chatContent = (turns > 0)
            ? game.i18n.format("FADE.notification.advancedTime", { turns: turnsRounds.turns, rounds: turnsRounds.roundsDisplay })
            : game.i18n.format("FADE.notification.reversedTime", { turns: turnsRounds.turns, rounds: turnsRounds.roundsDisplay });

         // Rest message
         chatContent += (await this.#handleNeedRest());

         this.render(true);  // Re-render the form to update the UI

         if (chatContent.length > 0) {
            ChatMessage.create({ speaker: speaker, content: chatContent });
         }
      }
   }, 250);

   close(options) {
      Hooks.off('updateWorldTime', this._updateWorldTime);
      return super.close(options);
   }

   async #onClickRest(e) {
      e.preventDefault();
      this.isResting = true;
      await this.advanceTime(this.turnData.timeSteps.turn);
      this.turnData.rest();
      const speaker = { alias: game.user.name };  // Use the player's name as the speaker

      const trackedActorIds = game.settings.get(game.system.id, 'partyTrackerData');
      for (let trackedActorId of trackedActorIds) {
         const trackedActor = game.actors.get(trackedActorId);
         const needRestCondition = await fromUuid(this.turnData.settings.needRestCondition);
         const condition = trackedActor.items.find(item => item.type === needRestCondition.type && item.name === needRestCondition.name);
         if (condition) {
            condition.delete();
            //const itemData = [condition.toObject()];
            //await trackedActor.deleteEmbeddedDocuments("Item", itemData);
         }
      }

      ChatMessage.create({
         speaker: speaker,
         content: game.i18n.localize("FADE.notification.partyRests")
      });
      this.render(true);  // Re-render the form to update the UI
   }

   async #handleNeedRest() {
      let chatContent = "";
      if (this.turnData.settings.restFrequency > 0 && this.turnData.dungeon.rest === this.turnData.settings.restFrequency - 1) {
         chatContent += game.i18n.localize("FADE.notification.needRestSoon");
      } else if (this.turnData.settings.restFrequency > 0 && this.turnData.dungeon.rest === this.turnData.settings.restFrequency) {
         chatContent += game.i18n.localize("FADE.notification.needRest");
         if (this.turnData.settings.needRestCondition) {
            const condition = await fromUuid(this.turnData.settings.needRestCondition);
            const trackedActorIds = game.settings.get(game.system.id, 'partyTrackerData');
            for (let trackedActorId of trackedActorIds) {
               const trackedActor = game.actors.get(trackedActorId);
               if (!trackedActor.items.find(item => item.type === condition.type && item.name === condition.name)) {
                  const itemData = [condition.toObject()];
                  await trackedActor.createEmbeddedDocuments("Item", itemData);
               }
            }
         }
      }
      return chatContent;
   }
}
