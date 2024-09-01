import { fadeItem } from '../item/fadeItem.mjs';
import { ArmorItem } from '../item/ArmorItem.mjs';
import { WeaponItem } from '../item/WeaponItem.mjs';

const handler = {
   construct(_item, args) {
      let result = null;
      if (args[0]?.type === 'armor') result = new ArmorItem(...args);
      else if (args[0]?.type === 'weapon') result = new WeaponItem(...args);
      else if (args[0]?.type === 'item') result = new fadeItem(...args);
      else if (args[0]?.type === 'specialAbility') result = new fadeItem(...args);
      else if (args[0]?.type === 'mastery') result = new fadeItem(...args);
      else if (args[0]?.type === 'skill') result = new fadeItem(...args);
      else if (args[0]?.type === 'spell') result = new fadeItem(...args);
      else throw new Error(SYSTEM_ID, { type: args[0]?.type });
      return result;
   }
};

export const ItemFactory = new Proxy(fadeItem, handler);