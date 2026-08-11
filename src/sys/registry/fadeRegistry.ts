import { AbilityScoreRetro, AbilityScoreOriginal } from "./AbilityScore.js";
import { ToHitTHAC0, ToHitAAC, ToHitClassic, ToHitDarkDungeons, ToHitHeroic } from "./ToHitSystem.js";
import { MoraleCheck } from "./MoraleCheck.js"
import { ActorMovement } from "./ActorMovement.js"
import { ClassicArmorSystem } from "./ArmorSystem.js";
import { DamageSystem } from "./DamageSystem.js";
import { BasicEncumbrance, ClassicEncumbrance, ExpertEncumbrance } from "./EncSystem.js";
import { IndivInit, GroupInit, AltGroupInit } from "./InitiativeSystem.js";
import { WeaponMasteryHeroic, WeaponMasteryBase } from "./WeaponMastery.js";
import { Wrestling } from "./Wrestling.js";
import { Shove } from "./Shove.js";
import { UserTables } from "./UserTables.js";
import { SingleClassSystem, MultiClassSystem } from "./ClassSystem.js";
import { AncestrySystem } from "./AncestrySystem.js";
import { AbilityCheck, TieredAbilityCheck } from "./AbilityCheck.js";
import { RandomCharacter } from "./random/RandomCharacter.js";

export class fadeRegistry {
   systemDictionary: object;
   constructor() {
      this.systemDictionary = {};
   }

   // TODO: These if/else blocks shouldn't be necessary. Registry should know how to handle or move out of registry.
   registerDefaultSystems() {
      // UserTables first, because others may rely on a user table.
      if (this.hasSystem("userTables") === false) {
         const userTables = new UserTables();
         userTables.Init();
         this.registerSystem("userTables", userTables, UserTables);
      }

      if (this.hasSystem("abilityScore") === false) {
         const abilityScoreMods = game.settings.get(game.system.id, "abilityScoreMods");
         if (abilityScoreMods === "original") {
            this.registerSystem("abilityScore", new AbilityScoreOriginal(), AbilityScoreOriginal);
         } else {
            this.registerSystem("abilityScore", new AbilityScoreRetro(), AbilityScoreRetro);
         }
      }

      if (this.hasSystem("moraleCheck") === false) {
         this.registerSystem("moraleCheck", new MoraleCheck(), MoraleCheck);
      }

      if (this.hasSystem("abilityCheck") === false) {
         const abilityCheckSetting = game.settings.get(game.system.id, "abilityCheck");
         if (abilityCheckSetting === "basic") {
            this.registerSystem("abilityCheck", new AbilityCheck(), AbilityCheck);
         } else if (abilityCheckSetting === "tiered") {
            this.registerSystem("abilityCheck", new TieredAbilityCheck(), TieredAbilityCheck);
         }
      }

      if (this.hasSystem("armorSystem") === false) {
         this.registerSystem("armorSystem", new ClassicArmorSystem(), ClassicArmorSystem);
      }
      if (this.hasSystem("damageSystem") === false) {
         this.registerSystem("damageSystem", new DamageSystem(), DamageSystem);
      }

      // Load weaponMastery before toHitSystem.
      if (this.hasSystem("weaponMastery") === false) {
         const masterySetting = game.settings.get(game.system.id, "weaponMastery");
         if (masterySetting === "classic") {
            this.registerSystem("weaponMastery", new WeaponMasteryBase(), WeaponMasteryBase);
         } else if (masterySetting === "heroic") {
            this.registerSystem("weaponMastery", new WeaponMasteryHeroic(), WeaponMasteryHeroic);
         }
      }

      if (this.hasSystem("toHitSystem") === false) {
         const toHitSystem = game.settings.get(game.system.id, "toHitSystem");
         if (toHitSystem === "thac0") {
            this.registerSystem("toHitSystem", new ToHitTHAC0(), ToHitTHAC0);
         } else if (toHitSystem === "aac") {
            this.registerSystem("toHitSystem", new ToHitAAC(), ToHitAAC);
         } else if (toHitSystem === "classic") {
            this.registerSystem("toHitSystem", new ToHitClassic(), ToHitClassic);
         } else if (toHitSystem === "darkdungeons") {
            this.registerSystem("toHitSystem", new ToHitDarkDungeons(), ToHitDarkDungeons);
         } else if (toHitSystem === "heroic") {
            this.registerSystem("toHitSystem", new ToHitHeroic(), ToHitHeroic);
         }
      }

      if (this.hasSystem("encumbranceSystem") === false) {
         const encSetting = game.settings.get(game.system.id, "encumbrance");
         if (encSetting === "classic") {
            this.registerSystem("encumbranceSystem", new ClassicEncumbrance(null), ClassicEncumbrance);
         } else if (encSetting === "expert") {
            this.registerSystem("encumbranceSystem", new ExpertEncumbrance(null), ExpertEncumbrance);
         } else {
            this.registerSystem("encumbranceSystem", new BasicEncumbrance({ encSetting }), BasicEncumbrance);
         }
      }

      if (this.hasSystem("initiativeSystem") === false) {
         const initiativeMode = game.settings.get(game.system.id, "initiativeMode");
         if (initiativeMode === "group") {
            this.registerSystem("initiativeSystem", new GroupInit(), GroupInit);
         } else if (initiativeMode === "advancedGroup") {
            this.registerSystem("initiativeSystem", new AltGroupInit(), AltGroupInit);
         } else {
            this.registerSystem("initiativeSystem", new IndivInit(), IndivInit);
         }
      }

      if (this.hasSystem("wrestling") === false) {
         this.registerSystem("wrestling", Wrestling, Wrestling);
      }
      if (this.hasSystem("shove") === false) {
         this.registerSystem("shove", Shove, Shove);
      }
      if (this.hasSystem("actorMovement") === false) {
         this.registerSystem("actorMovement", ActorMovement, ActorMovement);
      }
      if (this.hasSystem("ancestrySystem") === false) {
         this.registerSystem("ancestrySystem", new AncestrySystem(), AncestrySystem);
      }

      if (this.hasSystem("classSystem") === false) {
         const classSystem = game.settings.get(game.system.id, "classSystem");
         if (classSystem === "single") {
            this.registerSystem("classSystem", new SingleClassSystem(), SingleClassSystem);
         } else if (classSystem === "advanced") {
            this.registerSystem("classSystem", new MultiClassSystem(), MultiClassSystem);
         }
      }

      this.registerSystem("randomCharacter", RandomCharacter, RandomCharacter);
   }

   registerSystem(id, instance, type) {
      this.systemDictionary[id] = { id, type, instance };
   }

   hasSystem(id) {
      return (this.systemDictionary[id] === null || this.systemDictionary[id] === undefined) == false;
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