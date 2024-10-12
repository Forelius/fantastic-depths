import { DialogFactory } from '../dialog/DialogFactory.mjs';

export class ContentImporter {

   // Method to show the content importer dialog
   static async showImportDialog() {
      const dataset = { dialog: 'contentImport' };
      const caller = game.user;

      // Render the dialog with the necessary data
      const dialogResponse = await DialogFactory(dataset, caller);

      // Early return if dialog was cancelled
      if (!dialogResponse || !dialogResponse.resp) {
         // Do nothing
      } else {
         const { type, importText, spellLevel, attribute } = dialogResponse.resp;
         if (!type || !importText) {
            ui.notifications.warn("No content type or data provided.");
            return;
         }

         // Process the import based on type (simplified for clarity)
         try {
            if (type === 'spell') {
               await this.importSpells(importText, spellLevel);
            } else if (type === 'skill') {
               await this.importSkill(importText, attribute);
            } else {
               await this[`import${type.charAt(0).toUpperCase() + type.slice(1)}`](importText);
            }
            ui.notifications.info(`Successfully imported ${type} content.`);
         } catch (error) {
            ui.notifications.error(`Failed to import ${type} content.`);
            console.error(`Error importing ${type}:`, error);
         }
      }
   }


   // Example methods for importing specific content types
   static async importCharacter(importText) {
      // Implement character import logic
      console.log("Importing Character:", importText);
   }

   static async importMonster(importText) {
      // Implement monster import logic
      console.log("Importing Monster:", importText);
   }

   static async importNPC(importText) {
      // Implement NPC import logic
      console.log("Importing NPC:", importText);
   }

   static async importSpells(importText, spellLevel) {
      // Define folder name for the imported spells
      const folderName = "Imported Spells";
      let folder = game.folders.find(f => f.name === folderName && f.type === "Item");

      // If the folder doesn't exist, create it
      if (!folder) {
         folder = await Folder.create({ name: folderName, type: "Item", parent: null });
      }

      // 1. Parse the raw spell data
      const parsedSpells = ContentImporter.parseSpells(importText, spellLevel);

      // 2. Format the parsed spells
      const formattedSpells = ContentImporter.formatSpells(parsedSpells);

      // 3. Create spell items in Foundry VTT using the formatted spells
      await ContentImporter.createSpellItems(formattedSpells, folder.id);

      // Log the results
      console.log(`Imported ${parsedSpells.length} spells at level ${spellLevel}.`);
   }

   static parseSpells(importText, spellLevel) {
      const lines = importText.split('\n').map(line => line.trim());
      const spells = [];
      let currentSpell = null;
      let nextIsName = true;

      for (let i = 0; i < lines.length; i++) {
         const line = lines[i];
         const nextLine = lines.length > i ? lines[i + 1] : null;
         let isDouble = line === '' && nextLine === '';

         if (nextIsName === true) {
            if (currentSpell) {
               spells.push(currentSpell);
            }

            currentSpell = {
               name: lines[i], // Spell name is the line before "Range:"
               range: '',
               duration: '',
               effect: '',
               description: '',
               level: spellLevel,
               type: 'spell',
               img: 'systems/fantastic-depths/assets/img/item/spell.png',
               system: {} // System-specific data will be populated later
            };
            nextIsName = false;
         } else if (currentSpell && line.startsWith('Range:')) {
            currentSpell.range = line.replace('Range:', '').trim();
         } else if (currentSpell && line.startsWith('Duration:')) {
            currentSpell.duration = line.replace('Duration:', '').trim();
         } else if (currentSpell && line.startsWith('Effect:')) {
            currentSpell.effect = line.replace('Effect:', '').trim();
            i += 1;
            currentSpell.description = "<p>";
         } else if (currentSpell && !isDouble && line === '') {
            currentSpell.description += '</p>';
         } else if (currentSpell && !isDouble) {
            let nextLine = this.removeLineEndingHyphens(line);
            console.log(nextLine);
            currentSpell.description += nextLine;
         } else if (isDouble) {
            currentSpell.description += '</p>';
            i += 1;
            nextIsName = true;
         }
      }

      if (currentSpell) {
         spells.push(currentSpell);
      }

      return spells;
   }

