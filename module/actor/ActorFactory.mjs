import { fadeActor } from '../actor/fadeActor.mjs';
import { CharacterActor } from '../actor/CharacterActor.mjs';
import { MonsterActor } from '../actor/MonsterActor.mjs';

const handler = {
   construct(_actor, args) {
      let result = new CharacterActor(...args);
      if (args[0]?.type === 'monster') result = new MonsterActor(...args);
      return result;
      //throw new Error(SYSTEM_ID, { type: args[0]?.type });
   }
};

export const ActorFactory = new Proxy(fadeActor, handler);