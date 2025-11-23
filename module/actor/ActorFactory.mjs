import { FDCombatActor } from '../actor/FDCombatActor.mjs';
import { CharacterActor } from '../actor/CharacterActor.mjs';
import { MonsterActor } from '../actor/MonsterActor.mjs';
import { FDVehicleActor } from './FDVehicleActor.mjs';

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
      }
      return result;
   }
};

export const ActorFactory = new Proxy(FDCombatActor, handler); 