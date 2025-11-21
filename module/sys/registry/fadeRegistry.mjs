import { AbilityScoreRetro, AbilityScoreOriginal } from './AbilityScore.mjs';
import { ToHitTHAC0, ToHitAAC, ToHitClassic, ToHitDarkDungeons, ToHitHeroic } from './ToHitSystem.mjs';
import { MoraleCheck, ActorMovement } from './DefaultSystem.mjs'
import { ClassicArmorSystem } from './ArmorSystem.mjs';
import { DamageSystem } from './DamageSystem.mjs';
import { BasicEncumbrance, ClassicEncumbrance, ExpertEncumbrance } from './EncSystem.mjs';
import { IndivInit, GroupInit, AltGroupInit } from './InitiativeSystem.mjs';
import { WeaponMasteryHeroic, WeaponMasteryBase } from './WeaponMastery.mjs';
import { Wrestling } from "./Wrestling.mjs";
import { Shove } from "./Shove.mjs";
import { UserTables } from "./UserTables.mjs";
import { SingleClassSystem, MultiClassSystem } from "./ClassSystem.mjs";
import { AbilityCheck, TieredAbilityCheck } from "./AbilityCheck.mjs";
import { RandomCharacter } from './random/RandomCharacter.mjs';

export class fadeRegistry {
   constructor() {
      this.systemDictionary = {};
      this.eventDictionary = {};
   }

   // TODO: These if/else blocks shouldn't be necessary. Registry should know how to handle or move out of registry.
   async registerDefaultSystems() {
      // UserTables first, because others may rely on a user table.
      this.registerSystem('userTables', new UserTables(), UserTables);

      const abilityScoreMods = game.settings.get(game.system.id, "abilityScoreMods");
      if (abilityScoreMods === "original") {
         this.registerSystem("abilityScore", new AbilityScoreOriginal(), AbilityScoreOriginal);
      } else {
         this.registerSystem("abilityScore", new AbilityScoreRetro(), AbilityScoreRetro);
      }

      this.registerSystem('moraleCheck', new MoraleCheck(), MoraleCheck);

      const abilityCheckSetting = game.settings.get(game.system.id, "abilityCheck");
      if (abilityCheckSetting === "basic") {
         this.registerSystem('abilityCheck', new AbilityCheck(), AbilityCheck);
      } else if (abilityCheckSetting === "tiered") {
         this.registerSystem('abilityCheck', new TieredAbilityCheck(), TieredAbilityCheck);
      }
      this.registerSystem('armorSystem', new ClassicArmorSystem(), ClassicArmorSystem);
      this.registerSystem('damageSystem', new DamageSystem(), DamageSystem);

      // Load weaponMastery before toHitSystem.
      const masterySetting = game.settings.get(game.system.id, "weaponMastery");
      if (masterySetting === "classic") {
         this.registerSystem('weaponMastery', new WeaponMasteryBase(), WeaponMasteryBase);
      } else if (masterySetting === "heroic") {
         this.registerSystem('weaponMastery', new WeaponMasteryHeroic(), WeaponMasteryHeroic);
      }

      const toHitSystem = game.settings.get(game.system.id, "toHitSystem");
      if (toHitSystem === 'thac0') {
         this.registerSystem('toHitSystem', new ToHitTHAC0(), ToHitTHAC0);
      } else if (toHitSystem === 'aac') {
         this.registerSystem('toHitSystem', new ToHitAAC(), ToHitAAC);
      } else if (toHitSystem === 'classic') {
         this.registerSystem('toHitSystem', new ToHitClassic(), ToHitClassic);
      } else if (toHitSystem === 'darkdungeons') {
         this.registerSystem('toHitSystem', new ToHitDarkDungeons(), ToHitDarkDungeons);
      } else if (toHitSystem === 'heroic') {
         this.registerSystem('toHitSystem', new ToHitHeroic(), ToHitHeroic);
      }

      const encSetting = game.settings.get(game.system.id, "encumbrance");
      if (encSetting === 'classic') {
         this.registerSystem('encumbranceSystem', new ClassicEncumbrance(), ClassicEncumbrance);
      } else if (encSetting === 'expert') {
         this.registerSystem('encumbranceSystem', new ExpertEncumbrance(), ExpertEncumbrance);
      } else {
         this.registerSystem('encumbranceSystem', new BasicEncumbrance({ encSetting }), BasicEncumbrance);
      }

      const initiativeMode = game.settings.get(game.system.id, "initiativeMode");
      if (initiativeMode === 'group') {
         this.registerSystem('initiativeSystem', new GroupInit(), GroupInit);
      } else if (initiativeMode === "advancedGroup") {
         this.registerSystem('initiativeSystem', new AltGroupInit(), AltGroupInit);
      } else {
         this.registerSystem('initiativeSystem', new IndivInit(), IndivInit);
      }

      this.registerSystem('wrestling', Wrestling, Wrestling);
      this.registerSystem('shove', Shove, Shove);
      this.registerSystem('actorMovement', ActorMovement, ActorMovement);

      const classSystem = game.settings.get(game.system.id, "classSystem");
      if (classSystem === "single") {
         this.registerSystem('classSystem', new SingleClassSystem(), SingleClassSystem);
      } else if (classSystem === "advanced") {
         this.registerSystem('classSystem', new MultiClassSystem(), MultiClassSystem);
      }

      this.registerSystem('randomCharacter', RandomCharacter, RandomCharacter);
   }

   registerSystem(id, instance, type) {
      this.systemDictionary[id] = { id, type, instance };
   }

   getSystem(id, getAsObject = false) {
      if (getAsObject) {
         return this.systemDictionary[id];
      } else {
         return this.systemDictionary[id]?.instance;
      }
   }

   getSystemType(id) {
      return this.systemDictionary[id]?.type;
   }
}