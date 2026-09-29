import { CharacterActor } from '../actor/CharacterActor.js';
import { MonsterActor } from '../actor/MonsterActor.js';
import { FDVehicleActor } from './FDVehicleActor.js';
import { FDActorBase } from './FDActorBase.js';

const handler = {
   /**
    * @param {any[]} args 
    */
   construct(_actor, args) {
      let result;
      const a =  (args);
      if (a[0]?.type === "monster") {
         result = Reflect.construct(MonsterActor, a);
      } else if (a[0]?.type === "character") {
         result = Reflect.construct(CharacterActor, a);
      } else if (a[0]?.type === "vehicle") {
         result = Reflect.construct(FDVehicleActor, a);
      } else if (a[0]?.type === "prop") {
         result = Reflect.construct(FDActorBase, a);
      }
      return result;
   }
};

export const ActorFactory = new Proxy(FDActorBase, handler);