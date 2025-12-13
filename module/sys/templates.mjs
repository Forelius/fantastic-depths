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
      rollSaveBtn: 'systems/fantastic-depths/templates/chat/roll-save-btn.hbs',
      // Actor partials
      abilityScores: 'systems/fantastic-depths/templates/actor/parts/ability-scores.hbs',
      actorHpAc:'systems/fantastic-depths/templates/actor/parts/hp-ac.hbs',
      actorMovement: 'systems/fantastic-depths/templates/actor/parts/movement.hbs',
      actorMovement2: 'systems/fantastic-depths/templates/actor/parts/movement2.hbs',
      actorEquippedWeapons: "systems/fantastic-depths/templates/actor/shared/equipped-weapons.hbs",
      siegeWeapons: "systems/fantastic-depths/templates/actor/shared/siege-weapons.hbs",
      attackGroups: "systems/fantastic-depths/templates/actor/parts/attack-groups.hbs",
      actorGroups: 'systems/fantastic-depths/templates/actor/shared/actorGroups.hbs',
      actorSpecialAbilities: 'systems/fantastic-depths/templates/actor/shared/specialAbilities.hbs',
      actorWeapons: 'systems/fantastic-depths/templates/actor/shared/weapons.hbs',
      actorSkills: 'systems/fantastic-depths/templates/actor/shared/skills.hbs',
      actorGearList: 'systems/fantastic-depths/templates/actor/shared/gear-list.hbs',
      actorArmor: 'systems/fantastic-depths/templates/actor/shared/armor.hbs',
      actorAmmo: 'systems/fantastic-depths/templates/actor/shared/ammo.hbs',
      actorMasteries: 'systems/fantastic-depths/templates/actor/shared/masteries.hbs',
      actorTreasure: 'systems/fantastic-depths/templates/actor/shared/treasure.hbs',
      actorExploration: 'systems/fantastic-depths/templates/actor/parts/actor-exploration.hbs',
      actorClassAbilities: 'systems/fantastic-depths/templates/actor/shared/classAbilities.hbs',
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