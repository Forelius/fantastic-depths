/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function () {
   // TODO: Remove after v12 support.
   const fn = foundry?.applications?.handlebars?.loadTemplates ? foundry.applications.handlebars.loadTemplates : loadTemplates;
   await fn({
      // Chat
      chatSaveHealDamage: 'systems/fantastic-depths/templates/chat/save-heal-dmg.hbs',
      // Actor partials
      abilityScores: 'systems/fantastic-depths/templates/actor/parts/ability-scores.hbs',
      actorHpAc:'systems/fantastic-depths/templates/actor/parts/hp-ac.hbs',
      actorMovement: 'systems/fantastic-depths/templates/actor/parts/movement.hbs',
      actorMovement2: 'systems/fantastic-depths/templates/actor/parts/movement2.hbs',
      actorEquippedWeapons: "systems/fantastic-depths/templates/actor/parts/equipped-weapons.hbs",
      attackGroups: "systems/fantastic-depths/templates/actor/parts/attack-groups.hbs",
      actorGroups: 'systems/fantastic-depths/templates/actor/shared/actorGroups.hbs',
      actorSpecialAbilities: 'systems/fantastic-depths/templates/item/parts/item-specialAbilities.hbs',
      actorWeapons: 'systems/fantastic-depths/templates/item/parts/item-weapons.hbs',
      actorSkills: 'systems/fantastic-depths/templates/item/parts/item-skills.hbs',
      actorGearList: 'systems/fantastic-depths/templates/item/parts/item-gear-list.hbs',
      actorArmor: 'systems/fantastic-depths/templates/item/parts/item-armor.hbs',
      actorMasteries: 'systems/fantastic-depths/templates/item/parts/item-masteries.hbs',
      actorTreasure: 'systems/fantastic-depths/templates/item/parts/item-treasure.hbs',
      actorExploration: 'systems/fantastic-depths/templates/actor/parts/actor-exploration.hbs',
      actorClassAbilities: 'systems/fantastic-depths/templates/item/parts/item-classAbilities.hbs',
      actorSaves: 'systems/fantastic-depths/templates/actor/parts/actor-saves.hbs',
      actorHeader: 'systems/fantastic-depths/templates/actor/character/header.hbs',
      // Item partials
      itemEffects: 'systems/fantastic-depths/templates/item/parts/item-effects.hbs',
      itemContained: 'systems/fantastic-depths/templates/item/parts/item-contained.hbs',
      itemGear: 'systems/fantastic-depths/templates/item/parts/item-gear.hbs',
      itemFlags: 'systems/fantastic-depths/templates/item/parts/item-flags.hbs',
      itemIdentified: 'systems/fantastic-depths/templates/item/parts/item-identified.hbs',
      vsGroupMod: 'systems/fantastic-depths/templates/item/shared/vsGroupMod.hbs',
   });
};