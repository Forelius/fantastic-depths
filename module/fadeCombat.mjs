// fadeCombat.mjs

// Import any required modules (if necessary)
import { ChatFactory, CHAT_TYPE } from './chat/ChatFactory.mjs';

Hooks.on('renderCombatTracker', renderCombatTracker);

// Hook to reset initiative on new round
Hooks.on('updateCombat', updateCombat);

Hooks.on('createCombat', (combat) => {
   const user = game.users.get(game.userId);  // Get the user who initiated the roll
   const speaker = { alias: user.name };  // Use the player's name as the speaker

   // Send a chat message when combat begins
   ChatMessage.create({
      speaker: speaker,
      content: `Combat encounter created.`,
   });
});

Hooks.on('deleteCombat', (combat) => {
   const user = game.users.get(game.userId);  // Get the user who initiated the roll
   const speaker = { alias: user.name };  // Use the player's name as the speaker

   // Send a chat message when combat ends
   ChatMessage.create({
      speaker: speaker,
      content: `Combat encounter has ended.`,
   });
});

async function updateCombat(combat, updateData, options, userId) {
   // Check if the round has changed
   if (updateData.round) {
      const user = game.users.get(game.userId);  // Get the user who initiated the roll
      const speaker = { alias: user.name };  // Use the player's name as the speaker

      // Check if the combat has just started (round goes from null/undefined to 1)
      if (updateData.round === 1 && (combat.round === null || combat.round === undefined)) {
         // Send a chat message when combat officially begins (round 1)
         ChatMessage.create({
            speaker: speaker,
            content: `Combat has begun!`,
         });
      }

      // Reset initiative for all combatants
      for (let combatant of combat.combatants) {
         await combatant.update({ initiative: null });  // Reset initiative to null
      }

      // Optionally send a chat message to notify players
      ChatMessage.create({
         speaker: speaker,
         content: `Round ${combat.round} started. Initiative rolls reset.`,
      });
   }
}

async function renderCombatTracker(app, html, data) {
   if (data?.combat?.combatants) {
      // Iterate over each combatant and apply a CSS class based on disposition
      data.combat.combatants.forEach(combatant => {
         const disposition = combatant.token.disposition;
         const combatantElement = html.find(`.combatant[data-combatant-id="${combatant.id}"]`);

         if (disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY) {
            combatantElement.addClass('disposition-friendly');
         } else if (disposition === CONST.TOKEN_DISPOSITIONS.NEUTRAL) {
            combatantElement.addClass('disposition-neutral');
         } else if (disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE) {
            combatantElement.addClass('disposition-hostile');
         }
      });
   }
}

// Custom Combat class
export class fadeCombat extends Combat {
   /**
    * override
    * @param {any} ids
    * @param {any} param1
    */
   async rollInitiative(ids, { formula = null, updateTurn = true, messageOptions = {} } = {}) {
      await this.doInitiativeRoll();  // Use the custom initiative function
   }


   // Function to handle group-based initiative
   async rollForGroup(group, groupName) {
      const groupModifier = game.settings.get(game.system.id, "groupInitiativeModifier");
      const initiativeFormula = game.settings.get(game.system.id, "initiativeFormula");
      let rollData = {};
      let result = null;
      let usedMod = 0; // Track the modifier used for this group

      // Apply the group modifier
      if (groupModifier === "none") {
         rollData = { mod: 0 };
         usedMod = 0;
      } else if (groupModifier === "average") {
         // Average Dexterity modifier
         const averageMod = group.reduce((sum, c) => sum + this.getInitiativeMod(c.actor), 0) / group.length;
         usedMod = Math.floor(averageMod);
         rollData = { mod: usedMod };
      } else if (groupModifier === "highest") {
         // Highest Dexterity modifier
         usedMod = Math.max(...group.map(c => this.getInitiativeMod(c.actor)));
         rollData = { mod: usedMod };
      }

      // Perform the roll using the initiative formula
      const roll = new Roll(initiativeFormula, rollData);
      const rolled = await roll.evaluate();

      // Apply the same initiative result to all combatants in the group
      for (let combatant of group) {
         await combatant.update({ initiative: rolled.total });
      }

      // Return the roll result for the digest message, including the used modifier
      if (group.length > 0) {
         let modText = usedMod !== 0 ? ` (mod ${usedMod > 0 ? '+' : ''}${usedMod})` : '';
         result = `${groupName} rolled ${rolled.total}${modText}`;
      }

      return result;
   }

