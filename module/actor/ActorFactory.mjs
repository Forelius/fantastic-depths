import { fadeActor } from '../actor/fadeActor.mjs';
import { CharacterActor } from '../actor/CharacterActor.mjs';
import { MonsterActor } from '../actor/MonsterActor.mjs';

const handler = {
   construct(_actor, args) {
      let result;
      if (args[0]?.type === "monster") {
         result = new MonsterActor(...args);
      } else {
         result = new CharacterActor(...args);
      }
      return result;
   }
};

export const ActorFactory = new Proxy(fadeActor, handler);