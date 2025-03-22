/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function () {
   await loadTemplates({
      chatSaveHealDamage: 'systems/fantastic-depths/templates/chat/save-heal-dmg.hbs',
      abilityScores: 'systems/fantastic-depths/templates/actor/parts/ability-scores.hbs',
      characterDesc: 'systems/fantastic-depths/templates/actor/parts/character-desc.hbs',
      actorHpAc:'systems/fantastic-depths/templates/actor/parts/hp-ac.hbs',
      actorMovement: 'systems/fantastic-depths/templates/actor/parts/movement.hbs',
      actorFlight: 'systems/fantastic-depths/templates/actor/parts/flight.hbs',
      actorItems: 'systems/fantastic-depths/templates/actor/parts/actor-items.hbs',
      actorSpells: 'systems/fantastic-depths/templates/actor/parts/actor-spells.hbs',
      actorSkills: 'systems/fantastic-depths/templates/actor/parts/actor-skills.hbs',
      actorEffects: 'systems/fantastic-depths/templates/actor/parts/actor-effects.hbs',
      actorGmOnly: "systems/fantastic-depths/templates/actor/parts/actor-gm-only.hbs",
      actorEquippedWeapons: "systems/fantastic-depths/templates/actor/parts/equipped-weapons.hbs",
      monsterSkills: 'systems/fantastic-depths/templates/actor/parts/monster-skills.hbs',
      monsterAbilities: 'systems/fantastic-depths/templates/actor/parts/monster-abilities.hbs',
      monsterHeader: 'systems/fantastic-depths/templates/actor/parts/monster-header.hbs',
      monsterGmOnly: "systems/fantastic-depths/templates/actor/parts/monster-gm-only.hbs",
      characterAbilities: 'systems/fantastic-depths/templates/actor/parts/character-abilities.hbs',
      characterHeader: 'systems/fantastic-depths/templates/actor/parts/character-header.hbs',
      actorSpecialAbilities: 'systems/fantastic-depths/templates/item/parts/item-specialAbilities.hbs',
      actorWeapons: 'systems/fantastic-depths/templates/item/parts/item-weapons.hbs',
      actorSkills: 'systems/fantastic-depths/templates/item/parts/item-skills.hbs',
      actorGearList: 'systems/fantastic-depths/templates/item/parts/item-gear-list.hbs',
      actorArmor: 'systems/fantastic-depths/templates/item/parts/item-armor.hbs',
      actorMasteries: 'systems/fantastic-depths/templates/item/parts/item-masteries.hbs',
      actorTreasure: 'systems/fantastic-depths/templates/item/parts/item-treasure.hbs',
   });

   return loadTemplates([      
      // Item partials
      'systems/fantastic-depths/templates/item/parts/item-effects.hbs',
      'systems/fantastic-depths/templates/item/parts/item-contained.hbs',
      'systems/fantastic-depths/templates/item/parts/item-gear.hbs',             
      'systems/fantastic-depths/templates/item/parts/weapon-attributes.hbs',
      'systems/fantastic-depths/templates/item/parts/item-flags.hbs',
      'systems/fantastic-depths/templates/item/parts/class-levels.hbs',
      'systems/fantastic-depths/templates/item/parts/class-saves.hbs',
      'systems/fantastic-depths/templates/item/parts/class-primereqs.hbs',
      'systems/fantastic-depths/templates/item/parts/class-spells.hbs',
      'systems/fantastic-depths/templates/item/parts/class-abilities.hbs',
      'systems/fantastic-depths/templates/item/parts/item-classAbilities.hbs',
      'systems/fantastic-depths/templates/item/parts/item-exploration.hbs',
      'systems/fantastic-depths/templates/item/parts/item-saves.hbs',
      'systems/fantastic-depths/templates/item/parts/item-identified.hbs',      
   ]);
};