   getInitiativeMod(actor) {
      let result = 0;

      if (actor.type === 'monster') {
         result = actor.system?.initiative?.mod || 0;
      } else {
         result = actor.system?.abilities?.dex?.mod || 0;
      }

      return result;
   }

   /**
 * The custom rollInitiative function
 * @param {any} combat
 */
   async doInitiativeRoll() {
      // Fetch the initiative formula and mode from settings
      const initiativeFormula = game.settings.get(game.system.id, "initiativeFormula");
      const initiativeMode = game.settings.get(game.system.id, "initiativeMode");

      // Get all combatants and group them by disposition
      const combatants = this.combatants;
      const groups = this.groupCombatantsByDisposition(combatants);

      // Array to accumulate roll results for the digest message
      let rollResults = [];

      // Handle group-based initiative by disposition
      if (initiativeMode === "group") {
         // Friendly group (uses modifiers)
         if (groups.friendly.length > 0) {
            let rollResult = await this.rollForGroup(groups.friendly, "Friendlies");
            if (rollResult) rollResults.push(rollResult);
         }

         // Neutral group (uses modifiers)
         if (groups.neutral.length > 0) {
            let rollResult = await this.rollForGroup(groups.neutral, "Neutrals");
            if (rollResult) rollResults.push(rollResult);
         }

         // Hostile group (monsters may not use modifiers)
         if (groups.hostile.length > 0) {
            let rollResult = await this.rollForGroup(groups.hostile, "Hostiles");
            if (rollResult) rollResults.push(rollResult);
         }
      } else {
         // Individual-based initiative
         for (let combatant of combatants) {
            const rollData = combatant.actor.getRollData();
            const mod = this.getInitiativeMod(combatant.actor); // Get the initiative modifier
            rollData.mod = mod;

            // Perform the roll using the initiative formula
            const roll = new Roll(initiativeFormula, rollData);
            const rolled = await roll.evaluate();

            // Update the combatant's initiative with the roll result
            await combatant.update({ initiative: rolled.total });

            // Accumulate the roll result for the digest message, showing mod only if it's not 0
            let modText = mod !== 0 ? ` (mod ${mod > 0 ? '+' : ''}${mod})` : '';
            rollResults.push(`${combatant.name} rolled ${rolled.total}${modText}`);
         }
      }

      // Create a single chat message for all rolls
      if (rollResults.length > 0) {
         // Store the base formula without the mod for flavor text
         const baseFormula = initiativeFormula.replace(/\+?\s*@mod/, '').trim();
         const flavorText = `Initiative Rolls (Base Formula: ${initiativeFormula.replace(/\+?\s*@mod/, '').trim()})`;
         const user = game.users.get(game.userId);  // Get the user who initiated the roll
         const speaker = { alias: user.name };  // Use the player's name as the speaker
         ChatMessage.create({
            speaker: speaker,
            content: rollResults.join('<br>'),  // Combine all roll results into one message with line breaks
            flavor: flavorText
         });
      }
   }



   /**
    * Creates groups based on token disposition.
    * @param {any} combatants
    * @returns
    */
   groupCombatantsByDisposition(combatants) {
      const groups = {
         friendly: [],
         neutral: [],
         hostile: []
      };

      // Iterate over combatants and group them by their token disposition
      for (let combatant of combatants) {
         const disposition = combatant.token.disposition;

         if (disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY) {
            groups.friendly.push(combatant);
         } else if (disposition === CONST.TOKEN_DISPOSITIONS.NEUTRAL) {
            groups.neutral.push(combatant);
         } else if (disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE) {
            groups.hostile.push(combatant);
         }
      }

      return groups;
   }
}
