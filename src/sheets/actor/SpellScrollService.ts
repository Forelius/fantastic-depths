import { fadeDialog } from "../../dialog/fadeDialog.js";
import { fadeFinder } from "../../utils/finder.js";
import { ClassSystemBase } from "../../sys/registry/ClassSystem.js";

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
      const dialogResp = await fadeDialog.getSpellScrollChoiceDialog();

      if (dialogResp?.resp === "spell") {
         // Adds the spell to the actor's spell list.
         const classSystem = game.fade.registry.getSystem("classSystem") as ClassSystemBase;
         if (classSystem.canCastSpells(sheet.actor)) {
            return await sheet._onDropItemDefault(event, item);
         }
      } else if (dialogResp?.resp === "scroll") {
         // Adds a copy of the spell scroll template to the actor's inventory.
         return await this.#createScrollItem(sheet, spellItem);
      }

      return false;
   }

   /**
    * Create a spell scroll on the actor from the spell scroll template.
    * @private
    * @param {any} sheet The actor sheet receiving the scroll.
    * @param {any} spellItem The dropped spell Item document.
    * @returns {Promise<Item[] | boolean>} The created scroll item, or false if the template wasn't found.
    */
   async #createScrollItem(sheet, spellItem) {
      const scrollTemplate = await fadeFinder.getSpellScrollTemplate();
      if (!scrollTemplate) {
         ui.notifications.warn(game.i18n.localize('FADE.notification.noSpellScrollTemplate'));
         return false;
      }

      const spellName = spellItem.name;
      const spellClasses = spellItem.system.classes;
      const scrollData = scrollTemplate.toObject();
      scrollData.name = scrollData.name.replaceAll("<spell-name>", spellName);
      if (scrollData.system?.description) {
         let description = scrollData.system.description.replaceAll("&lt;spell-name&gt;", spellName);
         if (spellClasses?.length > 0) {
            const classNames = spellClasses.map(c => c.name).join(", ");
            description = description.replaceAll("&lt;classes&gt;", classNames);
         } else {
            description = description.replace(/\s*&lt;classes&gt;/g, "");
         }
         scrollData.system.description = description;
      }
      return await sheet._onDropItemCreate(scrollData);
   }
}