   static formatSpells(spells) {
      return spells.map(spell => {
         // Convert custom dice rolls syntax `[[/r 1d4]]` to Foundry's format `[[1d4]]`
         spell.description = spell.description.replace(/\[\[\/r\s*([\d]+d[\d]+)\]\]/g, "[[/r $1]]");

         // Convert *italic* to Foundry's markdown format _italic_
         spell.description = spell.description.replace(/\*(.*?)\*/g, "_$1_");

         // Ensure paragraphs are properly separated
         spell.description = spell.description.trim().replace(/\n{2,}/g, "</p><p>");

         // Populate the system field with formatted spell data
         spell.system = {
            spellLevel: spell.level,
            range: spell.range,
            duration: spell.duration,
            effect: spell.effect,
            description: spell.description
         };

         return spell;
      });
   }

   // Method to create spell items in Foundry VTT
   static async createSpellItems(spells, folderId) {
      for (let spell of spells) {
         const itemData = {
            name: spell.name,
            type: spell.type,
            img: spell.img,
            folder: folderId, // Use the provided folder ID for the spell
            system: spell.system // Set the system-specific data
         };

         let createdItem = await Item.create(itemData);
         if (!createdItem) {
            console.error(`Failed to create spell: ${spell.name}`);
         }
      }
   }

   static removeLineEndingHyphens(text) {
      // Replace hyphens at the end of a line followed by a newline and merge the word fragments
      return text.replace(/-\s*[\r\n]+/g, "");
   }

   static async importSkill(importText, skillAttribute) {
      // Parse and clean the imported text
      const cleanedDescription = this.parseSkillText(importText);

      // Extract the skill name and description from the cleaned text
      const { skillName, description } = this.extractSkillDetails(cleanedDescription);

      // Create the skill item using the extracted details
      await this.createSkillItem(skillName, skillAttribute, description);

      console.log(`Skill "${skillName}" created successfully.`);
   }

   /**
    * Function to parse and clean the raw skill text.
    * - Removes line breaks within paragraphs that result from column formatting.
    * - Retains proper hyphenation for words.
    * @param {string} text - The raw skill text.
    * @returns {string} - The cleaned skill description.
    */
   static parseSkillText(text) {
      // Remove column-related line breaks and join split words
      return text
         .replace(/-\n/g, "") // Remove hyphen followed by newline (split words)
         .replace(/\n/g, " ") // Replace all newlines with spaces
         .replace(/\s+/g, " ") // Collapse multiple spaces into a single space
         .trim(); // Remove leading and trailing whitespace
   }

   /**
    * Function to extract the skill name and description from the cleaned text.
    * Assumes the first sentence or part of the text is the skill name.
    * @param {string} cleanedText - The cleaned skill text.
    * @returns {Object} - An object containing the skillName and description.
    */
   /**
    * Function to extract the skill name and description from the cleaned text.
    * Handles cases where the skill name is followed by a colon or is on a separate line.
    * @param {string} cleanedText - The cleaned skill text.
    * @returns {Object} - An object containing the skillName and description.
    */
   static extractSkillDetails(cleanedText) {
      // Check if the first line contains a colon to separate the name from the description
      const firstLineMatch = cleanedText.match(/^(.*?):\s*(.*)/);

      // Skill name and description variables
      let skillName;
      let description;

      if (firstLineMatch) {
         // If a colon is found, use the part before the colon as the skill name
         skillName = firstLineMatch[1].trim();
         description = firstLineMatch[2].trim();
      } else {
         // If no colon is found, treat the first sentence or line as the skill name
         const sentences = cleanedText.match(/[^.!?]+[.!?]*|^[^\n]+/g) || [];
         skillName = sentences.length > 0 ? sentences[0].trim() : "Unnamed Skill";
         description = cleanedText.replace(skillName, "").trim();
      }

      // Return the skill name and remaining description
      return { skillName, description };
   }


   /**
    * Function to create a skill item in Foundry VTT.
    * @param {string} skillName - The name of the skill.
    * @param {string} ability - The ability abbreviation (e.g., 'str').
    * @param {string} description - The description of the skill.
    */
   static async createSkillItem(skillName, ability, description) {
      // Skill item data structure
      let skillData = {
         name: skillName,
         type: "skill",
         img: "systems/fantastic-depths/assets/img/item/skill.png", // Path to the skill image
         system: {
            ability: ability.toLowerCase(), // Set the ability abbreviation (str, dex, etc.)
            level: 1, // Default skill level
            rollMode: "publicroll", // Default roll mode
            description: `<p>${description}</p>` // Encapsulate description in paragraph tags
         }
      };

      // Create the skill item in Foundry VTT
      await Item.create(skillData);
   }
}
