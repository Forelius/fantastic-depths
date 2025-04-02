import { fadeItem } from '../item/fadeItem.mjs';
import { GearItem } from '../item/GearItem.mjs';
import { ArmorItem } from '../item/ArmorItem.mjs';
import { WeaponItem } from '../item/WeaponItem.mjs';
import { SpecialAbilityItem } from '../item/SpecialAbilityItem.mjs';
import { SkillItem } from '../item/SkillItem.mjs';
import { LightItem } from '../item/LightItem.mjs';
import { SpellItem } from '../item/SpellItem.mjs';
import { ActorMasteryItem } from '../item/ActorMasteryItem.mjs';
import { ClassDefinitionItem } from '../item/ClassDefinitionItem.mjs';
import { MasteryDefinitionItem } from '../item/MasteryDefinitionItem.mjs';
import { ConditionItem } from '../item/ConditionItem.mjs';
import { SpeciesItem } from '../item/SpeciesItem.mjs';

const handler = {
   construct(_item, args) {
      let result = null;
      if (args[0]?.type === 'armor') result = new ArmorItem(...args);
      else if (args[0]?.type === 'weapon') result = new WeaponItem(...args);
      else if (args[0]?.type === 'item') result = new GearItem(...args);
      else if (args[0]?.type === 'treasure') result = new GearItem(...args);
      else if (args[0]?.type === 'specialAbility') result = new SpecialAbilityItem(...args);
      else if (args[0]?.type === 'mastery') result = new ActorMasteryItem(...args);
      else if (args[0]?.type === 'skill') result = new SkillItem(...args);
      else if (args[0]?.type === 'light') result = new LightItem(...args);
      else if (args[0]?.type === 'spell') result = new SpellItem(...args);
      else if (args[0]?.type === 'class') result = new ClassDefinitionItem(...args);
      else if (args[0]?.type === 'weaponMastery') result = new MasteryDefinitionItem(...args);
      else if (args[0]?.type === 'condition') result = new ConditionItem(...args);
      else if (args[0]?.type === 'species') result = new SpeciesItem(...args);
      else throw new Error(`Item constructor error: Type=${args[0]?.type} not defined by ItemFactory.`);
      return result;
   }
};

export const ItemFactory = new Proxy(fadeItem, handler);