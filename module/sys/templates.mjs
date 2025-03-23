/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function () {
   await loadTemplates({
      // Chat
      chatSaveHealDamage: 'systems/fantastic-depths/templates/chat/save-heal-dmg.hbs',
      // Actor partials
      abilityScores: 'systems/fantastic-depths/templates/actor/parts/ability-scores.hbs',
      actorHpAc:'systems/fantastic-depths/templates/actor/parts/hp-ac.hbs',
      actorMovement: 'systems/fantastic-depths/templates/actor/parts/movement.hbs',
      actorFlight: 'systems/fantastic-depths/templates/actor/parts/flight.hbs',
      actorItems: 'systems/fantastic-depths/templates/actor/parts/actor-items.hbs',
      actorSpells: 'systems/fantastic-depths/templates/actor/parts/actor-spells.hbs',
      actorSkillTab: 'systems/fantastic-depths/templates/actor/parts/actor-skills.hbs',
      actorEffects: 'systems/fantastic-depths/templates/actor/parts/actor-effects.hbs',
      actorGmOnly: "systems/fantastic-depths/templates/actor/parts/actor-gm-only.hbs",
      actorEquippedWeapons: "systems/fantastic-depths/templates/actor/parts/equipped-weapons.hbs",
      actorSpecialAbilities: 'systems/fantastic-depths/templates/item/parts/item-specialAbilities.hbs',
      actorWeapons: 'systems/fantastic-depths/templates/item/parts/item-weapons.hbs',
      actorSkills: 'systems/fantastic-depths/templates/item/parts/item-skills.hbs',
      actorGearList: 'systems/fantastic-depths/templates/item/parts/item-gear-list.hbs',
      actorArmor: 'systems/fantastic-depths/templates/item/parts/item-armor.hbs',
      actorMasteries: 'systems/fantastic-depths/templates/item/parts/item-masteries.hbs',
      actorTreasure: 'systems/fantastic-depths/templates/item/parts/item-treasure.hbs',
      actorExploration: 'systems/fantastic-depths/templates/item/parts/item-exploration.hbs',
      actorClassAbilities: 'systems/fantastic-depths/templates/item/parts/item-classAbilities.hbs',
      actorSaves: 'systems/fantastic-depths/templates/item/parts/item-saves.hbs',
      // Monster
      monsterSkills: 'systems/fantastic-depths/templates/actor/parts/monster-skills.hbs',
      monsterAbilities: 'systems/fantastic-depths/templates/actor/parts/monster-abilities.hbs',
      monsterHeader: 'systems/fantastic-depths/templates/actor/parts/monster-header.hbs',
      monsterGmOnly: "systems/fantastic-depths/templates/actor/parts/monster-gm-only.hbs",
      // Character
      characterDesc: 'systems/fantastic-depths/templates/actor/parts/character-desc.hbs',
      characterAbilities: 'systems/fantastic-depths/templates/actor/parts/character-abilities.hbs',
      characterHeader: 'systems/fantastic-depths/templates/actor/parts/character-header.hbs',
      // Item partials
      itemEffects: 'systems/fantastic-depths/templates/item/parts/item-effects.hbs',
      itemContained: 'systems/fantastic-depths/templates/item/parts/item-contained.hbs',
      itemGear: 'systems/fantastic-depths/templates/item/parts/item-gear.hbs',
      itemFlags: 'systems/fantastic-depths/templates/item/parts/item-flags.hbs',
      itemIdentified: 'systems/fantastic-depths/templates/item/parts/item-identified.hbs',
      classLevels: 'systems/fantastic-depths/templates/item/parts/class-levels.hbs',
      classSaves: 'systems/fantastic-depths/templates/item/parts/class-saves.hbs',
      classPrimeReqs: 'systems/fantastic-depths/templates/item/parts/class-primereqs.hbs',
      classSpells: 'systems/fantastic-depths/templates/item/parts/class-spells.hbs',
      classAbilities: 'systems/fantastic-depths/templates/item/parts/class-abilities.hbs',
   });
};