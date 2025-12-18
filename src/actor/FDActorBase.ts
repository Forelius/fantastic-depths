import { DialogFactory } from "../dialog/DialogFactory.js";

/**
 * Extends the basic actor class with modifications for all system actors.
 * @extends {Actor}
 */
export class FDActorBase extends Actor {
   constructor(data, context) {
      /** Default behavior, just call super() and do all the default Item inits */
      super(data, context);
      if (!this.toggleStatusEffect) {
         // If v11 add toggleStatusEffect method.
         this.toggleStatusEffect = async (status, options) => {
            const token = this.getActiveTokens()[0];
            await token?.toggleEffect(CONFIG.statusEffects.find(e => e.id === status), options);
         };
      }
   }

   get currentActiveToken() {
      let result = null;
      const activeTokens = this.getActiveTokens();
      // Get the first active token.
      if (!activeTokens || activeTokens.length == 0) {
         console.warn("No active tokens found for this actor.");
      } else {
         result = activeTokens[0].document;
      }
      return result;
   }

   get highestLevel() {
      return game.fade.registry.getSystem("classSystem")?.getHighestLevel(this);
   }

   /** override */
   prepareBaseData() {
      super.prepareBaseData();
      if (this.id) {
         this._prepareEffects();
      }
   }

   /** override */
   prepareDerivedData() {
      super.prepareDerivedData();
      if (this.id) {
         game.fade.registry.getSystem("encumbranceSystem").prepareDerivedData(this);
         game.fade.registry.getSystem("actorMovement").prepareMovementRates(this);
         game.fade.registry.getSystem("armorSystem").prepareDerivedData(this);
      }
   }

   /**
    * Handler for the updateActor hook.
    * @param {any} updateData
    * @param {any} options
    * @param {String} userId
    */
   async onUpdateActor(updateData, options, userId) {
      // Hit points updated.
      if (updateData.system?.hp?.value !== undefined && updateData.system?.hp?.value <= 0 && updateData.system?.combat?.isDead === undefined) {
         await this.update({ "system.combat.isDead": true });
         this.toggleStatusEffect("dead", { active: true });
      } else if (updateData.system?.hp?.value !== undefined && updateData.system?.hp?.value > 0 && updateData.system?.combat?.isDead === undefined) {
         await this.update({ "system.combat.isDead": false });
         this.toggleStatusEffect("dead", { active: false });
      }
   }

   async onUpdateActorItem(item, updateData, options, userId) {
      const user = game.users.get(userId);
      // Check if the logging feature is enabled and the user is not a GM
      const isLoggingEnabled = game.settings.get(game.system.id, "logCharacterChanges");
      if (isLoggingEnabled && game.user.isGM && (this.type === "character")) {
         // Log the item update and notify the GM
         console.log(`Item updated: ${this.name} ${item.name} by ${user.name}`, updateData?.system);
      }
   }

   async onCreateActorItem(item, options, userId) {
      const user = game.users.get(userId);
      if (item.type === "mastery") {
         await item.updatePropertiesFromMastery();
      }
      // Check if the logging feature is enabled and the user is not a GM
      const isLoggingEnabled = game.settings.get(game.system.id, "logCharacterChanges");
      if (isLoggingEnabled && game.user.isGM && (this.type === "character")) {
         this.logActorChanges(item, null, user, "addItem");
      }
   }

   onDeleteActorItem(item, options, userId) {
      const user = game.users.get(userId);
      // Check if the logging feature is enabled and the user is not a GM
      const isLoggingEnabled = game.settings.get(game.system.id, "logCharacterChanges");
      if (isLoggingEnabled && game.user.isGM && (this.type === "character")) {
         // Log the item removal and notify the GM
         console.log(`Item removed: ${item.name} by ${game.users.get(userId).name}`);
         this.logActorChanges(item, null, user, "deleteItem");
      }
   }

   /**
   * Handler for updateWorldTime event.
   */
   onUpdateWorldTime(worldTime, dt, options, userId) {
      // Only the GM should handle updating effects
      // Ensure there's an active scene and tokens on the canvas
      if (!game.user.isGM || !canvas?.scene) return;

      // Active effects
      // Ensure the actor has active effects to update
      for (let effect of this.allApplicableEffects()) {
         if (effect.isTemporary && effect.duration?.type !== "none") {
            effect.updateDuration();
            // Adjust the duration based on the time passed
            if (effect.duration.remaining <= 0) {
               if (effect.parent && effect.parent.type === "condition") {
                  // Condition expired
                  effect.parent.delete();
               } else {
                  // Effect expired
                  effect.delete();
               }

               // Notify chat.
               const speaker = { alias: game.users.get(game.userId).name };  // Use the player's name as the speaker
               let chatContent = game.i18n.format("FADE.Chat.effectEnds", { effectName: effect.name, actorName: this.name });
               ChatMessage.create({ speaker: speaker, content: chatContent });
            }
         }
      }

      // Only re-render the sheet if it's already rendered
      if (this.sheet && this.sheet.rendered) {
         this.sheet.render(true);  // Force a re-render of the actor sheet
      }
   }

