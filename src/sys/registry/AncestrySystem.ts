import { DialogFactory } from "../../dialog/DialogFactory.js";
import { AncestryDefinitionItem } from "../../item/AncestryDefinitionItem.js";
import { fadeFinder } from "../../utils/finder.js";

export class AncestrySystem {
   /**
    * Call when an actor is updated and let this method decide if the update
    * requires any ancestry-related info to be updated.
    * @param {any} actor The updated actor.
    * @param {any} updateData The update data from the update event.
    */
   async onCharacterActorUpdate(actor, updateData) {
      if (updateData.system?.details?.species !== undefined
         || updateData.system?.details?.level !== undefined) {
         await this.updateAncestry(actor);
      }
   }

   /**
    * Updates the actor's ancestry-related data.
    * @param {any} actor The actor to update.
    */
   async updateAncestry(actor) {
      const nameInput = actor.system.details.species?.toLowerCase();
      const ancestryDefItem = await fadeFinder.getAncestry(nameInput);
      const actorItems = actor.items.filter(item => item.type === 'species');

      // Manage the ancestry embedded item
      if (actorItems?.length > 0) {
         for (const actorItem of actorItems) actorItem.delete();
      }

      if (ancestryDefItem) {
         const itemData = [ancestryDefItem.toObject()];
         await actor.createEmbeddedDocuments("Item", itemData);

         // Ancestry special abilities
         const abilityIds = actor.items.filter(item => item.type === 'specialAbility' && item.system.category === 'class').map(item => item.id);
         const abilitiesData = (await AncestrySystem.getSpecialAbilities(nameInput))?.filter(item => abilityIds.includes(item.id) === false);
         const itemsData = await fadeFinder.getAncestryItems(nameInput, actor.highestLevel);
         const languages = ancestryDefItem.system.languages;
         let _hasMinAbilityScore = false;
         for (const [key] of Object.entries(ancestryDefItem.system.abilities)) {
            if (ancestryDefItem.system.abilities[key].min > 3) _hasMinAbilityScore = true;
         }

         if (abilitiesData || itemsData || languages) {
            const dialogResp = await DialogFactory({
               dialog: "yesno",
               title: game.i18n.format('FADE.dialog.specialAbilities.title', { name: actor.system.details.species }),
               content: game.i18n.format('FADE.dialog.specialAbilities.content', {
                  name: actor.system.details.species,
                  type: game.i18n.localize('FADE.Actor.Ancestry')
               }),
               yesLabel: game.i18n.localize('FADE.dialog.yes'),
               noLabel: game.i18n.localize('FADE.dialog.no'),
               defaultChoice: "yes"
            }, actor);

            if (dialogResp?.resp?.result === true) {
               await actor.setupSpecialAbilities(abilitiesData);
               await actor.setupItems(itemsData, AncestryDefinitionItem.ValidItemTypes);
               await actor.setupLanguages(languages);
            }

            // TODO: This isn't doing anything right now. Uncomment and fix.
            /*
            if (_hasMinAbilityScore) {
               const abiltyUpdates = actor.setupMinAbilityScores(ancestryDefItem.system.abilities);
            }*/
         }
      }
   }

   /**
    * Ancestry special abilities are granted by the ancestry definition item.
    * @param {any} name The ancestry name.
    */
   static async getSpecialAbilities(name) {
      const theItem = await fadeFinder.getAncestry(name);
      let result;
      if (theItem) {
         result = theItem.system.specialAbilities.reduce((acc, a) => ((acc[a.name] = !acc[a.name] ? a : acc[a.name]), acc), {});
         result = result ? Object.values(result) : null;
      }
      return result?.length > 0 ? result : undefined;
   }
}
