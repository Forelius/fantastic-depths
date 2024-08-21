import { fadeActor } from '../documents/actor.mjs';
import { CharacterActor } from '../documents/CharacterActor.mjs';
import { MonsterActor } from '../documents/MonsterActor.mjs';

const handler = {
   construct(_actor, args) {
      if (args[0]?.type === 'actor') return new fadeActor(...args);
      if (args[0]?.type === 'character') return new CharacterActor(...args);
      if (args[0]?.type === 'monster') return new MonsterActor(...args);
      throw new Error(SYSTEM_ID, { type: args[0]?.type });
   },

};

export const ActorFactory = new Proxy(fadeActor, handler);