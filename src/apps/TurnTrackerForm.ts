const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
import { fadeFinder } from '../utils/finder.js';

type DungeonStats = {
   session: number;
   total: number;
   rest: number;
};

class TurnData {
   dungeon: DungeonStats;
   timeSteps: {
      round: any; turn: any; hour: number; // 60 minutes
      day: number;
   };
   settings: { needRestCondition: string; restFrequency: number; };
   worldTime: any;
   constructor(data: any | null) {
      this.dungeon = { session: 0, total: 0, rest: 0 };

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

   updateTime(seconds, skipRest = false) {
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

export class TurnTrackerForm extends HandlebarsApplicationMixin(ApplicationV2) {
   constructor(object = {}, options = {}) {
      super(object, options);
      this.turnData = new TurnData(null);
      this.isResting = false;
      // Only keep necessary properties
      Object.assign(this.turnData, game.settings.get(game.system.id, 'turnData'));
   }

   get title() {
      return game.i18n.localize("FADE.apps.turnTracker.title");
   }

   static DEFAULT_OPTIONS = {
      id: "turn-tracker-form",
      tag: 'form',
      window: {
         resizable: true,
         minimizable: false,
         contentClasses: ["scroll-body"]
      },
      position: {
         width: 400,
         height: "auto",
      },
      form: {
         handler: TurnTrackerForm.#onSubmit,
         submitOnChange: true,
         closeOnSubmit: false
      },
      actions: {
         advance: TurnTrackerForm.#clickAdvanceTurn,
         revert: TurnTrackerForm.#clickRevertTurn,
         rest: TurnTrackerForm.#clickRest,
         resetSession: TurnTrackerForm.#clickResetSession,
         resetTotal: TurnTrackerForm.#clickResetTotal,
      },
      classes: ['fantastic-depths']
   }

   static PARTS = {
      main: {
         template: `systems/fantastic-depths/templates/apps/turn-tracker.hbs`,
      }
   }

   /**
    * Fetch data for the form, such as turn count and game time 
    */
   async _prepareContext(_options) {
      const context = {
         turnData: foundry.utils.deepClone(this.turnData),
         conditions: {}
      };
      // Conditions
      const conditions = [];
      conditions.push({ value: "", text: game.i18n.localize("FADE.none") });
      const conditionItems = (await fadeFinder.getConditions()).sort((a, b) => a.name.localeCompare(b.name));
      conditions.push(...conditionItems.map((condition) => {
         return { value: condition.uuid, text: condition.name }
      }));
      context.conditions = conditions.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});
      return context;
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
    * Increment the turn count, advance the in-game time, and re-render the form
    * @param {any} seconds 
    */
   async advanceTime(seconds) {
      await game.time.advance(seconds);
   }

   /**
   * Actions performed after any render of the Application.
   * Post-render steps are not awaited by the render process.
   * @param {any} context      Prepared context data
   * @param {any} options                 Provided render options
   * @protected
   */
   _onRender(context, options) {
      if (game.user.isGM == false) return;

      // Initialize tab system
      this.tabsController = new Tabs({
         navSelector: ".tabs",
         contentSelector: ".tab-content",
         initial: "tracker",
      });
      this.tabsController.bind(this.element);

      Hooks.off('updateWorldTime', this._updateWorldTime);
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

         this.render();  // Re-render the form to update the UI

         if (chatContent.length > 0) {
            ChatMessage.create({ speaker: speaker, content: chatContent });
         }
      }
   }, 250);

   close(options) {
      Hooks.off('updateWorldTime', this._updateWorldTime);
      return super.close(options);
   }

   /**
     * Process form submission for the sheet
     * @this {ApplicationV2}                 The handler is called with the application as its bound scope
     * @param {SubmitEvent} event            The originating form submission event
     * @param {HTMLFormElement} form         The form element that was submitted
     * @param {any} formData    Processed data for the submitted form
     * @returns {Promise<void>}
     */
   static async #onSubmit(event, form, formData) {
      event.preventDefault();
      const data = foundry.utils.expandObject(formData.object);
      // Update system with data from form.
      foundry.utils.mergeObject(this.turnData, data.turnData);
      this.turnData.saveSettings();
      await this.render(true);
   }

   static async #clickAdvanceTurn(event) {
      event.preventDefault();
      const timeSteps = this.turnData.timeSteps;
      await this.advanceTime(timeSteps.turn);
   }

   static async #clickRevertTurn(event) {
      event.preventDefault();
      const timeSteps = this.turnData.timeSteps;
      await this.advanceTime(-timeSteps.turn);
   }

   static async #clickResetSession(event) {
      event.preventDefault();
      this.turnData.resetSession();
      this.render(true);  // Re-render the form to update the UI
      const speaker = { alias: game.user.name };  // Use the player's name as the speaker         
      ChatMessage.create({
         speaker: speaker,
         content: game.i18n.localize("FADE.notification.timeReset1")
      });
   }

   static async #clickResetTotal(event) {
      event.preventDefault();
      this.turnData.resetTotal();
      const speaker = { alias: game.user.name };  // Use the player's name as the speaker         
      ChatMessage.create({
         speaker: speaker,
         content: game.i18n.localize("FADE.notification.timeReset2")
      });
      this.render(true);  // Re-render the form to update the UI
   }

   static async #clickRest(event) {
      event.preventDefault();
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

