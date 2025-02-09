class TurnData {
   constructor(data) {
      Object.assign(this, data);
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
         rounds: ((Math.abs(turns % 1) * TurnData.timeSteps.turn) / TurnData.timeSteps.round),
         roundsDisplay: ((Math.abs(turns % 1) * TurnData.timeSteps.turn) / TurnData.timeSteps.round).toFixed(1)
      };
   }

   async resetSession() {
      this.dungeon.session = 0;
      await game.settings.set(game.system.id, 'turnData', this);
   }

   async resetTotal() {
      this.dungeon.session = 0;
      this.dungeon.total = 0;
      this.dungeon.rest = 0;
      this.worldTime = game.time.worldTime
      await game.settings.set(game.system.id, 'turnData', this);
   }

   async rest() {
      this.dungeon.rest = 0;
      await game.settings.set(game.system.id, 'turnData', this);
   }

   async updateTime(seconds) {
      const turns = seconds / TurnData.timeSteps.turn;
      this.dungeon.session += turns;
      this.dungeon.total += turns;
      this.dungeon.rest += turns;
      this.worldTime = game.time.worldTime;
      await game.settings.set(game.system.id, 'turnData', this);
      return turns;
   }

   static timeSteps = {
      round: 10, // 10 seconds
      turn: 10 * 60, // 10 minutes
      hour: 10 * 60 * 6, // 60 minutes
      day: 86400
   };
}
export class TurnTrackerForm extends FormApplication {
   constructor(object = {}, options = {}) {
      super(object, options);
      this.isGM = game.user.isGM;
      this.settingsChanged = false;
      const turnData = game.settings.get(game.system.id, 'turnData');
      // Only keep necessary properties
      this.turnData = new TurnData({
         dungeon: {
            session: turnData?.dungeon?.session || 0,
            total: turnData?.dungeon?.total || 0,
            rest: turnData?.dungeon?.rest || 0,
         },
         worldTime: turnData?.worldTime || game.time.worldTime
      });
   }

   static get defaultOptions() {
      const options = super.defaultOptions;
      options.id = "turn-tracker-form";
      options.template = `systems/${game.system.id}/templates/apps/turn-tracker.hbs`;  // Dynamic path
      options.width = 400;
      options.height = 200;
      options.title = "Turn Tracker";
      options.classes = ["fantastic-depths", ...super.defaultOptions.classes];
      return options;
   }

   /** 
    * Fetch data for the form, such as turn count and game time 
    */
   async getData() {
      const context = await super.getData();
      context.turnData = this.turnData;
      context.restFrequency = game.settings.get(game.system.id, "restFrequency");
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

      html.find("#advance-turn")[0].addEventListener('click', async (e) => {
         e.preventDefault();
         await this.advanceTime(TurnData.timeSteps.turn);
      });
      html.find("#revert-turn")[0].addEventListener('click', async (e) => {
         e.preventDefault();
         await this.advanceTime(-TurnData.timeSteps.turn);
      });
      html.find("#reset-session")[0].addEventListener('click', async (e) => {
         e.preventDefault();
         await this.turnData.resetSession();
         this.render(true);  // Re-render the form to update the UI
         const speaker = { alias: game.user.name };  // Use the player's name as the speaker         
         ChatMessage.create({
            speaker: speaker,
            content: game.i18n.localize("FADE.notification.timeReset1")
         });
      });
      html.find("#reset-total")[0].addEventListener('click', async (e) => {
         e.preventDefault();
         await this.turnData.resetTotal();
         const speaker = { alias: game.user.name };  // Use the player's name as the speaker         
         ChatMessage.create({
            speaker: speaker,
            content: game.i18n.localize("FADE.notification.timeReset2")
         });
         this.render(true);  // Re-render the form to update the UI
      });
      const restElem = html.find("#rest");
      if (restElem?.length > 0) {
         restElem[0].addEventListener('click', async (e) => {
            e.preventDefault();
            await this.advanceTime(TurnData.timeSteps.turn);
            await this.turnData.rest();
            const speaker = { alias: game.user.name };  // Use the player's name as the speaker         
            ChatMessage.create({
               speaker: speaker,
               content: game.i18n.localize("FADE.notification.partyRests")
            });
            this.render(true);  // Re-render the form to update the UI
         });
      }

      Hooks.on('updateWorldTime', this._updateWorldTime);
   }

   /**
    * Handle the updateWorldTime event.
    */
   _updateWorldTime = foundry.utils.debounce(async (worldTime, dt, options, userId) => {
      const seconds = worldTime - this.turnData.worldTime;
      if (Math.abs(seconds) >= TurnData.timeSteps.round) {
         const turns = await this.turnData.updateTime(seconds);
         const speaker = { alias: game.user.name };
         let chatContent = "";
         const turnsRounds = this.turnData.toTurnsRounds(Math.abs(turns));
         //const displayRounds = ((Math.abs(turns % 1) * TurnData.timeSteps.turn) / TurnData.timeSteps.round).toFixed(1);
         chatContent = (turns > 0)
            ? game.i18n.format("FADE.notification.advancedTime", { turns: turnsRounds.turns, rounds: turnsRounds.roundsDisplay })
            : game.i18n.format("FADE.notification.reversedTime", { turns: turnsRounds.turns, rounds: turnsRounds.roundsDisplay});
         // Rest message
         const restFrequency = game.settings.get(game.system.id, "restFrequency");
         if (restFrequency > 0 && this.turnData.dungeon.rest > restFrequency - 1) {
            chatContent += game.i18n.localize("FADE.notification.needRest");
         }
         if (chatContent.length > 0) {
            ChatMessage.create({ speaker: speaker, content: chatContent });
         }
         this.render(true);  // Re-render the form to update the UI
      }
   }, 250);

   close(options) {
      Hooks.off('updateWorldTime', this._updateWorldTime);
      return super.close(options);
   }
}
