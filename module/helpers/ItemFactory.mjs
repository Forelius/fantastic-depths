import { fadeItem } from '../item/item.mjs';
import { ArmorItem } from '../item/ArmorItem.mjs';
import { WeaponItem } from '../item/WeaponItem.mjs';

const handler = {
   construct(_item, args) {
      if (args[0]?.type === 'armor') return new ArmorItem(...args);
      if (args[0]?.type === 'item') return new fadeItem(...args);
      if (args[0]?.type === 'weapon') return new WeaponItem(...args);
      throw new Error(SYSTEM_ID, { type: args[0]?.type });
   },

};

export const ItemFactory = new Proxy(fadeItem, handler);