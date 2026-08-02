/**
 * Check if a target actor meets the criteria for a special VS Group rule.
 * @param {any} actor - The target actor
 * @param {string} rule - The rule to check
 * @param {any} modData - The VS Group modifier data for the group
 * @returns {boolean} - Whether the actor meets the rule criteria
 */
function checkVsGroupRule(actor, rule, modData) {
   let result = false;
   switch (rule) {
      case "enchanted":
         // Check if actor is enchanted
         result = actor.system.isEnchanted === true;
         break;
      case "spellcaster":
         // Check if actor can cast spells (has spell levels > 0)
         result = actor.system.config?.maxSpellLevel > 0;
         break;
      case "equippedWeapon":
         // Check if actor has any equipped weapons
         result = actor.items.some(item => item.type === "weapon" && item.system.equipped === true && item.system.natural === false);
         break;
      case "alignment":
         // Check if actor alignment matches
         result = actor.system.details.alignment == modData.special;
         break;
      case "name":
         // Check if actor name starts with...
         result = actor.name.startsWith(modData.special);
         break;
      default:
         console.warn(`Unknown special rule: ${rule}`);
         break;
   }
   return result;
}

/**
 * Calculate a VS Group modifier total of one field type that an item grants against a target actor.
 * Shared by the to-hit and damage systems.
 * @param {any} targetActor - The target actor
 * @param {Item} modItem - The weapon/ammo item with VS Group modifiers
 * @param {"toHit" | "dmg"} field - The modifier field to total
 * @returns {{mod: number, digest: string[]} | null} - The modifier total and digest lines, or null.
 */
export function getVsGroupMod(targetActor, modItem, field) {
   if (!targetActor || !modItem?.system?.mod?.vsGroup) {
      return null;
   }

   const vsGroupMods = modItem.system.mod.vsGroup;
   let totalMod = 0;
   const digest = [];

   // Check each VS Group modifier on the item
   for (const [groupId, modData] of Object.entries(vsGroupMods) as [string, Record<string, number>][]) {
      // Find the group definition in CONFIG.FADE.ActorGroups
      const groupDef = CONFIG.FADE.ActorGroups.find(g => g.id === groupId);

      // Check if group applies: start with group membership, then check special rule if needed
      const isMember = targetActor.isInGroup(groupId);
      const groupApplies = isMember || (groupDef?.rule && checkVsGroupRule(targetActor, groupDef.rule, modData));

      if (groupApplies) {
         const mod = modData[field] || 0;
         totalMod += mod;
         if (mod) {
            digest.push(game.i18n.format('FADE.Chat.rollMods.vsGroupMod', { group: groupId, mod: mod }));
         }
      }
   }

   return { mod: Number(totalMod), digest };
}

/**
 * Calculate the ancestry VS Group modifier total of one field type granted to the attacker.
 * Uses the attacker's embedded species item as the modifier source.
 * @param {any} attackerActor - The attacking actor
 * @param {any} targetActor - The target actor
 * @param {"toHit" | "dmg"} field - The modifier field to total
 * @returns {{mod: number, digest: string[]} | null} - The modifier total and digest lines, or null.
 */
export function getAncestryVsGroupMod(attackerActor, targetActor, field) {
   const speciesItem = attackerActor?.items?.find(item => item.type === "species");
   if (!speciesItem) {
      return null;
   }
   return getVsGroupMod(targetActor, speciesItem, field);
}