   /**
    * @returns Roll data object contain actor system data and classes data.
    */
   getRollData() {
      const classSystem = game.fade.registry.getSystem("classSystem");
      const classes = classSystem.getRollData(this);
      return { ...this.system, classes };
   }

   /**
      * Handle how changes to a Token attribute bar are applied to the Actor.
      * This allows for game systems to override this behavior and deploy special logic.
      * override
      * @param {string} attribute    The attribute path
      * @param {number} value        The target attribute value
      * @param {boolean} isDelta     Whether the number represents a relative change (true) or an absolute change (false)
      * @param {boolean} isBar       Whether the new value is part of an attribute bar, or just a direct value
      * @returns {Promise<typeof Actor>}  The updated Actor document
      */
   async modifyTokenAttribute(attribute, value, isDelta = false, isBar = true) {
      if (this.isOwner === false) return this;
      let result = this;
      // If delta damage...
      if (isDelta === true && attribute === "hp") {
         // Try debouncing to prevent ENTER key from propogating
         setTimeout(() => this.#handleHPChange(value), 100);
      } else {
         result = super.modifyTokenAttribute(attribute, value, isDelta, isBar);
      }
      return result;
   }

   /**
    * A helper method for setting the actor's current active light and active fuel.
    * @public
    * @param {any} lightItemId An owned light item's id.
    */
   async setActiveLight(lightItemId) {
      if (this.currentActiveToken) {
         if (lightItemId === null || lightItemId === "" || lightItemId === undefined) {
            await this.currentActiveToken.update({ light: { dim: 0, bright: 0 } }); // Extinguish light
         }
         await this.update({ "system.activeLight": lightItemId });
      }
   }

   /**
    * Evaluates a roll formula synchronously into a numerical value.
    * @param {any} formula The roll formula
    * @param {any} options The Roll.evaluate options. Default minimize=true will generate lowest possible value.
    * @returns If the formula and options are valid, an evaluated roll object.
    */
   getEvaluatedRollSync(formula, options = { minimize: true }) {
      let result = null;
      if (formula !== null && formula !== "") {
         const rollData = this.getRollData();
         try {
            const roll = new Roll(formula, rollData);
            roll.evaluateSync(options);
            result = roll;
         }
         catch (error) {
            if (game.user.isGM === true) {
               console.error(`Invalid roll formula for ${this.name}. Formula="${formula}". Owner=${this.parent?.name}`, error);
            }
         }
      }
      return result;
   }

   /** 
    * Performs base classe prep of actor's active effects.
    * Disables effects from items that are equippable and not equipped. 
    * @protected 
    */
   _prepareEffects() {
      //if (this.testUserPermission(game.user, "OWNER") === false) return;
      // Iterate over all applicable effects
      for (const effect of this.allApplicableEffects()) {
         //this.effects.forEach((effect) => {
         const parentItem = effect.parent;
         // If the effect has a parent and the parent is an equippable item...
         const equippableFx = ["item", "armor", "weapon", "light"];
         if (parentItem && equippableFx.includes(parentItem.type) && parentItem.system.equippable === true) {
            // Set disabled state of effect based on item equipped state
            effect.disabled = !parentItem.system.equipped;
         }
      }
   }

   /**
    * Determines if a roll on a non-item (ability score check) should show a success/fail result message.
    * @protected
    * @param {any} event
    * @returns True if the results should be shown, otherwise false.
    */
   _getShowResult(event) {
      let result = true;
      const shiftKey = event?.originalEvent?.shiftKey ?? false;
      if (game.user.isGM === true) {
         result = shiftKey === false && result === true;
      }
      return result;
   }

   async #handleHPChange(value) {
      let damageType = null;
      let attackType = null;
      let weapon = null;
      if (value < 0) {
         let dataset = { dialog: "damageType" };
         let dialogResp = await DialogFactory(dataset, this);
         damageType = dialogResp.damageType;
      } else {
         damageType = "heal";
      }
      const dmgSys = game.fade.registry.getSystem("damageSystem");
      dmgSys.ApplyDamage(this, value, damageType, attackType, weapon);
   }
}

