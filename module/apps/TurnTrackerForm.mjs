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
      options.height = 200;
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
   async advanceTurn() {
      //let turnCount = game.settings.get(game.system.id, "turnCount") || 0;
      this.turnData.dungeon.session += 1;
      this.turnData.dungeon.total += 1;
      game.time.advance(600);  // Advance 10 minutes
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
         await this.advanceTurn();
      });
   }
}
