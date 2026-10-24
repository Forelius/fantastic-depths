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
    * Merge class and ancestry ability-score mins: class min wins when set,
    * otherwise ancestry min. Returns an update fragment for actor abilities.
    * @param {any} actor
    * @param {object|null} classAbilities Optional class abilities schema; looked up if omitted.
    * @param {object|null} ancestryAbilities Optional ancestry abilities schema; looked up if omitted.
    * @returns {Promise<object>} Partial abilities update (may be empty).
    */
   async resolveMergedAbilityMins(actor, classAbilities = null, ancestryAbilities = null) {
      let resolvedClass = classAbilities;
      let resolvedAncestry = ancestryAbilities;

      if (resolvedClass == null) {
         const classItem = await fadeFinder.getClass(actor.system.details?.class);
         resolvedClass = classItem?.system?.abilities ?? {};
      }
      if (resolvedAncestry == null) {
         const speciesName = actor.system.details?.species?.toLowerCase?.();
         const ancestryItem = speciesName ? await fadeFinder.getAncestry(speciesName) : null;
         resolvedAncestry = ancestryItem?.system?.abilities ?? {};
      }

      const merged = {};
      for (const key of CONFIG.FADE.Abilities) {
         const effectiveMin = resolvedClass?.[key]?.min ?? resolvedAncestry?.[key]?.min;
         if (typeof effectiveMin === "number") {
            merged[key] = { min: effectiveMin };
         }
      }
      return actor.setupMinAbilityScores(merged);
   }

   /**
    * Updates the actor's ancestry-related data.
    * @param {any} actor The actor to update.
    */
   async updateAncestry(actor) {
      const nameInput = actor.system.details.species?.toLowerCase();
      const ancestryDefItem = await fadeFinder.getAncestry(nameInput);
      const actorItems = actor.items.filter(item => item.type === "species");

      // Manage the ancestry embedded item (carries mod.vsGroup for combat)
      if (actorItems?.length > 0) {
         await Promise.all(actorItems.map(actorItem => actorItem.delete()));
      }

      if (ancestryDefItem) {
         const itemData = [ancestryDefItem.toObject()];
         await actor.createEmbeddedDocuments("Item", itemData);

         // Always-on copies: languages, movement, basic proficiency, merged ability mins
         const systemUpdate: Record<string, unknown> = {};
         const languages = ancestryDefItem.system.languages ?? [];

         const modes = foundry.utils.deepClone(actor.system.movement?.modes ?? []);
         if (modes.length > 0 && ancestryDefItem.system.baseMovement != null) {
            modes[0].base = ancestryDefItem.system.baseMovement;
            systemUpdate.movement = { modes };
         }

         // Always write the flag so switching ancestry can clear a prior grant.
         systemUpdate.combat = { basicProficiency: ancestryDefItem.system.basicProficiency === true };

         const abilityMins = await this.resolveMergedAbilityMins(
            actor,
            null,
            ancestryDefItem.system.abilities
         );
         if (abilityMins && Object.keys(abilityMins).length > 0) {
            systemUpdate.abilities = abilityMins;
         }

         if (Object.keys(systemUpdate).length > 0) {
            await actor.update({ system: systemUpdate });
         }
         await actor.setupLanguages(languages);

         // Optional grants: special abilities and ancestry gear items
         const abilityIds = actor.items
            .filter(item => item.type === "specialAbility" && item.system.category === "class")
            .map(item => item.id);
         const abilitiesData = (await this.getSpecialAbilities(nameInput))
            ?.filter(item => abilityIds.includes(item.id) === false);
         const itemsData = await fadeFinder.getAncestryItems(nameInput, actor.highestLevel);

         if ((abilitiesData?.length > 0) || (itemsData?.length > 0)) {
            const dialogResp = await DialogFactory({
               dialog: "yesno",
               title: game.i18n.format("FADE.dialog.specialAbilities.title", { name: actor.system.details.species }),
               content: game.i18n.format("FADE.dialog.specialAbilities.content", {
                  name: actor.system.details.species,
                  type: game.i18n.localize("FADE.Actor.Ancestry")
               }),
               yesLabel: game.i18n.localize("FADE.dialog.yes"),
               noLabel: game.i18n.localize("FADE.dialog.no"),
               defaultChoice: "yes"
            }, actor);

            if (dialogResp?.resp?.result === true) {
               await actor.setupSpecialAbilities(abilitiesData);
               await actor.setupItems(itemsData, AncestryDefinitionItem.ValidItemTypes);
            }
         }
      }
   }

   /**
    * Ancestry special abilities are granted by the ancestry definition item.
    * @param {any} name The ancestry name.
    */
   async getSpecialAbilities(name) {
      const theItem = await fadeFinder.getAncestry(name);
      let result;
      if (theItem) {
         result = theItem.system.specialAbilities.reduce((acc, a) => ((acc[a.name] = !acc[a.name] ? a : acc[a.name]), acc), {});
         result = result ? Object.values(result) : null;
      }
      return result?.length > 0 ? result : undefined;
   }

   /**
    * Whether the actor is larger than man-size (Medium), using CONFIG.FADE.ActorSizes maxFeet.
    * @param {any} actor
    * @returns {boolean}
    */
   isLargerThanManSize(actor) {
      const sizeId = actor?.system?.details?.size ?? "M";
      const sizes = CONFIG.FADE.ActorSizes ?? [];
      const manSize = sizes.find(s => s.id === "M");
      const actorSize = sizes.find(s => s.id === sizeId);
      const manMax = manSize?.maxFeet ?? 7;
      const actorMax = actorSize?.maxFeet ?? manMax;
      return actorMax > manMax;
   }

   /**
    * Defender AC bonus vs larger-than-man-size attackers (e.g. Halfling +2 AC).
    * Positive acDelta improves descending AC by subtraction (classic D&D "+N AC").
    * @param {any} defender The defending actor
    * @param {any} attacker The attacking actor
    * @returns {{ acDelta: number } | null}
    */
   getAcVsLargeAdjustment(defender, attacker) {
      const acDelta = Number(defender?.system?.mod?.acVsLarge) || 0;
      if (acDelta === 0 || !this.isLargerThanManSize(attacker)) {
         return null;
      }
      return { acDelta };
   }
}
