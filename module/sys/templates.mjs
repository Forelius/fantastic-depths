/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function () {
   return loadTemplates([
      // Actor partials.
      'systems/fantastic-depths/templates/actor/parts/actor-items.hbs',
      'systems/fantastic-depths/templates/actor/parts/actor-spells.hbs',
      'systems/fantastic-depths/templates/actor/parts/actor-skills.hbs',
      'systems/fantastic-depths/templates/actor/parts/actor-effects.hbs',
      'systems/fantastic-depths/templates/actor/parts/monster-abilities.hbs',
      'systems/fantastic-depths/templates/actor/parts/character-abilities.hbs',
      'systems/fantastic-depths/templates/actor/parts/character-desc.hbs',
      'systems/fantastic-depths/templates/actor/parts/character-header.hbs',
      'systems/fantastic-depths/templates/actor/parts/monster-header.hbs',
      "systems/fantastic-depths/templates/actor/parts/actor-gm-only.hbs",
      // Item partials
      'systems/fantastic-depths/templates/item/parts/item-effects.hbs',
      'systems/fantastic-depths/templates/item/parts/item-weapons.hbs',
      'systems/fantastic-depths/templates/item/parts/item-armor.hbs',
      'systems/fantastic-depths/templates/item/parts/item-gear.hbs',
      'systems/fantastic-depths/templates/item/parts/item-treasure.hbs',
      'systems/fantastic-depths/templates/item/parts/item-skills.hbs',
      'systems/fantastic-depths/templates/item/parts/item-masteries.hbs',
      'systems/fantastic-depths/templates/item/parts/item-specialAbilities.hbs',
      'systems/fantastic-depths/templates/item/parts/weapon-attributes.hbs',
      'systems/fantastic-depths/templates/item/parts/item-flags.hbs',
   ]);
};
