// Function to toggle the Turn Tracker form for the GM
export function toggleTurnTracker() {
   if (!game.user.isGM) {
      ui.notifications.warn("Only the GM can open the Turn Tracker.");
      return;
   }

   // Create or close the Turn Tracker form
   if (!window.turnTracker) {
      window.turnTracker = new TurnTrackerForm();
   }

   if (window.turnTracker.rendered) {
      window.turnTracker.close();
   } else {
      window.turnTracker.render(true);
   }
}

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
      return options;
   }

   /** 
    * Fetch data for the form, such as turn count and game time 
    */
   async getData() {
      const context = super.getData();
      this.turnData = foundry.utils.deepClone(await game.settings.get(game.system.id, 'turnData'));
      context.turnData = this.turnData;
      return context;
   }

   /** 
    * Increment the turn count, advance the in-game time, and re-render the form 
    */
   async advanceTime(seconds) {      
      if (Math.abs(seconds) >= TurnTrackerForm.timeSteps.turn) {
         let turns = seconds / Math.floor(TurnTrackerForm.timeSteps.turn);
         this.turnData.dungeon.session += turns;
         this.turnData.dungeon.total += turns;
         this.turnData.dungeon.rest += turns;
      }
      game.time.advance(seconds);
      await game.settings.set(game.system.id, 'turnData', this.turnData);
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
      });
      html.find("#reset-total")[0].addEventListener('click', async (e) => {
         e.preventDefault();
         this.turnData.dungeon.session = 0;
         this.turnData.dungeon.total = 0;
         this.turnData.dungeon.rest = 0;
         await game.settings.set(game.system.id, 'turnData', this.turnData);
         this.render(true);  // Re-render the form to update the UI
      });
      html.find("#rest")[0].addEventListener('click', async (e) => {
         e.preventDefault();
         this.turnData.dungeon.rest = 0;
         await game.settings.set(game.system.id, 'turnData', this.turnData);
         this.render(true);  // Re-render the form to update the UI
      });
   }
}
