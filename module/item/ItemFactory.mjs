import { fadeItem } from '../item/fadeItem.mjs';
import { ArmorItem } from '../item/ArmorItem.mjs';
import { WeaponItem } from '../item/WeaponItem.mjs';
import { SpecialAbilityItem } from '../item/SpecialAbilityItem.mjs';
import { SkillItem } from '../item/SkillItem.mjs';
import { SpellItem } from '../item/SpellItem.mjs';
import { ActorMasteryItem } from '../item/ActorMasteryItem.mjs';
import { ClassItem } from '../item/ClassItem.mjs';
import { WeaponMasteryItem } from '../item/WeaponMasteryItem.mjs';

const handler = {
   construct(_item, args) {
      let result = null;
      if (args[0]?.type === 'armor') result = new ArmorItem(...args);
      else if (args[0]?.type === 'weapon') result = new WeaponItem(...args);
      else if (args[0]?.type === 'item') result = new fadeItem(...args);
      else if (args[0]?.type === 'specialAbility') result = new SpecialAbilityItem(...args);
      else if (args[0]?.type === 'mastery') result = new ActorMasteryItem(...args);
      else if (args[0]?.type === 'skill') result = new SkillItem(...args);
      else if (args[0]?.type === 'spell') result = new SpellItem(...args);
      else if (args[0]?.type === 'class') result = new ClassItem(...args);
      else if (args[0]?.type === 'weaponMastery') result = new WeaponMasteryItem(...args);
      else throw new Error(SYSTEM_ID, { type: args[0]?.type });
      return result;
   }
};

export const ItemFactory = new Proxy(fadeItem, handler);