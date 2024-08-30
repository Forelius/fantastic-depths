import { fadeActor } from '../actor/actor.mjs';
import { CharacterActor } from '../actor/CharacterActor.mjs';
import { MonsterActor } from '../actor/MonsterActor.mjs';

const handler = {
   construct(_actor, args) {
      if (args[0]?.type === 'npc') return new CharacterActor(...args);
      if (args[0]?.type === 'character') return new CharacterActor(...args);
      if (args[0]?.type === 'monster') return new MonsterActor(...args);
      throw new Error(SYSTEM_ID, { type: args[0]?.type });
   },

};

export const ActorFactory = new Proxy(fadeActor, handler);