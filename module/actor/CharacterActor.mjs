import { FDCombatActor } from './FDCombatActor.mjs';
import { AncestryDefinitionItem } from "../item/AncestryDefinitionItem.mjs";
import { DialogFactory } from '../dialog/DialogFactory.mjs';
import { fadeFinder } from '/systems/fantastic-depths/module/utils/finder.mjs';

export class CharacterActor extends FDCombatActor {
   constructor(data, context) {
      /** Default behavior, just call super() and do all the default Item inits */
      super(data, context);
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
      this.system.wrestling = game.fade.registry.getSystem('wrestling').calculateWrestlingRating(this);
   }

   /**
    * Intercept updateActor method call to log changes.
    * @override
    * @param {any} updateData
    * @param {any} options
    * @param {any} userId
    */
   async onUpdateActor(updateData, options, userId) {
      super.onUpdateActor(updateData, options, userId)
      const isLoggingEnabled = game.settings.get(game.system.id, "logCharacterChanges");
      const user = await game.users.get(userId);
      // Only proceed if logging is enabled and the update is by a player
      if (isLoggingEnabled && game.user.isGM) {
         // Get the old actor data before changes
         const oldActorData = updateData;
         // Log changes between the old and new data
         this.logActorChanges(updateData, oldActorData, user, "property");
      }
      // Class or level updated.
      if (this.id) {
         const classSystem = game.fade.registry.getSystem("classSystem");
         await classSystem.onCharacterActorUpdate(this, updateData);

         if (updateData.system?.details?.species !== undefined
            || updateData.system?.details?.level !== undefined) {
            await this._updateAncestry();
         }
      }
   }

   /**
    * get changes and send to GM
    * @param {any} updateData
    * @param {any} oldData - The old state of the actor before the update
    * @param {any} user
    * @param {any} parentKey
    * @returns
    */
   logActorChanges(updateData, oldData, user, type, parentKey = '', recursionLevel = 1) {
      if (this.testUserPermission(game.user, "OWNER") === false) return;
      let changes = [];
      const ignore = ["_stats", "_id", "flags"];
      if (type === "property") {
         for (let key in updateData) {
            const fullKey = parentKey ? `${parentKey}.${key}` : key;

            if (ignore.includes(fullKey) === false) {
               const oldValue = foundry.utils.getProperty(oldData, fullKey);
               const newValue = foundry.utils.getProperty(updateData, key);
               if (typeof newValue === 'object' && newValue !== null && !Array.isArray(newValue)) {
                  // Recursively log changes for nested objects
                  changes = [...changes, ...this.logActorChanges(newValue, oldData, user, type, fullKey, recursionLevel + 1)];
               } else if (oldValue) {
                  changes.push({ field: fullKey, oldValue: oldValue, newValue: newValue });
               }
            }
         }
      } else {
         changes.push(updateData);
      }
      if (recursionLevel === 1 && changes.length > 0) {
         this._sendChangeMessageToGM(changes, user, type);
      }
      return changes;  // This allows recursion to accumulate changes
   }

   /**
    * Helper function to send a change message to the GM
    * @param {any} changes
    * @param {any} user
    * @param {any} type
    */
   _sendChangeMessageToGM(changes, user, type) {
      let changeDescs = null;
      if (type === "property") {
         changeDescs = changes.map(change => {
            return `${change.field}: <strong>${change.newValue}</strong>`;
         }).join("<br>");
      } else if (type === "addItem") {
         const item = changes[0];
         changeDescs = `Added ${item.type}: ${item.name}`;
      } else if (type === "deleteItem") {
         const item = changes[0];
         changeDescs = `Removed ${item.type}: ${item.name}`;
      }

      if (changeDescs) {
         // Create a chat message only visible to the GM
         ChatMessage.create({
            user: game.user.id,
            content: `<p>Player ${user.name} updated ${this.name}:</p><p>${changeDescs}</p>`,
            whisper: ChatMessage.getWhisperRecipients("GM"), // Whisper to all active GMs
         });
      }
   }

   /**
    * Called by update actor to update ancestry-related data.
    */
   async _updateAncestry() {
      const nameInput = this.system.details.species?.toLowerCase();
      const ancestryDefItem = await fadeFinder.getAncestry(nameInput);
      const actorItems = this.items.filter(item => item.type === 'species');

      // Manage the ancestry embedded item
      if (actorItems?.length > 0) {
         for (let actorItem of actorItems) actorItem.delete();
      }

      if (!ancestryDefItem) {
         //console.warn(`Ancestry definition not found ${nameInput}.`);
         return;
      }

      const itemData = [ancestryDefItem.toObject()];
      await this.createEmbeddedDocuments("Item", itemData);

      // Ancestry special abilities
      const abilityIds = this.items.filter(item => item.type === 'specialAbility' && item.system.category === 'class').map(item => item.id);
      const abilitiesData = (await AncestryDefinitionItem.getSpecialAbilities(nameInput))?.filter(item => abilityIds.includes(item.id) === false);
      const itemsData = await fadeFinder.getAncestryItems(nameInput, this.highestLevel);

      if (abilitiesData || itemsData) {
         const dialogResp = await DialogFactory({
            dialog: "yesno",
            title: game.i18n.format('FADE.dialog.specialAbilities.title', { name: this.system.details.species }),
            content: game.i18n.format('FADE.dialog.specialAbilities.content', {
               name: this.system.details.species,
               type: game.i18n.localize('FADE.Actor.Ancestry')
            }),
            yesLabel: game.i18n.localize('FADE.dialog.yes'),
            noLabel: game.i18n.localize('FADE.dialog.no'),
            defaultChoice: "yes"
         }, this.actor);

         if (dialogResp?.resp?.result === true) {
            await this.setupSpecialAbilities(abilitiesData);
            await this.setupItems(itemsData, AncestryDefinitionItem.ValidItemTypes);
         }
      }
   }
}
