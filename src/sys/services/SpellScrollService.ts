import { fadeDialog } from "../../dialog/fadeDialog.js";
import { fadeFinder } from "../../utils/finder.js";
import { ClassSystemBase } from "../registry/ClassSystem.js";

/**
 * A class for handling a spell dropped onto an actor sheet.
 * The player chooses whether to add the spell as a spell or as a spell scroll.
 */
export class SpellScrollService {
   /**
    * Handle a spell dropped onto an actor sheet.
    * @param {any} sheet The actor sheet receiving the drop.
    * @param {DragEvent} event The initiating drop event.
    * @param {any} item The raw drop data of the dropped spell item.
    * @param {any} spellItem The resolved dropped spell Item document.
    * @returns {Promise<Item[] | boolean>} The result of the chosen action.
    */
   async onDropSpell(sheet, event, item, spellItem) {
      // If there is no scroll template, just add the spell as a spell.
      const scrollTemplate = await fadeFinder.getSpellScrollTemplate();
      if (!scrollTemplate) {
         return await this.#addSpell(sheet, event, item);
      }

      const dialogResp = await fadeDialog.getSpellScrollChoiceDialog();

      if (dialogResp?.resp === "spell") {
         return await this.#addSpell(sheet, event, item);
      } else if (dialogResp?.resp === "scroll") {
         return await this.#createScrollItem(sheet, spellItem, scrollTemplate);
      }

      return false;
   }

   /**
    * Add a spell to the actor's spell list.
    * @private
    * @param {any} sheet The actor sheet receiving the drop.
    * @param {DragEvent} event The initiating drop event.
    * @param {any} item The raw drop data of the dropped spell item.
    * @returns {Promise<Item[] | boolean>} The result of the default item drop.
    */
   async #addSpell(sheet, event, item) {
      const classSystem = game.fade.registry.getSystem("classSystem") as ClassSystemBase;
      if (classSystem.canCastSpells(sheet.actor)) {
         return await sheet._onDropItemDefault(event, item);
      }
      return false;
   }

   /**
    * Create a spell scroll on the actor from the spell scroll template.
    * @private
    * @param {any} sheet The actor sheet receiving the scroll.
    * @param {any} spellItem The dropped spell Item document.
    * @param {any} scrollTemplate The spell scroll template item.
    * @returns {Promise<Item[]>} The created scroll item.
    */
   async #createScrollItem(sheet, spellItem, scrollTemplate) {
      const spellName = spellItem.name;
      const spellClasses = spellItem.system.classes;
      const scrollData = scrollTemplate.toObject();
      scrollData.name = scrollData.name.replaceAll("<spell-name>", spellName);
      if (scrollData.system?.description) {
         let description = scrollData.system.description.replaceAll("&lt;spell-name&gt;", spellName);
         description = description.replaceAll("&lt;spell-desc&gt;", spellItem.system.description ?? "");
         if (spellClasses?.length > 0) {
            const classNames = spellClasses.map(c => c.name).join(", ");
            description = description.replaceAll("&lt;classes&gt;", classNames);
         } else {
            description = description.replace(/\s*&lt;classes&gt;/g, "");
         }
         scrollData.system.description = description;
      }
      scrollData.system.spells = [{
         action: "cast",
         castAs: await this.#getCastAs(spellItem),
         uuid: spellItem.uuid,
         name: spellName,
      }];
      return await sheet._onDropItemCreate(scrollData);
   }

   /**
    * Determine the castAs key for a spell.
    * If the spell specifies a single class, that class is used. If it specifies
    * multiple classes, the class is chosen favoring class keys "M", then "C",
    * falling back to the first class listed.
    * @private
    * @param {any} spellItem The spell Item document.
    * @returns {Promise<string>} The castAs key (e.g. "M2"), or "" if no class could be used.
    */
   async #getCastAs(spellItem) {
      const spellClasses = spellItem.system.classes ?? [];
      if (spellClasses.length === 0) return "";

      const classDocs = (await Promise.all(spellClasses.map(c => fromUuid(c.uuid))))
         .filter(doc => doc?.type === "class");
      if (classDocs.length === 0) return "";

      const classKey = classDocs.length === 1
         ? classDocs[0].system.key
         : ((classDocs.find(doc => doc.system.key === "M")
            ?? classDocs.find(doc => doc.system.key === "C")
            ?? classDocs[0]).system.key);

      if (!classKey) return "";
      return `${classKey}${spellItem.system.spellLevel ?? ""}`;
   }
}