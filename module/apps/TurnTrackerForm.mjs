export class TurnTrackerForm extends FormApplication {
   static timeSteps = {
      round: 10,
      turn: 600,
      hour: 3600,
      day: 86400
   };

   constructor() {
      super();
      this.isGM = game.user.isGM;
      this.settingsChanged = false;
   }

   static get defaultOptions() {
      const options = super.defaultOptions;
      options.id = "turn-tracker-form";
      options.template = `systems/${game.system.id}/templates/apps/turn-tracker.hbs`;  // Dynamic path
      options.width = 400;
      options.height = 170;
      options.title = "Turn Tracker";
      options.classes = ["fantastic-depths", ...super.defaultOptions.classes];
      return options;
   }

   /** 
    * Fetch data for the form, such as turn count and game time 
    */
   async getData() {
      const context = super.getData();
      // Deep clone to avoid direct mutation
      this.turnData = foundry.utils.deepClone(await game.settings.get(game.system.id, 'turnData'));

      // Only keep necessary properties
      this.turnData = {
         dungeon: {
            session: this.turnData?.dungeon?.session || 0,
            total: this.turnData?.dungeon?.total || 0,
            rest: this.turnData?.dungeon?.rest || 0,
            prevTurn: this.turnData?.dungeon?.prevTurn || 0
         }
      };

      context.turnData = this.turnData;
      context.restFrequency = await game.settings.get(game.system.id, "restFrequency");
      return context;
   }


   /** 
    * Increment the turn count, advance the in-game time, and re-render the form 
    */
   async advanceTime(seconds) {
      this.turnData.dungeon.prevTurn = this.turnData.dungeon.total;

      if (Math.abs(seconds) >= TurnTrackerForm.timeSteps.turn) {
         let turns = seconds / Math.floor(TurnTrackerForm.timeSteps.turn);
         this.turnData.dungeon.session += turns;
         this.turnData.dungeon.total += turns;
         this.turnData.dungeon.rest += turns;

         await game.settings.set(game.system.id, 'turnData', this.turnData);

         const speaker = { alias: game.users.get(game.userId).name };  // Use the player's name as the speaker
         let chatContent = turns > 0 ? `<div>Time advances ${turns} turn.</div>` : `<div>Time reverses ${turns} turn.</div>`;


         // Rest message
         const restFrequency = await game.settings.get(game.system.id, "restFrequency");
         if (restFrequency > 0 && this.turnData.dungeon.rest > restFrequency - 1) {
            chatContent += "<div class='warning'>The party is tired and needs to rest.</div><div>Attack and damage rolls should have a -1 penatly until party rests.</div>";
         }

         ChatMessage.create({
            speaker: speaker,
            content: chatContent
         });

         // Emit custom event
         Hooks.call('turnTrackerUpdate', this.turnData);
      }
      game.time.advance(seconds);

      this.render(true);  // Re-render the form to update the UI
   }

   /** 
    * Attach event listeners to elements in the form 
    */
   async activateListeners(html) {
      super.activateListeners(html);

      html.find("#advance-turn")[0].addEventListener('click', async (e) => {
         e.preventDefault();
         await this.advanceTime(TurnTrackerForm.timeSteps.turn);
      });
      html.find("#revert-turn")[0].addEventListener('click', async (e) => {
         e.preventDefault();
         await this.advanceTime(-TurnTrackerForm.timeSteps.turn);
      });
      html.find("#reset-session")[0].addEventListener('click', async (e) => {
         e.preventDefault();
         this.turnData.dungeon.session = 0;
         await game.settings.set(game.system.id, 'turnData', this.turnData);
         this.render(true);  // Re-render the form to update the UI
         const speaker = { alias: game.users.get(game.userId).name };  // Use the player's name as the speaker         
         ChatMessage.create({
            speaker: speaker,
            content: "Resetting session turn count to zero."
         });
      });
      html.find("#reset-total")[0].addEventListener('click', async (e) => {
         e.preventDefault();
         this.turnData.dungeon.session = 0;
         this.turnData.dungeon.total = 0;
         this.turnData.dungeon.rest = 0;
         await game.settings.set(game.system.id, 'turnData', this.turnData);
         const speaker = { alias: game.users.get(game.userId).name };  // Use the player's name as the speaker         
         ChatMessage.create({
            speaker: speaker,
            content: "Resetting global turn count to zero."
         });
         this.render(true);  // Re-render the form to update the UI
      });
      const restElem = html.find("#rest");
      if (restElem?.length > 0) {
         restElem[0].addEventListener('click', async (e) => {
            e.preventDefault();
            this.turnData.dungeon.rest = 0;
            await game.settings.set(game.system.id, 'turnData', this.turnData);
            const speaker = { alias: game.users.get(game.userId).name };  // Use the player's name as the speaker         
            ChatMessage.create({
               speaker: speaker,
               content: "The party rests."
            });
            this.render(true);  // Re-render the form to update the UI
         });
      }
   }
}
